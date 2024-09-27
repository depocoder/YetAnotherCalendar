"""
Modeus API implemented using a controller.
"""
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
        jwt_token: str = Depends(schema.get_cookies_from_headers)
) -> list[schema.FullEvent]:
    """
    Get events from Modeus when no account.
    """

    return await integration.get_events(jwt_token, body)


@router.post("/search_blank/")
async def search_blank(
        body: schema.ModeusPersonSearch,
        jwt_token: str = Depends(schema.get_cookies_from_headers)
) -> list[schema.ExtendedPerson]:
    """
    Search people from Modeus when no account.
    """
    return await integration.get_people(jwt_token, body)
