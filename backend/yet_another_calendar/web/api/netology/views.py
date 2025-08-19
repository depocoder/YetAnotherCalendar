"""
Netology API implemented using a controller.
"""

from fastapi import APIRouter, Depends

import yet_another_calendar.web.api.modeus.schema
from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.auth.rate_limiter import rate_limited_dependency
from . import integration, schema

router = APIRouter()


@router.post("/auth")
async def get_netology_cookies(
    item: schema.NetologyCreds,
    _: None = Depends(rate_limited_dependency),
) -> schema.NetologyCookies:
    """
    Auth in Netology and return cookies.
    """
    return await integration.auth_netology(
        item.username,
        item.password,
    )


@router.get('/course/')
async def get_course(
        cookies: schema.NetologyCookies = Depends(schema.get_cookies_from_headers),
) -> schema.NetologyProgramId:
    """
    Get netology course ID, filter by utmn name.
    """
    return await integration.get_utmn_course(cookies)


@router.get('/courses/')
async def get_courses(
        cookies: schema.NetologyCookies = Depends(schema.get_cookies_from_headers),
) -> schema.CoursesResponse:
    """
    Get netology courses
    """
    return await integration.get_netology_courses(cookies)

@router.get('/calendar/')
async def get_calendar(
        body: schema.ModeusTimeBody = Depends(yet_another_calendar.web.api.modeus.schema.get_time_from_query),
        calendar_id: int = settings.netology_default_course_id,
        cookies: schema.NetologyCookies = Depends(schema.get_cookies_from_headers),
) -> schema.SerializedEvents:
    """
    Get Netology Calendar by time.
    """
    return await integration.get_calendar(cookies=cookies, calendar_id=calendar_id, body=body)
