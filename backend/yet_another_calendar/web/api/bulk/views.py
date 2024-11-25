"""
Modeus API implemented using a controller.
"""
from typing import Annotated

from fastapi import APIRouter
from fastapi.params import Depends
from starlette.responses import StreamingResponse

from yet_another_calendar.settings import settings
from ..modeus import schema as modeus_schema
from ..lms import schema as lms_schema
from ..netology import schema as netology_schema
from . import integration, schema

router = APIRouter()


@router.post("/events/")
async def get_calendar(
        body: modeus_schema.ModeusEventsBody,
        lms_user: lms_schema.User,
        cookies: Annotated[netology_schema.NetologyCookies, Depends(netology_schema.get_cookies_from_headers)],
        calendar_id: int = settings.netology_default_course_id,
        time_zone: str = "Europe/Moscow",
) -> schema.CalendarResponse:
    """
    Get events from Netology and Modeus, cached.
    """
    time_zone: str = "Europe/Moscow"  # todo fix after frontend
    cached_calendar = await integration.get_cached_calendar(body, lms_user, calendar_id, cookies)
    if isinstance(cached_calendar, schema.CalendarResponse):
        return cached_calendar.change_timezone(time_zone)
    # else cached
    return schema.CalendarResponse.model_validate(cached_calendar).change_timezone(time_zone)


@router.post("/refresh_events/")
async def refresh_calendar(
        body: modeus_schema.ModeusEventsBody,
        lms_user: lms_schema.User,
        cookies: Annotated[netology_schema.NetologyCookies, Depends(netology_schema.get_cookies_from_headers)],
        jwt_token: Annotated[str, Depends(modeus_schema.get_cookies_from_headers)],
        calendar_id: int = settings.netology_default_course_id,
        time_zone: str = "Europe/Moscow",
) -> schema.RefreshedCalendarResponse:
    """
    Refresh events in redis.
    """
    time_zone: str = "Europe/Moscow"  # todo fix after frontend
    return await integration.refresh_events(body, lms_user, jwt_token, calendar_id, cookies, time_zone)


@router.post("/export_ics/")
async def export_ics(
        body: modeus_schema.ModeusEventsBody,
        lms_user: lms_schema.User,
        cookies: Annotated[netology_schema.NetologyCookies, Depends(netology_schema.get_cookies_from_headers)],
        jwt_token: Annotated[str, Depends(modeus_schema.get_cookies_from_headers)],
        calendar_id: int = settings.netology_default_course_id,
        time_zone: str = "Europe/Moscow",
) -> StreamingResponse:
    """
    Export into .ics format
    """
    time_zone: str = "Europe/Moscow"  # todo fix after frontend
    calendar = await integration.get_calendar(body, lms_user, jwt_token, calendar_id, cookies)
    calendar_with_timezone = calendar.change_timezone(time_zone)
    return StreamingResponse(integration.export_to_ics(calendar_with_timezone))
