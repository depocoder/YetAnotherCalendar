"""
Modeus API implemented using a controller.
"""
from typing import Annotated

from fastapi import APIRouter
from fastapi.params import Depends

from . import integration
from . import schema

router = APIRouter()


@router.post("/events/")
async def get_calendar(
        body: schema.ModeusEventsBody,
        jwt_token: Annotated[str, Depends(schema.get_cookies_from_headers)],
) -> list[schema.FullEvent]:
    """
    Get events from Modeus.
    """

    return await integration.get_events(jwt_token, body)


@router.get("/search/")
async def search(
        jwt_token: Annotated[str, Depends(schema.get_cookies_from_headers)],
        full_name: str = "Комаев Азамат Олегович",
) -> list[schema.ExtendedPerson]:
    """
    Search people from Modeus.
    """
    return await integration.get_people(
        jwt_token, schema.FullModeusPersonSearch.model_validate({"fullName": full_name}),
    )
