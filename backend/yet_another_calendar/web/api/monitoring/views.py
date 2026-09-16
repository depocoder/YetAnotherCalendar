from typing import Annotated

from fastapi import APIRouter, Depends
from redis.asyncio import ConnectionPool

from .. import upstream_health
from ...lifespan import get_redis_pool

router = APIRouter()


@router.get("/health")
def health_check() -> None:
    """
    Checks the health of a project.

    It returns 200 if the project is healthy.
    """


@router.get("/health/services/")
async def services_health(
        redis_pool: Annotated[ConnectionPool, Depends(get_redis_pool)],
) -> upstream_health.ServicesHealth:
    """
    Health of the upstream services (Netology, Modeus, LMS).

    Aggregated from the calls made while building calendars: successful
    and failed calls per service for the last 15 minutes, hour and day.
    Anonymous by construction - only counters are ever stored.
    """
    return await upstream_health.get_summary(redis_pool)
