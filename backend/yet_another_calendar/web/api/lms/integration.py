"""Netology API implementation."""
import asyncio
from typing import Any

import httpx
import reretry
from fastapi import HTTPException
from httpx import AsyncClient
from pydantic import TypeAdapter
from starlette import status

from yet_another_calendar.settings import settings
from . import schema
from ..modeus.schema import ModeusTimeBody

def raise_error(serialized_response: dict[str, Any]) -> None:
    if serialized_response.get('errorcode') == 'invalidtoken':
        raise HTTPException(detail='Invalid token',
                            status_code=status.HTTP_401_UNAUTHORIZED)
    error = serialized_response.get('error') or serialized_response.get('exception') or {}
    if error:
        raise HTTPException(detail=f'{error}. Server response: {serialized_response}',
                            status_code=status.HTTP_400_BAD_REQUEST)


@reretry.retry(exceptions=httpx.TransportError, tries=settings.retry_tries, delay=settings.retry_delay)
async def get_token(creds: schema.LxpCreds, timeout: int = 15) -> str:
    """
    Auth in lms, required username and password.
    """
    async with AsyncClient(
        http2=True,
        base_url=settings.lms_base_url,
        timeout=timeout,
    ) as session:
        response = await session.post(settings.lms_login_part, data=creds.model_dump())
        response.raise_for_status()
        serialized_response = response.json()
        if isinstance(serialized_response, dict):
            raise_error(serialized_response)
        return serialized_response['token']


@reretry.retry(exceptions=httpx.TransportError, tries=settings.retry_tries, delay=settings.retry_delay)
async def send_request(
        request_settings: dict[str, Any], timeout: int = 15) -> dict[str, Any] | list[dict[str, Any]]:
    """Send request from httpx."""
    async with AsyncClient(
        http2=True,
        base_url=settings.lms_base_url,
        timeout=timeout,
    ) as session:
        response = await session.request(**request_settings)
        response.raise_for_status()
        serialized_response = response.json()
        if isinstance(serialized_response, list):
            return serialized_response
        raise_error(serialized_response)
        return serialized_response


async def get_user_info(token: str, username: str) -> list[dict[str, Any]]:
    response = await send_request(
        request_settings={
            'method': 'POST',
            'url': settings.lms_get_user_part,
            'params': {"wsfunction": "core_user_get_users_by_field",
                       "field": "username",
                       "values[0]": username,
                       "wstoken": token,
                       "moodlewsrestformat": "json"},
        })
    return response


async def auth_lms(creds: schema.LxpCreds) -> schema.User:
    """Get token and username"""
    token = await get_token(creds)
    user_info = await get_user_info(token, creds.get_username())
    return schema.User(**user_info[0], token=token)


async def get_courses(user: schema.User) -> list[schema.Course]:
    """Get courses."""
    response = await send_request(
        request_settings={
            'method': 'GET',
            'url': settings.lms_get_course_part,
            'params': {
                'wstoken': user.token,
                'moodlewsrestformat': 'json',
                'wsfunction': 'core_enrol_get_users_courses',
                'userid': user.id,
            },
        })
    adapter = TypeAdapter(list[schema.Course])
    return adapter.validate_python(response)


async def get_extended_course(user: schema.User, course_id: int) -> list[schema.ExtendedCourse]:
    """Get extended course with modules and deadlines."""
    response = await send_request(
        request_settings={
            'method': 'POST',
            'url': settings.lms_get_extended_course_part,
            'params': {
                'wstoken': user.token,
                'wsfunction': 'core_course_get_contents',
                'courseid': course_id,
                'moodlewsrestformat': 'json',
            },
        })
    adapter = TypeAdapter(list[schema.ExtendedCourse])
    return adapter.validate_python(response)


async def get_filtered_courses(user: schema.User, body: ModeusTimeBody) -> list[schema.ModuleResponse]:
    """Filter LXP events."""
    courses = await get_courses(user)
    course_by_ids = {course.id: course for course in courses}
    tasks = {}
    async with asyncio.TaskGroup() as tg:
        for course in courses:
            tasks[course.id] = tg.create_task(get_extended_course(user, course.id))
    filtered_modules = []
    for course_id, task in tasks.items():
        course_name = course_by_ids[course_id].full_name
        extended_course = task.result()
        for module in extended_course:
            filtered_modules.extend(module.get_filtered_modules(body, course_name))
    return filtered_modules
