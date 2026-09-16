import asyncio
import datetime
import hashlib
import time
from collections.abc import Awaitable, Iterable
from typing import Any

import httpx
import icalendar
from fastapi import HTTPException
from fastapi_cache import FastAPICache
from starlette import status
from pydantic import ValidationError
from loguru import logger
from redis.asyncio import ConnectionPool, Redis

from yet_another_calendar.log import mask_secrets
from yet_another_calendar.settings import settings
from . import schema
from .. import upstream_health
from ..errors import is_auth_error, leaf_exceptions
from ..lms import schema as lms_schema
from ..lms import views as lms_views
from ..modeus import schema as modeus_schema
from ..modeus import views as modeus_views
from ..netology import schema as netology_schema
from ..netology import views as netology_views
from ...cache_builder import key_builder

# Order matches the gather() in get_calendar.
_SERVICES: tuple[schema.ServiceName, ...] = ("netology", "modeus", "lms")
_ERROR_TEXT_LIMIT = 300
# Most specific first: TimeoutException is a TransportError.
_GENERIC_REASONS: tuple[tuple[type[BaseException], str], ...] = (
    (httpx.TimeoutException, "Upstream timed out"),
    (httpx.TransportError, "Can't connect to upstream"),
    (ValidationError, "Unexpected upstream response format"),
)


async def count_keys_by_prefix(redis_pool: ConnectionPool, prefix: str = settings.redis_week_metrix_prefix) -> int:
    """
    Count Redis keys matching a given prefix pattern.

    Uses scan_iter which is production-safe (non-blocking).
    Similar to CLI: redis-cli KEYS "prefix*" | wc -l

    :param redis_pool: Redis connection pool
    :param prefix: Key prefix pattern (e.g., "calendar:*", "user:*")
    :return: Number of keys matching the prefix
    """
    async with Redis(connection_pool=redis_pool) as redis:
        count = 0
        async for _ in redis.scan_iter(match=f"{prefix}*", count=1000):
            count += 1
        logger.debug(f"Found {count} keys matching prefix '{prefix}'")
        return count

async def save_user_was_there(
    redis_pool: ConnectionPool, user_id: str,
    prefix: str = settings.redis_week_metrix_prefix) -> None:
    """
    Mark that a user accessed the calendar by storing their ID in Redis.

    Creates a temporary key-value pair with automatic expiration to track
    user visits. The key uses the user_id as name and stores a boolean True value.

    This is useful for:
    - Tracking unique visitors over a time period
    - Monitoring user activity
    - Analytics and usage statistics

    The key automatically expires after redis_week_live (7 days by default),
    so it acts as a sliding window for recent user activity.

    Privacy: only a one-way SHA-256 hash of the identifier is stored - the
    counter needs uniqueness, not the identity itself.

    :param redis_pool: Redis connection pool from get_redis_pool dependency
    :param user_id: Unique identifier for the user (e.g., email, person_id, etc.)
    :return: None
    """
    user_hash = hashlib.sha256(user_id.encode()).hexdigest()
    async with Redis(connection_pool=redis_pool) as redis:
        await redis.set(name=f"{prefix}:{user_hash}", value=0, ex=settings.redis_week_live)


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
    # Not every calendar client makes LOCATION clickable - put the link
    # into the description too, where it always is.
    full_description = f"{description}\n{url}" if description and url else (description or url)
    event.add('DESCRIPTION', full_description)
    if url:
        event.add('URL', url)
    return event


def export_to_ics(calendar: schema.CalendarResponse) -> Iterable[bytes]:
    ics_calendar = icalendar.Calendar()
    ics_calendar.add('version', '2.0')
    ics_calendar.add('prodid', 'yet_another_calendar')
    # Hints for subscribed clients to re-poll often: webinar links appear in
    # Netology shortly before the event, so freshness matters.
    ics_calendar.add('X-PUBLISHED-TTL', 'PT1H')
    ics_calendar['REFRESH-INTERVAL;VALUE=DURATION'] = 'PT1H'

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


def describe_failure(exception: BaseException) -> str:
    """Short, secret-free reason an upstream call failed, shown by the frontend.

    httpx errors are never stringified: their text carries the request URL,
    and the LMS token travels in the query string.
    """
    if isinstance(exception, BaseExceptionGroup):
        leaves = leaf_exceptions(exception)
        return describe_failure(leaves[0]) if leaves else "Unknown error"
    if isinstance(exception, HTTPException):
        return mask_secrets(str(exception.detail))[:_ERROR_TEXT_LIMIT]
    if isinstance(exception, httpx.HTTPStatusError):
        return f"Upstream answered HTTP {exception.response.status_code}"
    for exception_type, reason in _GENERIC_REASONS:
        if isinstance(exception, exception_type):
            return reason
    return type(exception).__name__


def _service_part(calendar: schema.CalendarResponse, service: schema.ServiceName) -> Any:
    if service == "netology":
        return calendar.netology
    if service == "modeus":
        return calendar.utmn.modeus_events
    return calendar.utmn.lms_events


def _empty_part(service: schema.ServiceName) -> Any:
    if service == "netology":
        return {"homework": [], "webinars": []}
    return []


def _fallback_part(
        service: schema.ServiceName,
        exception: BaseException,
        fallback: schema.CalendarResponse | None,
) -> tuple[Any, schema.ServiceFailure]:
    """The part of the calendar to serve for a service that just failed.

    Stale data from the cached calendar beats an empty week. The cached
    calendar may itself have been built during the outage: then the
    timestamp of the last real fetch is carried over, and "no data" stays
    honest instead of turning into "data from a minute ago".
    """
    error = describe_failure(exception)
    prior = None
    if fallback is not None:
        prior = next((failure for failure in fallback.failures if failure.service == service), None)
    if fallback is None or (prior is not None and not prior.from_cache):
        return _empty_part(service), schema.ServiceFailure(service=service, error=error)
    cached_at = (prior.cached_at if prior is not None else None) or fallback.cached_at
    failure = schema.ServiceFailure(service=service, error=error, from_cache=True, cached_at=cached_at)
    return _service_part(fallback, service), failure


async def _timed(call: Awaitable[Any]) -> tuple[Any, int]:
    """Await an upstream call: (result or the exception it raised, elapsed ms)."""
    started = time.perf_counter()
    try:
        result: Any = await call
    except Exception as exception:  # classified by the caller
        result = exception
    return result, round((time.perf_counter() - started) * 1000)


async def get_calendar(
        body: modeus_schema.ModeusTimeBody,
        calendar_id: int | tuple[int, ...],
        person_id: str,
        lms_user: lms_schema.User,
        cookies: netology_schema.NetologyCookies,
        modeus_jwt_token: str,
        fallback: schema.CalendarResponse | None = None,
) -> schema.CalendarResponse:
    """Collect events from every upstream, surviving an outage of any one of them.

    Auth errors (401/403) still propagate: the frontend renews the session
    on them. Any other failure of one service must not hide the other two,
    so its part comes from ``fallback`` (the cached calendar) or stays empty,
    and the failure is reported in ``failures`` for the frontend to show.
    Every outcome is counted in the anonymous upstream health statistics.
    """
    full_body = modeus_schema.ModeusEventsBody.model_validate(
        {**body.create_dump_date(), 'attendeePersonId': [person_id]},
    )
    results = await asyncio.gather(
        _timed(netology_views.get_calendar(body, calendar_id, cookies)),
        _timed(modeus_views.get_calendar(full_body, modeus_jwt_token, person_id)),
        _timed(lms_views.get_events(lms_user, full_body)),
    )
    parts: dict[schema.ServiceName, Any] = {}
    failures: list[schema.ServiceFailure] = []
    outcomes: list[upstream_health.Outcome] = []
    auth_error: Exception | None = None
    for service, (result, latency_ms) in zip(_SERVICES, results, strict=True):
        if not isinstance(result, Exception):
            parts[service] = result
            outcomes.append(upstream_health.Outcome(service, "ok", latency_ms))
            continue
        outcomes.append(upstream_health.Outcome(service, upstream_health.classify(result), latency_ms))
        if is_auth_error(result):
            auth_error = auth_error or result
            continue
        parts[service], failure = _fallback_part(service, result, fallback)
        failures.append(failure)
        served = "cached" if failure.from_cache else "empty"
        logger.opt(exception=result).warning(f"{service} failed, serving {served} data: {failure.error}")
    await upstream_health.record(outcomes)
    if auth_error is not None:
        raise auth_error
    return schema.CalendarResponse.model_validate({
        "netology": parts["netology"],
        "utmn": {"modeus_events": parts["modeus"], "lms_events": parts["lms"]},
        "failures": failures,
    })


def _cache_key(body: modeus_schema.ModeusTimeBody, calendar_id: int | tuple[int, ...], person_id: str) -> str:
    # Same key the old @cache decorator produced, so the deploy step that
    # wipes "FastAPI-redis:calendar:*" keeps matching.
    cache_key = key_builder(get_cached_calendar, args=(body, calendar_id, person_id), kwargs={})
    return f"{settings.redis_prefix}:{settings.redis_lesson_prefix}{cache_key}"


async def load_cached_calendar(
        body: modeus_schema.ModeusTimeBody,
        calendar_id: int | tuple[int, ...],
        person_id: str,
) -> schema.CalendarResponse | None:
    """The cached calendar, or None when missing, unreadable or the cache is down."""
    key = _cache_key(body, calendar_id, person_id)
    try:
        cached = await FastAPICache.get_backend().get(key)
    except Exception:
        logger.exception(f"Can't read calendar cache {key}")
        return None
    if cached is None:
        return None
    try:
        return schema.CalendarResponse.model_validate(FastAPICache.get_coder().decode(cached))
    except (ValidationError, ValueError):
        logger.exception(f"Got validation error for cached calendar {key}")
        return None


async def store_calendar(
        body: modeus_schema.ModeusTimeBody,
        calendar_id: int | tuple[int, ...],
        person_id: str,
        calendar: schema.CalendarResponse,
) -> None:
    """Cache the calendar. Raises when the cache is down."""
    await FastAPICache.get_backend().set(
        key=_cache_key(body, calendar_id, person_id),
        value=FastAPICache.get_coder().encode(calendar),
        expire=settings.redis_events_time_live,
    )


def is_retry_due(calendar: schema.CalendarResponse) -> bool:
    """Whether a calendar built during an outage is old enough to retry upstream."""
    if not calendar.failures:
        return False
    cached_at = calendar.cached_at
    if cached_at.tzinfo is None:
        cached_at = cached_at.replace(tzinfo=datetime.UTC)
    age = datetime.datetime.now(tz=datetime.UTC) - cached_at
    return age >= datetime.timedelta(seconds=settings.redis_degraded_retry_time)


async def refresh_events(
        body: modeus_schema.ModeusTimeBody,
        lms_user: lms_schema.User,
        calendar_id: int | tuple[int, ...],
        cookies: netology_schema.NetologyCookies,
        timezone: str,
        modeus_jwt_token: str,
        person_id: str,
) -> schema.RefreshedCalendarResponse:
    """Fetch fresh events, overwrite the cache and report whether anything changed."""
    cached_calendar = await load_cached_calendar(body, calendar_id, person_id)
    calendar = await get_calendar(body, calendar_id, person_id,
                                  lms_user=lms_user, cookies=cookies, modeus_jwt_token=modeus_jwt_token,
                                  fallback=cached_calendar)
    changed = cached_calendar.get_hash() != calendar.get_hash() if cached_calendar else True
    try:
        await store_calendar(body, calendar_id, person_id, calendar)
    except Exception as exception:
        logger.error(f"Got redis {exception}")
        raise HTTPException(detail="Can't refresh redis", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR) from None
    return schema.RefreshedCalendarResponse(
        **{**calendar.model_dump(by_alias=True), "changed": changed},
    ).change_timezone(timezone)


async def get_cached_calendar(
        body: modeus_schema.ModeusTimeBody,
        calendar_id: int | tuple[int, ...],
        person_id: str,
        *,
        lms_user: lms_schema.User,
        cookies: netology_schema.NetologyCookies,
        modeus_jwt_token: str,
) -> schema.CalendarResponse:
    """The calendar from the cache, fetched from upstreams on a miss.

    Only the positional args make up the cache key. A calendar built while
    an upstream was down is retried after ``redis_degraded_retry_time``,
    with the cached copy still serving whatever is down - so the schedule
    heals itself without a manual refresh.
    """
    cached_calendar = await load_cached_calendar(body, calendar_id, person_id)
    if cached_calendar is not None and not is_retry_due(cached_calendar):
        return cached_calendar
    calendar = await get_calendar(body, calendar_id, person_id,
                                  lms_user=lms_user, cookies=cookies, modeus_jwt_token=modeus_jwt_token,
                                  fallback=cached_calendar)
    try:
        await store_calendar(body, calendar_id, person_id, calendar)
    except Exception:
        logger.exception("Can't write calendar cache, serving the calendar uncached")
    return calendar
