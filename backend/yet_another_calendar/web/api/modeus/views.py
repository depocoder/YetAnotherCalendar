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
        body: schema.ModeusEventsBody,
        modeus_jwt_token: Annotated[str, Header()],
) -> list[schema.FullEvent]:
    """
    Get events from Modeus.
    """

    return await integration.get_events(modeus_jwt_token, body)


@router.post("/auth/")
async def auth(
        creds: schema.Creds,
) -> str:
    """
    Authenticate with credentials in modeus.
    """
    return await integration.login(creds.username, creds.password,)
