"""Netology API implementation."""
import asyncio
from typing import Any

import httpx
import reretry
from fastapi import HTTPException
from httpx import AsyncClient
from pydantic import TypeAdapter
from starlette import status
from loguru import logger

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
                # File lists of every resource are most of the response,
                # and the calendar needs dates and completion only.
                'options[0][name]': 'excludecontents',
                'options[0][value]': 1,
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
            filtered_modules.extend(module.get_filtered_modules(body, course_name, course_id))
    return filtered_modules


async def get_course_grades(user: schema.User, course_id: int) -> dict[int, schema.ModuleGrade]:
    """The student's points in a course's activities, by module id.

    Grades are personal: they are read on demand and never go into the
    calendar cache.
    """
    response = await send_request(
        request_settings={
            'method': 'GET',
            'url': settings.lms_get_course_part,
            'params': {
                'wstoken': user.token,
                'moodlewsrestformat': 'json',
                'wsfunction': 'gradereport_user_get_grade_items',
                'courseid': course_id,
                'userid': user.id,
            },
        })
    return schema.CourseGradesResponse.model_validate(response).by_module()


async def get_modules_grades(
        user: schema.User, modules: list[schema.ModuleResponse],
) -> dict[int, schema.ModuleGrade]:
    """Points of the given activities for an exported calendar: best effort.

    One request per course they belong to; a course whose gradebook is
    closed (the LMS answers an error) or any other trouble leaves its
    activities without points - the export must not suffer for them.
    """
    course_ids = sorted({module.course_id for module in modules if module.course_id is not None})
    results = await asyncio.gather(
        *[get_course_grades(user, course_id) for course_id in course_ids], return_exceptions=True,
    )
    wanted = {module.id for module in modules}
    grades: dict[int, schema.ModuleGrade] = {}
    for course_id, result in zip(course_ids, results, strict=True):
        if isinstance(result, BaseException):
            logger.warning(f"Can't read LMS grades of course {course_id}: {type(result).__name__}")
            continue
        grades.update({module_id: grade for module_id, grade in result.items() if module_id in wanted})
    return grades
