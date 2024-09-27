from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from yet_another_calendar.services.redis.lifespan import init_redis, shutdown_redis


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

    app.middleware_stack = None
    init_redis(app)
    app.middleware_stack = app.build_middleware_stack()

    yield
    await shutdown_redis(app)
