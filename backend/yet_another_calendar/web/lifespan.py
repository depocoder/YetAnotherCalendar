from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from loguru import logger
from fastapi import FastAPI
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis.asyncio import Redis, ConnectionPool
from starlette.requests import Request
import rollbar
from rollbar.contrib.fastapi import ReporterMiddleware as RollbarMiddleware

from yet_another_calendar.settings import settings


def init_redis(app: FastAPI) -> None:  # pragma: no cover
    """
    Creates connection pool for redis.

    :param app: current fastapi application.
    """
    app.state.redis_pool = ConnectionPool.from_url(
        str(settings.redis_url),
    )


async def shutdown_redis(app: FastAPI) -> None:  # pragma: no cover
    """
    Closes redis connection pool.

    :param app: current FastAPI app.
    """
    await app.state.redis_pool.disconnect()


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
    init_redis(app)
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


async def get_redis_pool(
        request: Request,
) -> AsyncGenerator[Redis, None]:  # pragma: no cover
    """
    Returns connection pool.

    You can use it like this:

    >>> from redis.asyncio import ConnectionPool, Redis
    >>>
    >>> async def handler(redis_pool: ConnectionPool = Depends(get_redis_pool)):
    >>>     async with Redis(connection_pool=redis_pool) as redis:
    >>>         await redis.get('key')

    I use pools, so you don't acquire connection till the end of the handler.

    :param request: current request.
    :returns:  redis connection pool.
    """
    return request.app.state.redis_pool

def init_rollbar(app: FastAPI) -> None:  # pragma: no cover
    """
    Initializes rollbar.

    :param app: current fastapi application.
    """
    rollbar.init(
        settings.rollbar_token,
        environment=settings.rollbar_environment,
        handler='async',
        # Security: Scrub sensitive data from exceptions
        scrub_fields=[
            'password', 'secret', 'token', 'auth', 'authentication',
            'authorization', 'key', 'api_key', 'access_token', 'refresh_token',
            'csrf_token', 'session', 'cookie', 'pin', 'ssn', 'social_security',
            'credit_card', 'card_number', 'cvv', 'cvc', 'account_number',
            # Netology specific fields
            'rails_session', '_netology-on-rails_session', 'username',
            # LMS specific fields
            'lxp_token', 'lxp_id', 'lxp-token', 'lxp-id',
            # Modeus specific fields
            'modeus_jwt_token', 'donor_token', 'modeus-jwt-token', 'donor-token',
            'modeus_person_id', 'modeus-person-id',
            # JWT tokens and user identifiers
            'jwt', 'jwt_token', 'bearer_token', 'bearer',
            'person_id', 'user_id', 'client_id', 'client_secret',
        ],
        locals={
            'enabled': False,  # Don't capture local variables
        },
        )
    app.add_middleware(RollbarMiddleware)
    logger.info(f"Rollbar initialized with environment: {settings.rollbar_environment}")