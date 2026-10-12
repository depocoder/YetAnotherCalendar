"""
Modeus API implemented using a controller.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Response

from yet_another_calendar.web.api.auth.rate_limiter import rate_limited_dependency
from yet_another_calendar.web.api.auth.utils import verify_tutor_token
from . import integration
from . import schema
from ..auth.upstream import authenticate
from ..auth.utils import CALENDAR_COOKIE, create_calendar_token
from yet_another_calendar.settings import settings

router = APIRouter()


@router.get("/events/")
async def get_calendar(
        body: Annotated[schema.ModeusTimeBody, Depends(schema.get_time_from_query)],
        modeus_jwt_token: Annotated[str, Header()],
        person_id: Annotated[str, Depends(schema.get_cookies_from_headers)],
) -> list[schema.FullEvent]:
    """
    Get events from Modeus.
    """
    full_body = schema.ModeusEventsBody.model_validate(
        {**body.create_dump_date(), 'attendeePersonId': [person_id]},
    )
    return await integration.get_events(full_body, modeus_jwt_token)


@router.post("/auth/")
async def auth(
    creds: schema.Creds,
    _: None = Depends(rate_limited_dependency),
) -> str:
    """
    Authenticate with credentials in modeus.
    """
    return await integration.login(creds.username, creds.password)

@router.post("/person-id/")
async def get_modeus_person_id(
    creds: schema.Creds,
    response: Response,
    _: None = Depends(rate_limited_dependency),
) -> str:
    """
    Get modeus person id.
    """
    person_id = await authenticate("modeus", integration.get_person_id_depends(creds))
    response.set_cookie(
        key=CALENDAR_COOKIE, value=create_calendar_token(person_id),
        max_age=settings.redis_events_time_live, httponly=True,
        secure=not settings.debug, samesite="lax", path="/api",
    )
    return person_id

@router.post(
    "/day-events/",
    summary="The group's schedule for the day (requires tutor authentication)",
    response_description="Get daily Modeus Events with specific filters",
    response_model=list[schema.FullEvent],
)
async def day_events(
        body: schema.DayEventsRequest,
        _: Annotated[None, Depends(verify_tutor_token)],
        donor_token: Annotated[str, Depends(integration.get_donor_token)],
) -> list[schema.FullEvent]:
    payload = body.to_search_payload()
    payload["profileName"] = await integration.resolve_profile_names(body.profile_name)
    events = await integration.get_day_events(donor_token, payload)
    assert isinstance(events, list), "Expected list[FullEvent], got unexpected type"
    return events


@router.get(
    "/profiles/",
    summary="Curriculum profiles known to Modeus (requires tutor authentication)",
    response_description="Profiles spelled exactly as Modeus does right now",
)
async def profiles(
        _: Annotated[None, Depends(verify_tutor_token)],
) -> list[schema.Profile]:
    """
    Get curriculum profiles from Modeus, to pick the day events filter from.
    """
    return sorted(await integration.get_profiles(), key=lambda profile: profile.name)
