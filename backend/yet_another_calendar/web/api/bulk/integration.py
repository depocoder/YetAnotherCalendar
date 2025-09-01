import asyncio
import datetime
from collections.abc import Iterable
from typing import Any

import icalendar
from fastapi import HTTPException
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
from starlette import status
from pydantic import ValidationError
from loguru import logger

from yet_another_calendar.settings import settings
from . import schema
from ..lms import schema as lms_schema
from ..lms import views as lms_views
from ..modeus import schema as modeus_schema
from ..modeus import views as modeus_views
from ..netology import schema as netology_schema
from ..netology import views as netology_views
from ...cache_builder import key_builder



def create_ics_event(title: str, starts_at: datetime.datetime, ends_at: datetime.datetime,
                     lesson_id: Any, description: str | None = None,
                     url: str | None = None) -> icalendar.Event:
    event = icalendar.Event()
    dt_now = datetime.datetime.now()
    event.add('summary', title)
    event.add('location', url if url else 'unknown location')
    event.add('dtstart', starts_at)
    event.add('dtend', ends_at)
    event.add('dtstamp', dt_now)
    event.add('uid', lesson_id)
    event.add('DESCRIPTION', description)
    return event


def export_to_ics(calendar: schema.CalendarResponse) -> Iterable[bytes]:
    ics_calendar = icalendar.Calendar()
    ics_calendar.add('version', '2.0')
    ics_calendar.add('prodid', 'yet_another_calendar')

    for netology_lesson in calendar.netology.webinars:
        if not netology_lesson.starts_at or not netology_lesson.ends_at:
            continue
        event = create_ics_event(title=f"Netology: {netology_lesson.block_title}", starts_at=netology_lesson.starts_at,
                                 ends_at=netology_lesson.ends_at, lesson_id=netology_lesson.id,
                                 description=netology_lesson.title,
                                 url=netology_lesson.webinar_url)
        ics_calendar.add_component(event)
    for netology_homework in calendar.netology.homework:
        if not netology_homework.deadline:
            continue
        dt_end = netology_homework.deadline + datetime.timedelta(hours=18)
        dt_start = dt_end - datetime.timedelta(hours=2)
        event = create_ics_event(title=f"Netology ДЗ: {netology_homework.block_title}", starts_at=dt_start,
                                 ends_at=dt_end, lesson_id=netology_homework.id,
                                 description=netology_homework.title,
                                 url=netology_homework.url)
        ics_calendar.add_component(event)
    for modeus_lesson in calendar.utmn.modeus_events:
        event = create_ics_event(title=f"Modeus: {modeus_lesson.course_name}", starts_at=modeus_lesson.start_time,
                                 ends_at=modeus_lesson.end_time, lesson_id=modeus_lesson.id,
                                 description=modeus_lesson.name, url=modeus_lesson.mts_url)
        ics_calendar.add_component(event)
    for lms_event in calendar.utmn.lms_events:
        dt_start = lms_event.dt_end - datetime.timedelta(hours=2)
        event = create_ics_event(title=f"LMS: {lms_event.course_name}", starts_at=dt_start, ends_at=lms_event.dt_end,
                                 lesson_id=lms_event.id, description=lms_event.name, url=lms_event.url)
        ics_calendar.add_component(event)
    yield ics_calendar.to_ical()


async def refresh_events(
        body: modeus_schema.ModeusTimeBody,
        lms_user: lms_schema.User,
        calendar_id: int,
        cookies: netology_schema.NetologyCookies,
        timezone: str,
        modeus_jwt_token: str,
        person_id: str,
) -> schema.RefreshedCalendarResponse:
    """Clear events cache."""
    cached_json = await get_cached_calendar(body, calendar_id, person_id,
                                            lms_user=lms_user, cookies=cookies, modeus_jwt_token=modeus_jwt_token)
    try:
        cached_calendar = schema.CalendarResponse.model_validate(cached_json)
    except ValidationError:
        cached_calendar = None
        logger.exception(f"Got validation error: {cached_json}")
    calendar = await get_calendar(body, calendar_id, person_id,
                                  lms_user=lms_user, cookies=cookies, modeus_jwt_token=modeus_jwt_token)
    changed = cached_calendar.get_hash() != calendar.get_hash() if cached_calendar else True
    try:
        cache_key = key_builder(
            get_cached_calendar, args=(body, calendar_id, person_id), kwargs={},
        )
        coder = FastAPICache.get_coder()
        backend = FastAPICache.get_backend()
        await backend.set(
            key=f"{settings.redis_prefix}:{cache_key}",
            value=coder.encode(calendar),
            expire=settings.redis_events_time_live)
    except Exception as exception:
        logger.error(f"Got redis {exception}")
        raise HTTPException(detail="Can't refresh redis", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR) from None
    return schema.RefreshedCalendarResponse(
        **{**calendar.model_dump(by_alias=True), "changed": changed},
    ).change_timezone(timezone)


async def get_calendar(
        body: modeus_schema.ModeusTimeBody,
        calendar_id: int,
        person_id: str,
        lms_user: lms_schema.User,
        cookies: netology_schema.NetologyCookies,
        modeus_jwt_token: str,
) -> schema.CalendarResponse:
    full_body = modeus_schema.ModeusEventsBody.model_validate(
        {**body.create_dump_date(), 'attendeePersonId': [person_id]},
    )
    async with asyncio.TaskGroup() as tg:
        netology_response = tg.create_task(netology_views.get_calendar(body, calendar_id, cookies))
        modeus_response = tg.create_task(modeus_views.get_calendar(full_body, modeus_jwt_token, person_id))
        lms_response = tg.create_task(lms_views.get_events(lms_user, full_body))
    lms_events = lms_response.result() if lms_response else []
    return schema.CalendarResponse.model_validate(
        {"netology": netology_response.result(), "utmn": {
            "modeus_events": modeus_response.result(),
            "lms_events": lms_events,
        }},
    )


# noinspection PyTypeChecker
@cache(expire=settings.redis_events_time_live, key_builder=key_builder)  # type i
async def get_cached_calendar(
        body: modeus_schema.ModeusTimeBody,
        calendar_id: int,
        person_id: str,
        *,
        lms_user: lms_schema.User,
        cookies: netology_schema.NetologyCookies,
        modeus_jwt_token: str,
) -> schema.CalendarResponse:
    """Only args are using for key_builder, so kwargs aren't"""
    return await get_calendar(body, calendar_id, person_id,
                              lms_user=lms_user, cookies=cookies, modeus_jwt_token=modeus_jwt_token)
