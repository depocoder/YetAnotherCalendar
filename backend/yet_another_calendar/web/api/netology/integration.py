"""Netology API implementation."""
import asyncio
from collections import defaultdict
from typing import Any

import httpx
import reretry
from fastapi import HTTPException
from httpx import AsyncClient
from starlette import status

from yet_another_calendar.settings import settings
from . import schema
from ..modeus.schema import ModeusTimeBody


@reretry.retry(exceptions=httpx.TransportError, tries=settings.retry_tries, delay=settings.retry_delay)
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
    async with AsyncClient(
        http2=True,
        base_url=settings.netology_base_url,
        timeout=timeout,
    ) as session:
        response = await session.post(settings.netology_sign_in_part, data={
            "login": username,
            "password": password,
            "remember": "1",
        },
                                      )
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            raise HTTPException(detail='Netology error. Username/password is incorrect.',
                                status_code=response.status_code)
        response.raise_for_status()
        return schema.NetologyCookies(**session.cookies)


@reretry.retry(exceptions=httpx.TransportError, tries=settings.retry_tries, delay=settings.retry_delay)
async def send_request(
        cookies: schema.NetologyCookies, request_settings: dict[str, Any], timeout: int = 15) -> dict[str, Any]:
    """Send request from httpx."""
    async with AsyncClient(
            http2=True, base_url=settings.netology_base_url, timeout=timeout,
    ) as session:
        session.cookies = httpx.Cookies(cookies.model_dump(by_alias=True))
        response = await session.request(**request_settings)
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            raise HTTPException(detail='Netology error. Cookies expired.', status_code=response.status_code)
        response.raise_for_status()
        return response.json()


async def get_netology_courses(cookies: schema.NetologyCookies) -> schema.CoursesResponse:
    """Get netology courses from netology API."""
    request_settings = {'method': 'GET', 'url': settings.netology_get_course_part}

    response = await send_request(cookies, request_settings=request_settings)
    netology_program = schema.CoursesResponse(**response)
    return netology_program

async def get_utmn_course(cookies: schema.NetologyCookies) -> schema.NetologyProgramId:
    """Get utmn course from netology API."""
    netology_programs = await get_netology_courses(cookies)

    netology_program = netology_programs.get_utmn_program()
    if not netology_program:
        raise HTTPException(detail=f"Netology error. Can't find netology program {settings.netology_course_name}",
                            status_code=status.HTTP_404_NOT_FOUND)
    return netology_program





async def get_events_by_id(
        cookies: schema.NetologyCookies,
        program_id: int,
) -> schema.CalendarResponse:
    """Get events by program id ."""
    response = await send_request(
        cookies,
        request_settings={
            'method': 'GET',
            'url': settings.netology_get_events_part.format(program_id=program_id),
        })

    return schema.CalendarResponse.model_validate(response)


async def get_program_ids(
        cookies: schema.NetologyCookies,
        calendar_id: int,
) -> set[int]:
    """Get program ids by calendar_id."""
    response = await send_request(
        cookies,
        request_settings={
            'method': 'GET',
            'url': settings.netology_get_programs_part.format(calendar_id=calendar_id),
        })

    return schema.ProfessionResponse.model_validate(response).get_lesson_ids()


async def get_calendar(
        cookies: schema.NetologyCookies,
        calendar_id: int,
        body: ModeusTimeBody,
) -> schema.SerializedEvents:
    """Get extended calendar."""
    program_ids = await get_program_ids(cookies, calendar_id)
    serialized_events = defaultdict(list)
    tasks = []
    async with asyncio.TaskGroup() as tg:
        for program_id in program_ids:
            tasks.append(tg.create_task(get_events_by_id(cookies, program_id=program_id)))
    for task in tasks:
        homework_events, webinars_events = task.result().get_serialized_lessons(body)
        serialized_events['homework'].extend(homework_events)
        serialized_events['webinars'].extend(webinars_events)
    return schema.SerializedEvents.model_validate(serialized_events)
