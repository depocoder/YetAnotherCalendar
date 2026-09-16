"""Partial calendar responses when an upstream service is down."""
import datetime
from collections.abc import Generator
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import HTTPException
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from pydantic import ValidationError

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.bulk import integration, schema
from yet_another_calendar.web.api.errors import is_auth_error, leaf_exceptions
from yet_another_calendar.web.api.lms import schema as lms_schema
from yet_another_calendar.web.api.modeus import schema as modeus_schema
from yet_another_calendar.web.api.netology import schema as netology_schema

BODY = modeus_schema.ModeusTimeBody(timeMin="2025-01-06T00:00:00Z", timeMax="2025-01-12T00:00:00Z")
CALENDAR_ID = 45526
PERSON_ID = "550e8400-e29b-41d4-a716-446655440000"
LMS_USER = lms_schema.User(token="test_token", id=123)
COOKIES = netology_schema.NetologyCookies.model_validate({"_netology-on-rails_session": "test_session"})
T0 = datetime.datetime(2025, 1, 5, 12, 0, tzinfo=datetime.UTC)
MAINTENANCE = HTTPException(
    detail="core\\exception\\moodle_exception. сайт находится в режиме технического обслуживания",
    status_code=400,
)
LMS_EVENT = lms_schema.ModuleResponse.model_validate({
    "id": 1, "name": "Deadline", "uservisible": True, "modname": "assign",
    "url": "https://lms.utmn.ru/mod/assign/view.php?id=1",
    "dt_start": "2025-01-06T10:00:00Z", "dt_end": "2025-01-08T10:00:00Z",
    "is_completed": False, "course_name": "Course",
})
WEBINAR = netology_schema.LessonWebinar.model_validate({
    "id": 7, "lesson_id": 8, "type": "webinar", "title": "Webinar", "block_title": "Block",
    "starts_at": "2025-01-07T10:00:00Z", "ends_at": "2025-01-07T11:00:00Z",
})


@pytest.fixture(autouse=True)
def _init_cache() -> Generator[Any, Any, None]:
    # The in-memory store is a class attribute shared by every instance.
    InMemoryBackend._store.clear()
    FastAPICache.init(InMemoryBackend())
    yield
    FastAPICache.reset()
    InMemoryBackend._store.clear()


@pytest.fixture
def upstreams() -> Generator[SimpleNamespace, None, None]:
    """Healthy upstreams by default; a test flips one of them to fail."""
    netology = AsyncMock(return_value=netology_schema.SerializedEvents(homework=[], webinars=[WEBINAR]))
    modeus = AsyncMock(return_value=[])
    lms = AsyncMock(return_value=[])
    with (
        patch.object(integration.netology_views, "get_calendar", new=netology),
        patch.object(integration.modeus_views, "get_calendar", new=modeus),
        patch.object(integration.lms_views, "get_events", new=lms),
    ):
        yield SimpleNamespace(netology=netology, modeus=modeus, lms=lms)


def _calendar(
        lms_events: list[Any] | None = None,
        failures: list[dict[str, Any]] | None = None,
        cached_at: datetime.datetime = T0,
) -> schema.CalendarResponse:
    return schema.CalendarResponse.model_validate({
        "netology": {"homework": [], "webinars": []},
        "utmn": {"modeus_events": [], "lms_events": lms_events or []},
        "failures": failures or [],
        "cached_at": cached_at,
    })


async def _get_calendar(fallback: schema.CalendarResponse | None = None) -> schema.CalendarResponse:
    return await integration.get_calendar(
        BODY, CALENDAR_ID, PERSON_ID,
        lms_user=LMS_USER, cookies=COOKIES, modeus_jwt_token="jwt", fallback=fallback,
    )


async def test_lms_outage_serves_cached_part(upstreams: SimpleNamespace) -> None:
    upstreams.lms.side_effect = MAINTENANCE

    calendar = await _get_calendar(fallback=_calendar(lms_events=[LMS_EVENT]))

    assert calendar.utmn.lms_events == [LMS_EVENT]
    assert calendar.netology.webinars == [WEBINAR]  # the healthy services stay live
    (failure,) = calendar.failures
    assert failure.service == "lms"
    assert failure.from_cache is True
    assert failure.cached_at == T0
    assert "технического обслуживания" in failure.error


async def test_outage_without_cache_serves_empty_part(upstreams: SimpleNamespace) -> None:
    upstreams.lms.side_effect = MAINTENANCE

    calendar = await _get_calendar()

    assert calendar.utmn.lms_events == []
    (failure,) = calendar.failures
    assert failure.from_cache is False
    assert failure.cached_at is None


async def test_netology_outage_keeps_response_shape(upstreams: SimpleNamespace) -> None:
    upstreams.netology.side_effect = httpx.ReadTimeout("slow", request=httpx.Request("GET", "https://netology.ru"))

    calendar = await _get_calendar()

    assert calendar.netology.homework == []
    assert calendar.netology.webinars == []
    assert calendar.failures[0].service == "netology"
    assert calendar.failures[0].error == "Upstream timed out"


async def test_two_outages_are_both_reported(upstreams: SimpleNamespace) -> None:
    upstreams.lms.side_effect = MAINTENANCE
    upstreams.modeus.side_effect = RuntimeError("boom")

    calendar = await _get_calendar()

    assert [failure.service for failure in calendar.failures] == ["modeus", "lms"]


@pytest.mark.parametrize("status_code", [401, 403])
async def test_auth_error_still_propagates(upstreams: SimpleNamespace, status_code: int) -> None:
    upstreams.lms.side_effect = HTTPException(detail="Invalid token", status_code=status_code)

    with pytest.raises(HTTPException) as exc_info:
        await _get_calendar(fallback=_calendar(lms_events=[LMS_EVENT]))
    assert exc_info.value.status_code == status_code


async def test_auth_error_inside_task_group_propagates(upstreams: SimpleNamespace) -> None:
    upstreams.lms.side_effect = ExceptionGroup("lms", [HTTPException(detail="expired", status_code=401)])

    with pytest.raises(ExceptionGroup):
        await _get_calendar()


async def test_stale_timestamp_survives_repeated_outages(upstreams: SimpleNamespace) -> None:
    """A cache entry built during the outage still knows when LMS last answered."""
    upstreams.lms.side_effect = MAINTENANCE
    degraded = _calendar(
        lms_events=[LMS_EVENT],
        failures=[{"service": "lms", "error": "earlier", "from_cache": True, "cached_at": T0}],
        cached_at=T0 + datetime.timedelta(hours=3),
    )

    calendar = await _get_calendar(fallback=degraded)

    assert calendar.utmn.lms_events == [LMS_EVENT]
    assert calendar.failures[0].cached_at == T0


async def test_no_data_stays_honest_across_outages(upstreams: SimpleNamespace) -> None:
    upstreams.lms.side_effect = MAINTENANCE
    degraded = _calendar(failures=[{"service": "lms", "error": "earlier", "from_cache": False}])

    calendar = await _get_calendar(fallback=degraded)

    assert calendar.utmn.lms_events == []
    assert calendar.failures[0].from_cache is False
    assert calendar.failures[0].cached_at is None


def _validation_error() -> ValidationError:
    try:
        lms_schema.User.model_validate({})
    except ValidationError as exception:
        return exception
    raise AssertionError("unreachable")


@pytest.mark.parametrize(("exception", "expected"), [
    (httpx.HTTPStatusError(
        "503", request=httpx.Request("GET", "https://lms.utmn.ru/?wstoken=secret"),
        response=httpx.Response(503),
    ), "Upstream answered HTTP 503"),
    (httpx.ConnectError("down", request=httpx.Request("GET", "https://lms.utmn.ru")), "Can't connect to upstream"),
    (_validation_error(), "Unexpected upstream response format"),
    (RuntimeError("boom"), "RuntimeError"),
    (ExceptionGroup("g", [httpx.ConnectTimeout("t", request=httpx.Request("GET", "https://x"))]), "Upstream timed out"),
    (HTTPException(detail="x" * 500, status_code=400), "x" * 300),
])
def test_describe_failure(exception: BaseException, expected: str) -> None:
    assert integration.describe_failure(exception) == expected


def test_describe_failure_masks_secrets() -> None:
    exception = HTTPException(
        detail="failed for /api/subscription/0123456789abcdef0123456789abcdef/very-secret-token/calendar.ics",
        status_code=400,
    )
    described = integration.describe_failure(exception)
    assert "very-secret-token" not in described
    assert "***" in described


def test_leaf_exceptions_and_is_auth_error() -> None:
    nested = ExceptionGroup("outer", [ExceptionGroup("inner", [RuntimeError("x"), HTTPException(status_code=403)])])
    assert [type(leaf) for leaf in leaf_exceptions(nested)] == [RuntimeError, HTTPException]
    assert is_auth_error(nested) is True
    assert is_auth_error(ExceptionGroup("g", [RuntimeError("x")])) is False
    assert is_auth_error(HTTPException(status_code=400)) is False


def test_hash_ignores_failures_and_cache_time() -> None:
    healthy = _calendar(lms_events=[LMS_EVENT])
    degraded = _calendar(
        lms_events=[LMS_EVENT],
        failures=[{"service": "lms", "error": "x", "from_cache": True, "cached_at": T0}],
        cached_at=T0 + datetime.timedelta(days=1),
    )
    assert healthy.get_hash() == degraded.get_hash()


def test_cache_key_matches_deploy_wipe_pattern() -> None:
    key = integration._cache_key(BODY, CALENDAR_ID, PERSON_ID)
    assert key.startswith(f"{settings.redis_prefix}:{settings.redis_lesson_prefix}:")


def test_is_retry_due() -> None:
    now = datetime.datetime.now(tz=datetime.UTC)
    old = now - datetime.timedelta(seconds=settings.redis_degraded_retry_time + 1)
    failure = {"service": "lms", "error": "x"}
    assert integration.is_retry_due(_calendar(cached_at=old)) is False  # healthy: never
    assert integration.is_retry_due(_calendar(failures=[failure], cached_at=now)) is False
    assert integration.is_retry_due(_calendar(failures=[failure], cached_at=old)) is True
    assert integration.is_retry_due(_calendar(failures=[failure], cached_at=old.replace(tzinfo=None))) is True


async def _get_cached_calendar() -> schema.CalendarResponse:
    return await integration.get_cached_calendar(
        BODY, CALENDAR_ID, PERSON_ID, lms_user=LMS_USER, cookies=COOKIES, modeus_jwt_token="jwt",
    )


async def test_cached_calendar_is_served_without_upstream_calls(upstreams: SimpleNamespace) -> None:
    await integration.store_calendar(BODY, CALENDAR_ID, PERSON_ID, _calendar(lms_events=[LMS_EVENT]))

    calendar = await _get_cached_calendar()

    assert calendar.utmn.lms_events == [LMS_EVENT]
    upstreams.lms.assert_not_called()


async def test_fresh_degraded_calendar_is_not_retried_yet(upstreams: SimpleNamespace) -> None:
    degraded = _calendar(
        failures=[{"service": "lms", "error": "x"}], cached_at=datetime.datetime.now(tz=datetime.UTC),
    )
    await integration.store_calendar(BODY, CALENDAR_ID, PERSON_ID, degraded)

    calendar = await _get_cached_calendar()

    assert calendar.failures[0].service == "lms"
    upstreams.lms.assert_not_called()


async def test_old_degraded_calendar_is_retried_and_heals(upstreams: SimpleNamespace) -> None:
    old = datetime.datetime.now(tz=datetime.UTC) - datetime.timedelta(seconds=settings.redis_degraded_retry_time)
    degraded = _calendar(
        lms_events=[LMS_EVENT],
        failures=[{"service": "lms", "error": "x", "from_cache": True, "cached_at": T0}],
        cached_at=old,
    )
    await integration.store_calendar(BODY, CALENDAR_ID, PERSON_ID, degraded)

    # Still down: the retry keeps the stale LMS part and its original timestamp.
    upstreams.lms.side_effect = MAINTENANCE
    calendar = await _get_cached_calendar()
    assert calendar.utmn.lms_events == [LMS_EVENT]
    assert calendar.failures[0].cached_at == T0
    assert calendar.cached_at > old
    stored = await integration.load_cached_calendar(BODY, CALENDAR_ID, PERSON_ID)
    assert stored is not None and stored.failures[0].cached_at == T0

    # Back up: the next retry produces a healthy calendar.
    stored.cached_at = old
    await integration.store_calendar(BODY, CALENDAR_ID, PERSON_ID, stored)
    upstreams.lms.side_effect = None
    upstreams.lms.return_value = []
    calendar = await _get_cached_calendar()
    assert calendar.failures == []
    assert calendar.utmn.lms_events == []


async def test_cache_miss_survives_cache_outage(upstreams: SimpleNamespace) -> None:
    FastAPICache.reset()  # "You must call init first!" on every backend access

    calendar = await _get_cached_calendar()

    assert calendar.netology.webinars == [WEBINAR]
    assert calendar.failures == []


async def test_unreadable_cache_entry_is_ignored(upstreams: SimpleNamespace) -> None:
    await FastAPICache.get_backend().set(integration._cache_key(BODY, CALENDAR_ID, PERSON_ID), b"{not json")

    assert await integration.load_cached_calendar(BODY, CALENDAR_ID, PERSON_ID) is None


async def test_refresh_keeps_cached_part_of_failed_service(upstreams: SimpleNamespace) -> None:
    await integration.store_calendar(BODY, CALENDAR_ID, PERSON_ID, _calendar(lms_events=[LMS_EVENT]))
    upstreams.lms.side_effect = MAINTENANCE
    upstreams.netology.return_value = netology_schema.SerializedEvents(homework=[], webinars=[])

    refreshed = await integration.refresh_events(
        BODY, LMS_USER, CALENDAR_ID, COOKIES, "Europe/Moscow", "jwt", PERSON_ID,
    )

    assert refreshed.utmn.lms_events[0].id == LMS_EVENT.id
    assert refreshed.failures[0].service == "lms"
    assert refreshed.changed is False  # same events as before, only the flag changed
    stored = await integration.load_cached_calendar(BODY, CALENDAR_ID, PERSON_ID)
    assert stored is not None and stored.failures[0].from_cache is True
