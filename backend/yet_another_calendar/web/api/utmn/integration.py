"""UTMN API implementation."""
import asyncio
import time
from typing import cast

import httpx
import reretry
from bs4 import BeautifulSoup
from httpx import AsyncClient
from fastapi_cache.decorator import cache
from loguru import logger
from pydantic import TypeAdapter

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.utmn import schema


@reretry.retry(exceptions=httpx.TransportError, tries=settings.retry_tries, delay=settings.retry_delay)
async def get_teachers_by_page(timeout: int = 30, page: int = 1) -> dict[str, schema.Teacher]:
    """
    Fetch teacher information from UTMN website.

    Returns:
        Dict[str, Teacher]: Dictionary where keys are teacher names (ФИО)
        and values are Teacher objects with avatar_profile and profile_url.
    """
    async with AsyncClient(http2=True, base_url=settings.utmn_base_url, timeout=timeout) as client:
        response = await client.get(settings.utmn_get_teachers_part.format(page=page))
        response.raise_for_status()

    soup = BeautifulSoup(response.text, 'html.parser')
    employees = soup.select('div.item-employer')

    teachers = {}

    for employee in employees:
        # The name is the link in the description: once inside <h4>, now inside
        # <b> - reading the link itself survives such markup changes.
        img_element = employee.select_one('div.b-employer-photo img')
        link_element = employee.select_one('div.b-employer-desc a')

        if not img_element or not link_element or not link_element.text.strip():
            continue

        name = link_element.text.strip()
        avatar = settings.utmn_base_url + str(img_element['src'])
        url = settings.utmn_base_url + str(link_element['href'])
        teachers[name] = schema.Teacher(
            avatar_profile=avatar,
            profile_url=url,
        )

    return teachers

# A new namespace drops the empty teacher list cached for a month while the
# markup change went unnoticed.
@cache(expire=settings.redis_utmn_teachers_time_live, namespace="utmn_teachers")
async def get_all_teachers_cached(timeout: int = 30, per_page: int = 5) -> dict[str, schema.Teacher]:
    """
    Fetch teacher information from UTMN website.

    Nothing found is an error, not a result: the site always lists
    employees, so an empty list means the markup changed - and caching it
    would hide the avatars for a month.
    """
    teachers = {}
    page = 1
    while True:
        tasks = []
        teachers_from_tasks = {}
        async with asyncio.TaskGroup() as tg:
            for i in range(page, page + per_page):
                tasks.append(tg.create_task(get_teachers_by_page(timeout, i)))

        page += per_page
        for task in tasks:
            teachers_from_tasks.update(task.result())

        if len(teachers_from_tasks) == 0:
            break
        teachers.update(teachers_from_tasks)
    if not teachers:
        raise RuntimeError("UTMN employees pages parsed to nothing, has the markup changed?")
    return teachers


# After a failure the site is not asked again for a while: teachers are read
# for every calendar request, and a broken page must not cost each of them.
_TEACHERS_RETRY_AFTER = 60 * 60
_teachers_failed_at: float | None = None
# Reading the whole directory (~140 pages) takes a while. One shared task
# reads it, so calendar requests arriving together with an empty cache (every
# deploy) don't each crawl the site; a request waits for it only this long
# and otherwise goes without photos - the next one gets them from the cache.
_TEACHERS_WAIT = 3
_teachers_task: asyncio.Task[dict[str, schema.Teacher]] | None = None


async def _read_teachers(timeout: int, per_page: int) -> dict[str, schema.Teacher]:
    # @cache types its result as possibly a Response; here it is always the dict.
    return cast(dict[str, schema.Teacher], await get_all_teachers_cached(timeout, per_page))


def _remember_teachers_failure(task: asyncio.Task[dict[str, schema.Teacher]]) -> None:
    global _teachers_failed_at  # noqa: PLW0603
    if task.cancelled():
        return
    if (exception := task.exception()) is not None:
        _teachers_failed_at = time.monotonic()
        logger.opt(exception=exception).error(f"Error in get_all_teachers: {exception}")

async def get_all_teachers(timeout: int = 30, per_page: int = 5) -> dict[str, schema.Teacher]:
    """
    Fetch teacher information from UTMN website.
    """
    global _teachers_failed_at, _teachers_task  # noqa: PLW0603
    if _teachers_failed_at is not None and time.monotonic() - _teachers_failed_at < _TEACHERS_RETRY_AFTER:
        return {}
    if _teachers_task is None or _teachers_task.done():
        _teachers_task = asyncio.create_task(_read_teachers(timeout, per_page))
        _teachers_task.add_done_callback(_remember_teachers_failure)
    try:
        teachers = await asyncio.wait_for(asyncio.shield(_teachers_task), timeout=_TEACHERS_WAIT)
    except TimeoutError:
        logger.info("UTMN teachers are still being read, this calendar goes without their photos")
        return {}
    except Exception:
        return {}  # logged by _remember_teachers_failure
    _teachers_failed_at = None
    return TypeAdapter(dict[str, schema.Teacher]).validate_python(teachers)
