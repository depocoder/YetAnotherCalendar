"""ICS subscription implementation on top of the credentials vault.

A subscription is a vault grant of kind "ics": its secret lives in the
subscription URL. Tokens for upstream services are refreshed lazily -
calendar clients poll the URL every few hours, and expired tokens are
re-created from the decrypted credentials during the poll itself.
"""
import asyncio
import datetime
from typing import Any, cast

import icalendar
from fastapi import HTTPException
from loguru import logger
from redis.asyncio import ConnectionPool, Redis
from starlette import status

from yet_another_calendar.settings import settings
from . import schema
from ..bulk import integration as bulk_integration
from ..bulk import schema as bulk_schema
from ..lms import integration as lms_integration
from ..lms import schema as lms_schema
from ..modeus import integration as modeus_integration
from ..modeus import schema as modeus_schema
from ..netology import integration as netology_integration
from ..netology import schema as netology_schema
from ..vault import integration as vault_integration
from ..vault import schema as vault_schema

_CACHE_KEY = "ics_cache:{vault_id}"
_LAST_KEY = "ics_last:{vault_id}"


def build_time_bodies(today: datetime.date | None = None) -> list[modeus_schema.ModeusTimeBody]:
    """Build weekly Monday..Sunday windows around the current week."""
    today = today or datetime.datetime.now(tz=datetime.UTC).date()
    current_monday = today - datetime.timedelta(days=today.weekday())
    first_monday = current_monday - datetime.timedelta(weeks=settings.ics_weeks_past)
    bodies = []
    for week in range(settings.ics_weeks_past + settings.ics_weeks_future + 1):
        monday = first_monday + datetime.timedelta(weeks=week)
        sunday = monday + datetime.timedelta(days=6)
        bodies.append(modeus_schema.ModeusTimeBody.model_validate({
            "timeMin": monday.isoformat(),
            "timeMax": sunday.isoformat(),
        }))
    return bodies


def merge_calendars(calendars: list[bulk_schema.CalendarResponse]) -> bulk_schema.CalendarResponse:
    """Merge weekly calendars into one, deduplicating events by id."""
    homework: dict[Any, Any] = {}
    webinars: dict[Any, Any] = {}
    modeus_events: dict[Any, Any] = {}
    lms_events: dict[Any, Any] = {}
    for calendar in calendars:
        for homework_event in calendar.netology.homework:
            homework.setdefault(homework_event.id, homework_event)
        for webinar in calendar.netology.webinars:
            webinars.setdefault(webinar.id, webinar)
        for modeus_event in calendar.utmn.modeus_events:
            modeus_events.setdefault(modeus_event.id, modeus_event)
        for lms_event in calendar.utmn.lms_events:
            lms_events.setdefault(lms_event.id, lms_event)
    return bulk_schema.CalendarResponse.model_validate({
        "netology": {
            "homework": list(homework.values()),
            "webinars": list(webinars.values()),
        },
        "utmn": {
            "modeus_events": list(modeus_events.values()),
            "lms_events": list(lms_events.values()),
        },
    })


def build_warning_ics(last_ics: bytes | None) -> bytes:
    """Add an all-day "subscription is broken" event so the user notices it."""
    ics_calendar: icalendar.Component = _empty_calendar()
    if last_ics:
        try:
            ics_calendar = icalendar.Calendar.from_ical(last_ics.decode())
        except (ValueError, UnicodeDecodeError):
            ics_calendar = _empty_calendar()
    tomorrow = datetime.datetime.now(tz=datetime.UTC).date() + datetime.timedelta(days=1)
    event = icalendar.Event()
    event.add("summary", "⚠️ YetAnotherCalendar: подписка отвязана")
    event.add("dtstart", tomorrow)
    event.add("dtend", tomorrow + datetime.timedelta(days=1))
    event.add("dtstamp", datetime.datetime.now(tz=datetime.UTC))
    event.add("uid", "yet-another-calendar-broken-subscription")
    event.add(
        "description",
        "Пароль изменился или сессия отозвана. Зайдите на сайт и пересоздайте подписку.",
    )
    ics_calendar.add_component(event)
    return bytes(ics_calendar.to_ical())


def _empty_calendar() -> icalendar.Calendar:
    ics_calendar = icalendar.Calendar()
    ics_calendar.add("version", "2.0")
    ics_calendar.add("prodid", "yet_another_calendar")
    return ics_calendar


async def create_subscription(
        redis_pool: ConnectionPool,
        request: schema.SubscriptionCreateRequest,
) -> str:
    """Validate credentials, store them in a fresh vault, return the URL path."""
    vault_integration.require_pepper()
    if request.netology is None or request.lxp is None or request.modeus_person_id is None:
        raise HTTPException(
            detail="Credentials are required", status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    creds = vault_schema.EncryptedCreds(netology=request.netology, lxp=request.lxp)
    # Fail fast with upstream 401 before storing anything. Sequential on
    # purpose, so the error names the exact service that rejected the user.
    await netology_integration.auth_netology(
        request.netology.username, request.netology.password,
    )
    await lms_integration.auth_lms(request.lxp)

    vault_id, secret = await vault_integration.create_vault(
        redis_pool,
        creds,
        modeus_person_id=request.modeus_person_id,
        calendar_ids=request.calendar_ids,
        time_zone=request.time_zone,
        grant_kind="ics",
    )
    return f"/api/subscription/{vault_id}/{secret}/calendar.ics"


async def create_subscription_from_vault(
        redis_pool: ConnectionPool,
        cookie_vault_id: str,
        cookie_secret: str,
        calendar_ids: list[int],
        time_zone: str,
) -> str:
    """One-click subscription for a remembered browser: no password re-entry.

    The browser grant unwraps the DEK, and a new ICS grant is attached to
    the same vault.
    """
    async with Redis(connection_pool=redis_pool) as redis:
        record, _, dek = await vault_integration.resolve(redis, cookie_vault_id, cookie_secret)
        if calendar_ids:
            record.calendar_ids = sorted(set(calendar_ids))
        if time_zone:
            record.time_zone = time_zone
        secret = await vault_integration.add_grant(redis, cookie_vault_id, record, dek, "ics")
    return f"/api/subscription/{cookie_vault_id}/{secret}/calendar.ics"


async def delete_subscription(redis_pool: ConnectionPool, vault_id: str, secret: str) -> None:
    async with Redis(connection_pool=redis_pool) as redis:
        await vault_integration.delete_grant(redis, vault_id, secret)
        # Cached feeds die with the subscription; a remaining browser grant
        # doesn't need them, and a new ICS grant rebuilds the cache anyway.
        await redis.delete(_CACHE_KEY.format(vault_id=vault_id), _LAST_KEY.format(vault_id=vault_id))
    logger.info(f"Deleted ICS subscription from vault {vault_id}")


async def _build_ics(record: vault_schema.VaultRecord, tokens: vault_schema.CachedTokens) -> bytes:
    cookies = netology_schema.NetologyCookies.model_validate(
        {"_netology-on-rails_session": tokens.netology_session},
    )
    lms_user = lms_schema.User(id=tokens.lms_id, token=tokens.lms_token)
    donor_token = cast(str, await modeus_integration.get_donor_token())
    calendar_ids = record.calendar_ids or [settings.netology_default_course_id]
    calendar_id = netology_schema.normalize_calendar_ids(calendar_ids)

    weekly_calendars = await asyncio.gather(*[
        bulk_integration.get_calendar(
            body, calendar_id, record.modeus_person_id,
            lms_user=lms_user, cookies=cookies, modeus_jwt_token=donor_token,
        )
        for body in build_time_bodies()
    ])
    merged = merge_calendars(list(weekly_calendars)).change_timezone(record.time_zone)
    return b"".join(bulk_integration.export_to_ics(merged))


async def _serve_broken(redis: Redis, vault_id: str, record: vault_schema.VaultRecord) -> bytes:
    await vault_integration.mark_broken(redis, vault_id, record, broken=True)
    last_ics = await redis.get(_LAST_KEY.format(vault_id=vault_id))
    return build_warning_ics(last_ics)


async def get_subscription_ics(redis_pool: ConnectionPool, vault_id: str, secret: str) -> bytes:
    """Serve the ICS feed, lazily refreshing upstream tokens when needed."""
    async with Redis(connection_pool=redis_pool) as redis:
        record, _, dek = await vault_integration.resolve(redis, vault_id, secret)

        cached_ics = await redis.get(_CACHE_KEY.format(vault_id=vault_id))
        if cached_ics:
            return bytes(cached_ics)

        tokens = await vault_integration.get_cached_tokens(redis, vault_id)

        for attempt_with_fresh_tokens in (False, True):
            if tokens is None or attempt_with_fresh_tokens:
                creds = vault_integration.decrypt_creds(dek, record)
                try:
                    tokens = await vault_integration.refresh_tokens(redis, vault_id, creds)
                except HTTPException as exception:
                    if vault_integration.is_auth_error(exception):
                        logger.warning(f"ICS subscription {vault_id} is broken: credentials rejected")
                        return await _serve_broken(redis, vault_id, record)
                    raise
            try:
                ics_bytes = await _build_ics(record, tokens)
            except (HTTPException, BaseExceptionGroup) as exception:
                if vault_integration.is_auth_error(exception) and not attempt_with_fresh_tokens:
                    # Cached tokens expired earlier than expected: retry once.
                    await vault_integration.drop_cached_tokens(redis, vault_id)
                    continue
                raise
            await vault_integration.mark_broken(redis, vault_id, record, broken=False)
            await redis.set(
                _CACHE_KEY.format(vault_id=vault_id), ics_bytes, ex=settings.ics_cache_time_live,
            )
            await redis.set(_LAST_KEY.format(vault_id=vault_id), ics_bytes)
            return ics_bytes
        raise HTTPException(  # pragma: no cover - unreachable
            detail="Can't build calendar", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
