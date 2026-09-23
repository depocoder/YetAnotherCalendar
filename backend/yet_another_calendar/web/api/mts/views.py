import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
from redis.asyncio import ConnectionPool

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.auth.utils import verify_tutor_token
from . import integration
from .schema import MtsLinkBody, MtsLinkRequest, MtsLinkResponse, MtsRedirectMetrics
from ...lifespan import get_redis_pool

router = APIRouter()


@router.post("/link", summary='save link to webinar')
async def add_link(
        body: MtsLinkBody,
        redis: ConnectionPool = Depends(get_redis_pool),
) -> JSONResponse:
    await integration.save_link(redis, body.lesson_id, str(body.url), body.course)
    return JSONResponse(content={"status": "ok"})


@router.post("/links", summary='get links for multiple lesson IDs')
async def get_multiple_links(
        body: MtsLinkRequest,
        redis: ConnectionPool = Depends(get_redis_pool),
) -> MtsLinkResponse:
    links = await integration.get_links(redis, body.lesson_ids)
    return MtsLinkResponse(links=links)


@router.get("/metrics/", summary='how often the links were followed')
async def get_redirect_metrics(
        redis: Annotated[ConnectionPool, Depends(get_redis_pool)],
        _: Annotated[None, Depends(verify_tutor_token)],
) -> MtsRedirectMetrics:
    """
    How often the links left on the lessons were followed.

    Counted per day in Redis and summed over the last week and month, with
    a breakdown by course. Anonymous by construction - only counters are
    ever stored, so the numbers are follow-throughs and not unique people.
    """
    return await integration.count_redirects(redis)


# Declared after /metrics/: the path below swallows any single segment.
@router.get("/{lesson_id}", summary='redirect to webinar')
async def redirect_to_mts(
        lesson_id: uuid.UUID,
        background_tasks: BackgroundTasks,
        redis: ConnectionPool = Depends(get_redis_pool),
) -> RedirectResponse:
    try:
        url = await integration.get_link(redis, lesson_id)
    except HTTPException:
        # Редирект на 404 страницу фронтенда вместо HTTP 404
        return RedirectResponse(f"{settings.app_domain}/404")
    # Only a link that exists is a link somebody followed.
    background_tasks.add_task(integration.count_redirect, redis, lesson_id)
    return RedirectResponse(url)
