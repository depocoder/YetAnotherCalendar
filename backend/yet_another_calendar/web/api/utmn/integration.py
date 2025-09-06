"""UTMN API implementation."""
import asyncio

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
        name_element = employee.select_one('div.b-employer-desc h4')
        img_element = employee.select_one('div.b-employer-photo img')
        link_element = employee.select_one('div.b-employer-desc h4 a')
        
        if not name_element or not img_element or not link_element:
            continue
            
        name = name_element.text.strip()
        avatar = "https:" + str(img_element['src'])
        url = settings.utmn_base_url + str(link_element['href'])
        teachers[name] = schema.Teacher(
            avatar_profile=avatar,
            profile_url=url,
        )
                
    return teachers

@cache(expire=settings.redis_utmn_teachers_time_live)
async def get_all_teachers_cached(timeout: int = 30, per_page: int = 5) -> dict[str, schema.Teacher]:
    """
    Fetch teacher information from UTMN website.
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
    return teachers

async def get_all_teachers(timeout: int = 30, per_page: int = 5) -> dict[str, schema.Teacher]:
    """
    Fetch teacher information from UTMN website.
    """
    try:
        teachers = await get_all_teachers_cached(timeout, per_page)
        adapter = TypeAdapter(dict[str, schema.Teacher])
        return adapter.validate_python(teachers)
    except Exception as e:
        logger.exception(f"Error in get_all_teachers: {e}")
        return {}