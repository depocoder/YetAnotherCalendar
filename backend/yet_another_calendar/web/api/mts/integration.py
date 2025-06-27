import logging
import uuid

from fastapi import HTTPException
from redis.asyncio import ConnectionPool, Redis
from starlette import status

from yet_another_calendar.settings import settings

logger = logging.getLogger(__name__)

LINK_KEY_PREFIX: str = "mtslink"


def _key(lesson_id: uuid.UUID) -> str:
    return f"{LINK_KEY_PREFIX}:{lesson_id}"


async def save_link(redis_pool: ConnectionPool, lesson_id: uuid.UUID, url: str) -> None:
    async with Redis(connection_pool=redis_pool) as redis:
        key = _key(lesson_id)
        await redis.set(name=key, value=url, ex=settings.redis_events_time_live)
        logger.info("MTS link saved: %s → %s", key, url)


async def get_link(redis_pool: ConnectionPool, lesson_id: uuid.UUID) -> str:
    async with Redis(connection_pool=redis_pool) as redis:
        url = (await redis.get(_key(lesson_id)))
    if not url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="URL for this lesson is not found")
    return url.decode()
