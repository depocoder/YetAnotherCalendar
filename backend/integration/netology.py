"""Netology API implementation."""
from http.client import UNAUTHORIZED
from typing import List

import requests
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


async def send_request(cookies: NetologyCookies, timeout: int = 15, **kwargs: dict) -> dict:
    session = AsyncClient(
        http2=True,
        base_url="https://netology.ru",
        timeout=timeout,
    )
    session.cookies = cookies.model_dump(by_alias=True)
    response = await session.request(**kwargs)
    if response.status_code == UNAUTHORIZED:
        raise NetologyUnauthorizedError('Cookies expired.')
    response.raise_for_status()
    return response.json()


def get_program_ids(session: requests.Session) -> List[str]:
    """Get your Netology program ids."""
    response = session.get(
        "https://netology.ru/backend/api/user/programs/calendar/filters",
    )
    response.raise_for_status()
    serialized_response = response.json()
    programs = serialized_response["programs"]
    return [program["id"] for program in programs]


def get_calendar(session: requests.Session, calendar_id: str) -> NetologyCookies:
    """Get your calendar events."""
    response = session.get(
        "https://netology.ru/backend/api/user/programs/calendar",
        params={"program_ids[]": f"{calendar_id}"},
    )
    response.raise_for_status()
    return NetologyCookies.model_validate_json(response.text)


async def get_utmn_course(cookies: NetologyCookies) -> NetologyProgram:
    response = await send_request(cookies, **dict(method='GET', url='/backend/api/user/programs/calendar/filters'))
    netology_program = NetologyPrograms(**response).get_utmn_program()
    if not netology_program:
        raise NetologyNotFoundError(f"Can't find netology program {settings.netology_course_name}")
    return netology_program
