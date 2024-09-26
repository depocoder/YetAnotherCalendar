"""Netology API implementation."""
from http.client import UNAUTHORIZED
from typing import Any

import httpx
from httpx import AsyncClient

from app.controllers.models import NetologyCookies, NetologyPrograms, NetologyProgram
from app.settings import load_settings
from integration.exceptions import NetologyNotFoundError, NetologyUnauthorizedError

settings = load_settings()


async def auth_netology(username: str, password: str, timeout: int = 15) -> NetologyCookies:
    """
    Auth in Netology, required username and password.

    Args:
        username (str): Netology username.
        password (str): Netology password.

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
    if response.status_code == UNAUTHORIZED:
        raise NetologyUnauthorizedError('Username/password is incorrect.')
    response.raise_for_status()
    return NetologyCookies(**session.cookies)


async def send_request(
        cookies: NetologyCookies, request_settings: dict[str, Any], timeout: int = 15) -> dict[str, Any]:
    """Send request from httpx."""
    session = AsyncClient(
        http2=True,
        base_url="https://netology.ru",
        timeout=timeout,
    )
    session.cookies = httpx.Cookies(cookies.model_dump(by_alias=True))
    response = await session.request(**request_settings)
    if response.status_code == UNAUTHORIZED:
        raise NetologyUnauthorizedError('Cookies expired.')
    response.raise_for_status()
    return response.json()


async def get_calendar(cookies: NetologyCookies, calendar_id: int) -> dict[str, Any]:
    """Get your calendar events."""
    response = await send_request(cookies, request_settings={
        'method': 'GET', 'url': '/backend/api/user/programs/calendar',
        'params': {'program_ids[]': calendar_id},
    })
    return response


async def get_utmn_course(cookies: NetologyCookies) -> NetologyProgram:
    """Get utmn course from netology API."""
    request_settings = {'method': 'GET', 'url': '/backend/api/user/programs/calendar/filters'}

    response = await send_request(cookies, request_settings=request_settings)
    netology_program = NetologyPrograms(**response).get_utmn_program()
    if not netology_program:
        raise NetologyNotFoundError(f"Can't find netology program {settings.netology_course_name}")
    return netology_program
