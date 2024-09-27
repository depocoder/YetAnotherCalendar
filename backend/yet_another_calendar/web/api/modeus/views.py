"""
Modeus API implemented using a controller.
"""
from typing import Annotated

from fastapi import APIRouter
from fastapi.params import Depends

from . import integration
from . import schema

router = APIRouter()


@router.post('/auth')
async def get_modeus_cookies(body: schema.ModeusCreds) -> str:
    """
    Auth in Modeus and return cookies.
    """
    return await integration.login(body.username, body.password)


@router.post("/events/")
async def get_modeus_events_blank(
        body: schema.ModeusEventsBody,
        jwt_token: Annotated[str, Depends(schema.get_cookies_from_headers)],
) -> list[schema.FullEvent]:
    """
    Get events from Modeus when no account.
    """

    return await integration.get_events(jwt_token, body)


@router.get("/search_blank/{full_name}")
async def search_blank(
        jwt_token: Annotated[str, Depends(schema.get_cookies_from_headers)],
        full_name: str = "Комаев Азамат Олегович",
) -> list[schema.ExtendedPerson]:
    """
    Search people from Modeus when no account.
    """
    return await integration.get_people(jwt_token, schema.FullModeusPersonSearch.model_validate({"fullName": full_name}))
