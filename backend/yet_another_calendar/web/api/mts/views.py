import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from redis.asyncio import Redis

from . import integration
from .schema import MtsLinkBody
from ...lifespan import get_redis

router = APIRouter()

@router.post("/link", summary='save link to webinar')
async def add_link(
    body: MtsLinkBody,
    redis: Annotated[Redis, Depends(get_redis)],
) -> JSONResponse:
    await integration.save_link(redis, body.lesson_id, str(body.url))
    return JSONResponse(content={"status": "ok"})


@router.get("/{lesson_id}", summary='redirect to webinar')
async def redirect_to_mts(
    lesson_id: uuid.UUID,
    redis: Annotated[Redis, Depends(get_redis)],
) -> RedirectResponse:
    url = await integration.get_link(redis, lesson_id)
    return RedirectResponse(url)