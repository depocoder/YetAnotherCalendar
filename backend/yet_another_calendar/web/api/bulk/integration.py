import asyncio
import datetime
import logging
from typing import Any, Iterable, Optional

import icalendar
from fastapi import HTTPException
from fastapi_cache import default_key_builder, FastAPICache
from fastapi_cache.decorator import cache
from starlette import status

from yet_another_calendar.settings import settings
from ..netology import views as netology_views
from ..lms import views as lms_views
from ..modeus import views as modeus_views
from ..modeus import schema as modeus_schema
from ..lms import schema as lms_schema
from ..netology import schema as netology_schema
from . import schema

logger = logging.getLogger(__name__)


def create_ics_event(title: str, starts_at: datetime.datetime, ends_at: datetime.datetime,
                     lesson_id: Any, description: Optional[str] = None,
                     url: Optional[str] = None) -> icalendar.Event:
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
                                 description=modeus_lesson.name)
        ics_calendar.add_component(event)
    for lms_event in calendar.utmn.lms_events:
        dt_start = lms_event.dt_end - datetime.timedelta(hours=2)
        event = create_ics_event(title=f"LMS: {lms_event.course_name}", starts_at=dt_start, ends_at=lms_event.dt_end,
                                 lesson_id=lms_event.id, description=lms_event.name, url=lms_event.url)
        ics_calendar.add_component(event)
    yield ics_calendar.to_ical()


async def refresh_events(
        body: modeus_schema.ModeusEventsBody,
        lms_user: lms_schema.User,
        jwt_token: str,
        calendar_id: int,
        cookies: netology_schema.NetologyCookies,
        timezone: str,
) -> schema.RefreshedCalendarResponse:
    """Clear events cache."""
    cached_json = await get_cached_calendar(body, lms_user, calendar_id, cookies)
    cached_calendar = schema.CalendarResponse.model_validate(cached_json)
    calendar = await get_calendar(body, lms_user, jwt_token, calendar_id, cookies)
    changed = cached_calendar.get_hash() != calendar.get_hash()
    try:
        cache_key = default_key_builder(get_cached_calendar, args=(body, calendar_id, cookies), kwargs={})
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
        body: modeus_schema.ModeusEventsBody,
        lms_user: lms_schema.User,
        jwt_token: str,
        calendar_id: int,
        cookies: netology_schema.NetologyCookies,
) -> schema.CalendarResponse:
    lms_response = None
    async with asyncio.TaskGroup() as tg:
        netology_response = tg.create_task(netology_views.get_calendar(body, calendar_id, cookies))
        modeus_response = tg.create_task(modeus_views.get_calendar(body, jwt_token))
        if lms_user.is_enabled:
            lms_response = tg.create_task(lms_views.get_events(lms_user, body))
    lms_events = lms_response.result() if lms_response else []
    return schema.CalendarResponse.model_validate(
        {"netology": netology_response.result(), "utmn": {
            "modeus_events": modeus_response.result(),
            "lms_events": lms_events,
        }},
    )


@cache(expire=settings.redis_events_time_live)
async def get_cached_calendar(
        body: modeus_schema.ModeusEventsBody,
        lms_user: lms_schema.User,
        calendar_id: int,
        cookies: netology_schema.NetologyCookies,
) -> schema.CalendarResponse:
    jwt_token = await modeus_schema.get_cookies_from_headers()
    return await get_calendar(body, lms_user, jwt_token, calendar_id, cookies)
