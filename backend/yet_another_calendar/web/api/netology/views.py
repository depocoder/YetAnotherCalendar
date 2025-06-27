"""
Netology API implemented using a controller.
"""

from fastapi import APIRouter, Depends

from yet_another_calendar.settings import settings
from . import integration, schema
from ..modeus.schema import ModeusTimeBody

router = APIRouter()


@router.post("/auth")
async def get_netology_cookies(
        item: schema.NetologyCreds,
) -> schema.NetologyCookies:
    """
    Auth in Netology and return cookies.
    """
    cookies = await integration.auth_netology(
        item.username,
        item.password,
    )
    return cookies


@router.get('/course/')
async def get_course(
        cookies: schema.NetologyCookies = Depends(schema.get_cookies_from_headers),
) -> schema.NetologyProgramId:
    """
    Get netology course ID.
    """
    return await integration.get_utmn_course(cookies)


@router.post('/calendar/')
async def get_calendar(
        body: ModeusTimeBody,
        calendar_id: int = settings.netology_default_course_id,
        cookies: schema.NetologyCookies = Depends(schema.get_cookies_from_headers),
) -> schema.SerializedEvents:
    """
    Get Netology Calendar by time.
    """
    return await integration.get_calendar(cookies=cookies, calendar_id=calendar_id, body=body)
