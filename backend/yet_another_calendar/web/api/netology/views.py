"""
Netology API implemented using a controller.
"""

from fastapi import APIRouter, Depends

from yet_another_calendar.settings import settings
from . import integration
from .schema import NetologyCookies, NetologyCreds, NetologyProgram, get_cookies_from_headers

router = APIRouter()


@router.post("/auth")
async def get_netology_cookies(
        item: NetologyCreds,
) -> NetologyCookies:
    """
    Auth in Netology and return cookies.
    """
    cookies = await integration.auth_netology(
        item.username,
        item.password,
    )
    return cookies


@router.get('/utmn_course/')
async def get_course(
        cookies: NetologyCookies = Depends(get_cookies_from_headers),
) -> NetologyProgram:
    """
    Auth in Netology and return cookies.
    """
    return await integration.get_utmn_course(cookies)


@router.get('/calendar/')
async def get_calendar(
        program_id: int = settings.netology_default_course_id,
        cookies: NetologyCookies = Depends(get_cookies_from_headers),
) -> dict:
    """
    Auth in Netology and return cookies.
    """
    return await integration.get_calendar(cookies, program_id)
