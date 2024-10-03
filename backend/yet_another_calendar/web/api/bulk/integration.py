import asyncio
import logging

from fastapi import HTTPException
from fastapi_cache import default_key_builder, FastAPICache
from fastapi_cache.decorator import cache
from starlette import status

from yet_another_calendar.settings import settings
from ..netology import views as netology_views
from ..modeus import views as modeus_views
from ..modeus import schema as modeus_schema
from ..netology import schema as netology_schema
from . import schema

logger = logging.getLogger(__name__)


async def refresh_events(
        body: modeus_schema.ModeusEventsBody,
        jwt_token: str,
        calendar_id: int,
        cookies: netology_schema.NetologyCookies,
) -> schema.RefreshedCalendarResponse:
    """Clear events cache."""
    cached_json = await get_cached_calendar(body, jwt_token, calendar_id, cookies)
    if isinstance(cached_json, dict):
        cached_calendar = schema.CalendarResponse(**cached_json)
    if isinstance(cached_json, schema.CalendarResponse):
        cached_calendar = cached_json
    calendar = await get_calendar(body, jwt_token, calendar_id, cookies)
    changed = cached_calendar.get_hash() != calendar.get_hash()
    try:
        cache_key = default_key_builder(get_cached_calendar, args=(body, jwt_token, calendar_id, cookies), kwargs={})
        coder = FastAPICache.get_coder()
        backend = FastAPICache.get_backend()
        await backend.set(
            key=f"{settings.redis_prefix}:{cache_key}",
            value=coder.encode(calendar),
            expire=settings.redis_events_time_live)
    except Exception as exception:
        logger.error(f"Got redis {exception}")
        raise HTTPException(detail="Can't refresh redis", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR) from None
    return schema.RefreshedCalendarResponse(
        **{**calendar.model_dump(by_alias=True), "changed": changed},
    )

async def get_calendar(
        body: modeus_schema.ModeusEventsBody,
        jwt_token: str,
        calendar_id: int,
        cookies: netology_schema.NetologyCookies,
) -> schema.CalendarResponse:
    async with asyncio.TaskGroup() as tg:
        netology_response = tg.create_task(netology_views.get_calendar(body, calendar_id, cookies))
        modeus_response = tg.create_task(modeus_views.get_calendar(body, jwt_token))
    return schema.CalendarResponse.model_validate(
        {"netology": netology_response.result(), "modeus": modeus_response.result()},
    )


@cache(expire=settings.redis_events_time_live)
async def get_cached_calendar(
        body: modeus_schema.ModeusEventsBody,
        jwt_token: str,
        calendar_id: int,
        cookies: netology_schema.NetologyCookies,
) -> schema.CalendarResponse:
    return await get_calendar(body, jwt_token, calendar_id, cookies)
