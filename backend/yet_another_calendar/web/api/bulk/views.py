"""
Modeus API implemented using a controller.
"""
from typing import Annotated

from fastapi import APIRouter, Header
from fastapi.params import Depends
from starlette.responses import StreamingResponse

from yet_another_calendar.settings import settings
from . import integration, schema
from ..lms import schema as lms_schema
from ..modeus import schema as modeus_schema
from ..modeus import integration as modeus_integration
from ..netology import schema as netology_schema

router = APIRouter()


@router.get("/events/")
async def get_calendar(
        body: Annotated[modeus_schema.ModeusTimeBody, Depends(modeus_schema.get_time_from_query)],
        lms_user: Annotated[lms_schema.User, Depends(lms_schema.get_user)],
        cookies: Annotated[netology_schema.NetologyCookies, Depends(netology_schema.get_cookies_from_headers)],
        donor_token: Annotated[str, Depends(modeus_integration.get_donor_token)],
        modeus_person_id: Annotated[str, Header()],
        calendar_id: int = settings.netology_default_course_id,
        time_zone: str = "Europe/Moscow",
) -> schema.CalendarResponse:
    """
    Get events from Netology and Modeus, cached.
    """
    cached_calendar = await integration.get_cached_calendar(
        body, calendar_id, modeus_person_id,
        cookies=cookies, lms_user=lms_user, modeus_jwt_token=donor_token,
    )
    if isinstance(cached_calendar, schema.CalendarResponse):
        return cached_calendar.change_timezone(time_zone)
    # else cached
    return schema.CalendarResponse.model_validate(cached_calendar).change_timezone(time_zone)


@router.get("/refresh_events/")
async def refresh_calendar(
        body: Annotated[modeus_schema.ModeusTimeBody, Depends(modeus_schema.get_time_from_query)],
        lms_user: Annotated[lms_schema.User, Depends(lms_schema.get_user)],
        cookies: Annotated[netology_schema.NetologyCookies, Depends(netology_schema.get_cookies_from_headers)],
        donor_token: Annotated[str, Depends(modeus_integration.get_donor_token)],
        modeus_person_id: Annotated[str, Header()],        calendar_id: int = settings.netology_default_course_id,
        time_zone: str = "Europe/Moscow",
) -> schema.RefreshedCalendarResponse:
    """
    Refresh events in redis.
    """
    return await integration.refresh_events(
        body, lms_user, calendar_id, cookies, time_zone, donor_token, modeus_person_id,
    )


@router.get("/export_ics/")
async def export_ics(
        body: Annotated[modeus_schema.ModeusTimeBody, Depends(modeus_schema.get_time_from_query)],
        lms_user: Annotated[lms_schema.User, Depends(lms_schema.get_user)],
        cookies: Annotated[netology_schema.NetologyCookies, Depends(netology_schema.get_cookies_from_headers)],
        donor_token: Annotated[str, Depends(modeus_integration.get_donor_token)],
        modeus_person_id: Annotated[str, Header()],
        calendar_id: int = settings.netology_default_course_id,
        time_zone: str = "Europe/Moscow",

) -> StreamingResponse:
    """
    Export into .ics format
    """
    calendar = await integration.get_calendar(
        body, calendar_id, modeus_person_id,
        modeus_jwt_token=donor_token, lms_user=lms_user, cookies=cookies,
    )
    calendar_with_timezone = calendar.change_timezone(time_zone)
    return StreamingResponse(integration.export_to_ics(calendar_with_timezone))
