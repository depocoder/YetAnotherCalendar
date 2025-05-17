"""
Modeus API implemented using a controller.
"""
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


@router.post(
    "/day-events",
    summary="Расписание группы на выбранный день",
    response_description="Сырые события Modeus за указанную дату",
)
async def day_events(
    body: schema.DayEventsRequest,
    modeus_jwt_token: Annotated[str, Header()],
) -> list[schema.FullEvent]:
    """Главный энд-пойнт: возвращает события за день."""
    events = await integration.get_day_events(modeus_jwt_token, body.to_search_payload())
    return events


@router.post("/auth/")
async def auth(
        creds: schema.Creds,
) -> str:
    """
    Authenticate with credentials in modeus.
    """
    return await integration.login(creds.username, creds.password)
