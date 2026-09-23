import datetime
import uuid
from collections import Counter
from typing import Any

from fastapi import HTTPException
from redis.asyncio import ConnectionPool, Redis
from starlette import status
from loguru import logger

from yet_another_calendar.settings import settings
from .schema import MtsRedirectMetrics, RedirectWindow

LINK_KEY_PREFIX: str = "mtslink"
COURSE_KEY_PREFIX: str = "mtscourse"
# Window name -> length in days. Reported side by side in the tutor panel.
REDIRECT_WINDOWS: dict[str, int] = {"week": 7, "month": 30}
_TOTAL_FIELD = "total"
_COURSE_PREFIX = "course:"


def _key(lesson_id: uuid.UUID) -> str:
    return f"{LINK_KEY_PREFIX}:{lesson_id}"


def _course_key(lesson_id: uuid.UUID) -> str:
    return f"{COURSE_KEY_PREFIX}:{lesson_id}"


def _now() -> datetime.datetime:
    return datetime.datetime.now(tz=datetime.UTC)


def _redirect_key(day: datetime.date) -> str:
    return f"{settings.redis_redirect_metrix_prefix}:{day.isoformat()}"


async def save_link(
    redis_pool: ConnectionPool, lesson_id: uuid.UUID, url: str, course: str | None = None,
) -> None:
    async with Redis(connection_pool=redis_pool) as redis:
        key = _key(lesson_id)
        await redis.set(name=key, value=url, ex=settings.redis_events_time_live)
        if course:
            # Remembered next to the link so a follow-through can be counted
            # per course later: the redirect itself only knows the lesson id.
            await redis.set(name=_course_key(lesson_id), value=course, ex=settings.redis_events_time_live)
        logger.info("MTS link saved: %s → %s", key, url)


async def get_link(redis_pool: ConnectionPool, lesson_id: uuid.UUID) -> str:
    async with Redis(connection_pool=redis_pool) as redis:
        url = (await redis.get(_key(lesson_id)))
    if not url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="URL for this lesson is not found")
    return url.decode()


async def get_course(redis_pool: ConnectionPool, lesson_id: uuid.UUID) -> str | None:
    """The course a lesson belongs to, if it was known when the link was saved."""
    async with Redis(connection_pool=redis_pool) as redis:
        course = await redis.get(_course_key(lesson_id))
    return course.decode() if course else None


async def get_links(redis_pool: ConnectionPool, lesson_ids: list[uuid.UUID]) -> dict[str, str]:
    """Get URLs for multiple lesson IDs from Redis."""
    async with Redis(connection_pool=redis_pool) as redis:
        keys = [_key(lesson_id) for lesson_id in lesson_ids]
        urls = await redis.mget(keys)

        result = {}
        for lesson_id, url in zip(lesson_ids, urls, strict=False):
            if url:
                result[str(lesson_id)] = url.decode()

        return result


async def count_redirect(
    redis_pool: ConnectionPool, lesson_id: uuid.UUID, now: datetime.datetime | None = None,
) -> None:
    """
    Count one follow-through of a link left on a lesson.

    Only counters are kept - one per day, plus one per day and course - so
    the metric is anonymous by construction: nothing about who followed the
    link is stored, and repeated follow-throughs by the same person all count.

    Never raises - a statistic must not cost anyone their webinar.
    """
    key = _redirect_key((now or _now()).date())
    try:
        course = await get_course(redis_pool, lesson_id)
        async with Redis(connection_pool=redis_pool) as redis, redis.pipeline(transaction=False) as pipe:
            pipe.hincrby(key, _TOTAL_FIELD, 1)
            if course:
                pipe.hincrby(key, f"{_COURSE_PREFIX}{course}", 1)
            pipe.expire(key, settings.redis_redirect_metrix_live)
            await pipe.execute()
    except Exception:
        logger.exception("Can't count a redirect to a webinar")


def _decode_bucket(raw: dict[Any, Any]) -> dict[str, int]:
    decoded: dict[str, int] = {}
    for field, value in raw.items():
        name = field.decode() if isinstance(field, bytes) else str(field)
        try:
            decoded[name] = int(value)
        except (TypeError, ValueError):
            continue
    return decoded


def _window(buckets: list[dict[str, int]]) -> RedirectWindow:
    courses: Counter[str] = Counter()
    for bucket in buckets:
        for field, count in bucket.items():
            if field.startswith(_COURSE_PREFIX):
                courses[field.removeprefix(_COURSE_PREFIX)] += count
    return RedirectWindow(
        redirects=sum(bucket.get(_TOTAL_FIELD, 0) for bucket in buckets),
        courses=dict(courses.most_common()),
    )


async def count_redirects(
    redis_pool: ConnectionPool, now: datetime.datetime | None = None,
) -> MtsRedirectMetrics:
    """How often the links were followed over each of the REDIRECT_WINDOWS."""
    today = (now or _now()).date()
    longest = max(REDIRECT_WINDOWS.values())
    # Newest first, so a window is simply the head of the list.
    days = [today - datetime.timedelta(days=offset) for offset in range(longest)]
    async with Redis(connection_pool=redis_pool) as redis, redis.pipeline(transaction=False) as pipe:
        for day in days:
            pipe.hgetall(_redirect_key(day))
        raw_buckets = await pipe.execute()
    buckets = [_decode_bucket(raw) for raw in raw_buckets]
    return MtsRedirectMetrics(
        week=_window(buckets[:REDIRECT_WINDOWS["week"]]),
        month=_window(buckets[:REDIRECT_WINDOWS["month"]]),
    )
