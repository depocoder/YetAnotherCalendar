import uuid
import asyncio

from redis.asyncio import Redis
from fastapi import HTTPException
from starlette import status

import logging
logger = logging.getLogger(__name__)

LINK_KEY_PREFIX: str = "mtslink"


def _key(lesson_id: uuid.UUID) -> str:
    return f"{LINK_KEY_PREFIX}:{lesson_id}"


async def save_link(redis: Redis, lesson_id: uuid.UUID, url: str) -> None:
    async with asyncio.timeout(2):
        key = _key(lesson_id)
        await redis.set(key, url)
        logger.info("MTS link saved: %s → %s", key, url)


async def get_link(redis: Redis, lesson_id: uuid.UUID) -> str:
    async with asyncio.timeout(2):
        url: str | None = (await redis.get(_key(lesson_id))).decode()
    if not url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="URL for this lesson is not found")
    return url
