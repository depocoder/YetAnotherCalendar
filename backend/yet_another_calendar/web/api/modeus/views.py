"""
Modeus API implemented using a controller.
"""
import datetime
from typing import Annotated

from fastapi import APIRouter, Header
from fastapi.params import Depends

from . import integration
from . import schema

router = APIRouter()


@router.post("/events/")
async def get_calendar(
        body: schema.ModeusTimeBody,
        modeus_jwt_token: Annotated[str, Header()],
        person_id: Annotated[str, Depends(schema.get_cookies_from_headers)],
) -> list[schema.FullEvent]:
    """
    Get events from Modeus.
    """
    full_body = schema.ModeusEventsBody.model_validate(
        {**body.model_dump(by_alias=True), 'attendeePersonId': [person_id]},
    )
    return await integration.get_events(full_body, modeus_jwt_token)


# @router.post("/events/by_date/")
# async def get_calendar_by_date(
#         body: schema.FilteredDayEventsRequest,
#         modeus_jwt_token: Annotated[str, Header()],
#         person_id: Annotated[str, Depends(schema.get_cookies_from_headers)],
# ) -> list[schema.FullEvent]:
#     """
#     Get events from Modeus in a specified day for full group
#     """
#     full_body = schema.ModeusEventsBody.model_validate(
#         {**body.model_dump(by_alias=True), 'attendeePersonId': [person_id]},
#     )
#     return await integration.get_events(full_body, modeus_jwt_token)


@router.post("/events/by_date/")
async def get_calendar_by_date(
        body: schema.FilteredDayEventsRequest,
        modeus_jwt_token: Annotated[str, Header()],
        person_id: Annotated[str, Depends(schema.get_cookies_from_headers)],
) -> list[schema.FullEvent]:
    """
    Get events from Modeus in a specified day for full group
    """
    local_date: datetime.date = body.date.date()
    monday = local_date - datetime.timedelta(days=local_date.weekday())
    sunday = monday + datetime.timedelta(days=6)

    time_min = datetime.datetime.combine(monday,  datetime.time(0, 0), tzinfo=datetime.timezone.utc)
    time_max = datetime.datetime.combine(sunday, datetime.time(23, 59, 59), tzinfo=datetime.timezone.utc)
    
    events_filter: dict[str] = {}
    if body.specialty_code:
        events_filter["specialtyCode"] = body.specialty_code
    if body.learning_start_year:
        events_filter["learningStartYear"] = body.learning_start_year
    if body.profile_name:
        events_filter["profileName"] = body.profile_name

    modeus_body = schema._ModeusEventsBodyWithFilter(
        timeMin=time_min,
        timeMax=time_max,
        attendeePersonId=[person_id],
        size=500,
        eventsFilter=events_filter or None,
    )

    weekly_events = await integration.get_events(modeus_body, modeus_jwt_token)

    day_events = [
        e for e in weekly_events
        if e.start_time.astimezone(datetime.timezone.utc).date() == local_date
    ]

    return day_events


@router.post("/auth/")
async def auth(
        creds: schema.Creds,
) -> str:
    """
    Authenticate with credentials in modeus.
    """
    return await integration.login(creds.username, creds.password)
