"""Netology API implementation."""
from typing import Any

import httpx
from fastapi import HTTPException
from fastapi_cache.decorator import cache
from httpx import AsyncClient
from starlette import status

from . import schema
from yet_another_calendar.settings import settings


async def auth_netology(username: str, password: str, timeout: int = 15) -> schema.NetologyCookies:
    """
    Auth in Netology, required username and password.

    Args:
        username (str): Netology username.
        password (str): Netology password.
        timeout (str): Netology service timeout.

    Returns:
        dict: Cookies for API.
    """
    session = AsyncClient(
        http2=True,
        base_url="https://netology.ru",
        timeout=timeout,
    )
    response = await session.post('/backend/api/user/sign_in', data={
        "login": username,
        "password": password,
        "remember": "1",
    },
                                  )
    if response.status_code == status.HTTP_401_UNAUTHORIZED:
        raise HTTPException(detail='Username/password is incorrect.', status_code=response.status_code)
    response.raise_for_status()
    return schema.NetologyCookies(**session.cookies)


async def send_request(
        cookies: schema.NetologyCookies, request_settings: dict[str, Any], timeout: int = 15) -> dict[str, Any]:
    """Send request from httpx."""
    session = AsyncClient(
        http2=True,
        base_url="https://netology.ru",
        timeout=timeout,
    )
    session.cookies = httpx.Cookies(cookies.model_dump(by_alias=True))
    response = await session.request(**request_settings)
    if response.status_code == status.HTTP_401_UNAUTHORIZED:
        raise HTTPException(detail='Cookies expired.', status_code=response.status_code)
    response.raise_for_status()
    return response.json()


@cache(expire=settings.redis_events_time_live)
async def get_calendar(cookies: schema.NetologyCookies, calendar_id: int) -> dict[str, Any]:
    """Get your calendar events."""
    response = await send_request(cookies, request_settings={
        'method': 'GET', 'url': '/backend/api/user/programs/calendar',
        'params': {'program_ids[]': calendar_id},
    })
    return response

@cache(expire=settings.redis_events_time_live)
async def get_utmn_course(cookies: schema.NetologyCookies) -> schema.NetologyProgram:
    """Get utmn course from netology API."""
    request_settings = {'method': 'GET', 'url': '/backend/api/user/programs/calendar/filters'}

    response = await send_request(cookies, request_settings=request_settings)
    netology_program = schema.NetologyPrograms(**response).get_utmn_program()
    if not netology_program:
        raise HTTPException(detail=f"Can't find netology program {settings.netology_course_name}",
                            status_code=status.HTTP_404_NOT_FOUND)
    return netology_program
