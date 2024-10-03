from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis.asyncio import Redis

from yet_another_calendar.settings import settings

@asynccontextmanager
async def lifespan_setup(
    app: FastAPI,
) -> AsyncGenerator[None, None]:  # pragma: no cover
    """
    Actions to run on application startup.

    This function uses fastAPI app to store data
    in the state, such as db_engine.

    :param app: the fastAPI application.
    :return: function that actually performs actions.
    """
    redis = await Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        encoding='utf-8',
    )
    FastAPICache.init(RedisBackend(redis), prefix=settings.redis_prefix)

    try:
        yield
    finally:
        await redis.close()

