"""Anonymous upstream health statistics."""
import datetime
from collections.abc import AsyncGenerator
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import HTTPException
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from httpx import AsyncClient
from pydantic import ValidationError
from redis.asyncio import ConnectionPool, Redis

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api import upstream_health
from yet_another_calendar.web.api.bulk import integration as bulk_integration
from yet_another_calendar.web.api.lms import schema as lms_schema
from yet_another_calendar.web.api.modeus import schema as modeus_schema
from yet_another_calendar.web.api.netology import schema as netology_schema

NOW = datetime.datetime(2026, 9, 16, 12, 3, 20, tzinfo=datetime.UTC)


@pytest.fixture
async def health_pool(fake_redis_pool: ConnectionPool) -> AsyncGenerator[ConnectionPool, None]:
    upstream_health.init(fake_redis_pool)
    yield fake_redis_pool
    upstream_health.init(None)


def _validation_error() -> ValidationError:
    try:
        lms_schema.User.model_validate({})
    except ValidationError as exception:
        return exception
    raise AssertionError("unreachable")


def _request() -> httpx.Request:
    return httpx.Request("GET", "https://lms.utmn.ru/?wstoken=secret")


@pytest.mark.parametrize(("exception", "expected"), [
    (None, "ok"),
    (HTTPException(status_code=400, detail="maintenance"), "http:400"),
    (HTTPException(status_code=401), "auth"),
    (HTTPException(status_code=403), "auth"),
    (httpx.HTTPStatusError("503", request=_request(), response=httpx.Response(503)), "http:503"),
    (httpx.HTTPStatusError("401", request=_request(), response=httpx.Response(401)), "auth"),
    (httpx.ReadTimeout("slow", request=_request()), "timeout"),
    (httpx.ConnectError("down", request=_request()), "network"),
    (_validation_error(), "format"),
    (RuntimeError("boom"), "other"),
    (ExceptionGroup("g", [httpx.ConnectTimeout("t", request=_request())]), "timeout"),
    (ExceptionGroup("g", [ExceptionGroup("inner", [HTTPException(status_code=500)])]), "http:500"),
])
def test_classify(exception: BaseException | None, expected: str) -> None:
    assert upstream_health.classify(exception) == expected


def test_bucket_start_floors_to_five_minutes() -> None:
    assert upstream_health.bucket_start(NOW) == NOW.replace(minute=0, second=0, microsecond=0)
    later = NOW.replace(minute=59, second=59)
    assert upstream_health.bucket_start(later) == NOW.replace(minute=55, second=0, microsecond=0)


def _stats(ok: int = 0, errors: dict[str, int] | None = None) -> upstream_health.WindowStats:
    return upstream_health.WindowStats(ok=ok, errors=errors or {})


@pytest.mark.parametrize(("recent", "hour", "expected"), [
    (_stats(), _stats(), "unknown"),
    (_stats(ok=3), _stats(ok=30), "ok"),
    (_stats(ok=9, errors={"503": 1}), _stats(), "degraded"),
    (_stats(ok=0, errors={"503": 1}), _stats(), "degraded"),  # one failure is a flake, not an outage
    (_stats(ok=1, errors={"503": 2}), _stats(), "down"),
    (_stats(ok=2, errors={"timeout": 2}), _stats(), "down"),
    (_stats(), _stats(ok=1, errors={"503": 5}), "down"),  # quiet 15 minutes: fall back to the hour
    (_stats(ok=5), _stats(ok=5, errors={"503": 50}), "ok"),  # recovered: recent window wins
])
def test_service_status(
        recent: upstream_health.WindowStats, hour: upstream_health.WindowStats, expected: str,
) -> None:
    assert upstream_health.service_status(recent, hour) == expected


async def test_record_and_summary(health_pool: ConnectionPool) -> None:
    outcomes = [
        upstream_health.Outcome("lms", "ok", 800),
        upstream_health.Outcome("lms", "ok", 400),
        upstream_health.Outcome("lms", "http:503"),
        upstream_health.Outcome("lms", "http:503"),
        upstream_health.Outcome("lms", "timeout"),
        upstream_health.Outcome("lms", "auth"),
        upstream_health.Outcome("netology", "ok", 300),
    ]
    await upstream_health.record(outcomes, now=NOW)
    # An hour-old call counts for the day only; a two-day-old one for nothing.
    await upstream_health.record([upstream_health.Outcome("netology", "ok", 100)], now=NOW - datetime.timedelta(hours=2))
    await upstream_health.record([upstream_health.Outcome("modeus", "ok", 100)], now=NOW - datetime.timedelta(days=2))

    async with Redis(connection_pool=health_pool) as redis:
        summary = await upstream_health.build_summary(redis, now=NOW)

    by_name = {service.service: service for service in summary.services}
    lms_hour = by_name["lms"].windows["1h"]
    assert lms_hour.ok == 2
    assert lms_hour.auth == 1
    assert lms_hour.errors == {"503": 2, "timeout": 1}
    assert lms_hour.avg_latency_ms == 600
    assert lms_hour.total == 5  # auth failures are not the service's fault
    assert by_name["lms"].status == "down"

    assert by_name["netology"].windows["1h"].ok == 1
    assert by_name["netology"].windows["24h"].ok == 2
    assert by_name["netology"].status == "ok"

    assert by_name["modeus"].windows["24h"].ok == 0
    assert by_name["modeus"].status == "unknown"
    assert summary.status == "down"
    assert summary.generated_at == NOW


async def test_buckets_expire(health_pool: ConnectionPool) -> None:
    await upstream_health.record([upstream_health.Outcome("lms", "ok", 10)], now=NOW)
    async with Redis(connection_pool=health_pool) as redis:
        keys = [key async for key in redis.scan_iter(match="health:lms:*")]
        assert len(keys) == 1
        assert 0 < await redis.ttl(keys[0]) <= settings.health_bucket_time_live


async def test_record_is_a_noop_without_pool() -> None:
    upstream_health.init(None)
    await upstream_health.record([upstream_health.Outcome("lms", "ok", 10)])  # must not raise


async def test_record_swallows_redis_errors(health_pool: ConnectionPool) -> None:
    with patch.object(upstream_health, "Redis", side_effect=ConnectionError("redis is down")):
        await upstream_health.record([upstream_health.Outcome("lms", "ok", 10)])


async def test_summary_is_cached_briefly(health_pool: ConnectionPool) -> None:
    await upstream_health.record([upstream_health.Outcome("lms", "ok", 10)])
    first = await upstream_health.get_summary(health_pool)
    await upstream_health.record([upstream_health.Outcome("lms", "http:500")])
    second = await upstream_health.get_summary(health_pool)

    assert first == second
    async with Redis(connection_pool=health_pool) as redis:
        assert 0 < await redis.ttl("health:summary") <= settings.health_summary_time_live
        await redis.delete("health:summary")
    third = await upstream_health.get_summary(health_pool)
    assert third.services[2].windows["1h"].errors == {"500": 1}


async def test_unreadable_summary_cache_is_rebuilt(health_pool: ConnectionPool) -> None:
    async with Redis(connection_pool=health_pool) as redis:
        await redis.set("health:summary", b"{not json")
    summary = await upstream_health.get_summary(health_pool)
    assert summary.status == "unknown"


async def test_services_health_endpoint(client: AsyncClient, health_pool: ConnectionPool) -> None:
    await upstream_health.record([
        upstream_health.Outcome("modeus", "ok", 250),
        upstream_health.Outcome("lms", "http:400"),
    ])

    response = await client.get("/api/health/services/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "degraded"
    assert [service["service"] for service in payload["services"]] == ["netology", "modeus", "lms"]
    modeus = payload["services"][1]
    assert modeus["status"] == "ok"
    assert modeus["windows"]["15m"] == {"ok": 1, "auth": 0, "errors": {}, "avg_latency_ms": 250}
    assert payload["services"][2]["windows"]["1h"]["errors"] == {"400": 1}
    # Nothing but counters: no ids, tokens or URLs leak into the public summary.
    assert "person" not in response.text
    assert "token" not in response.text


# --- get_calendar records every upstream outcome ---------------------------

BODY = modeus_schema.ModeusTimeBody(timeMin="2025-01-06T00:00:00Z", timeMax="2025-01-12T00:00:00Z")
LMS_USER = lms_schema.User(token="test_token", id=123)
COOKIES = netology_schema.NetologyCookies.model_validate({"_netology-on-rails_session": "test_session"})


@pytest.fixture
def _cache() -> Any:
    InMemoryBackend._store.clear()
    FastAPICache.init(InMemoryBackend())
    yield
    FastAPICache.reset()


@pytest.fixture
def upstreams() -> Any:
    netology = AsyncMock(return_value=netology_schema.SerializedEvents(homework=[], webinars=[]))
    modeus = AsyncMock(return_value=[])
    lms = AsyncMock(return_value=[])
    with (
        patch.object(bulk_integration.netology_views, "get_calendar", new=netology),
        patch.object(bulk_integration.modeus_views, "get_calendar", new=modeus),
        patch.object(bulk_integration.lms_views, "get_events", new=lms),
    ):
        yield SimpleNamespace(netology=netology, modeus=modeus, lms=lms)


async def _get_calendar() -> Any:
    return await bulk_integration.get_calendar(
        BODY, 45526, "550e8400-e29b-41d4-a716-446655440000",
        lms_user=LMS_USER, cookies=COOKIES, modeus_jwt_token="jwt",
    )


@pytest.mark.usefixtures("_cache")
async def test_get_calendar_records_outcomes(health_pool: ConnectionPool, upstreams: SimpleNamespace) -> None:
    upstreams.lms.side_effect = HTTPException(status_code=400, detail="maintenance")

    calendar = await _get_calendar()

    assert calendar.failures[0].service == "lms"
    async with Redis(connection_pool=health_pool) as redis:
        summary = await upstream_health.build_summary(redis)
    by_name = {service.service: service for service in summary.services}
    assert by_name["netology"].windows["15m"].ok == 1
    assert by_name["modeus"].windows["15m"].ok == 1
    assert by_name["lms"].windows["15m"].errors == {"400": 1}
    assert by_name["netology"].windows["15m"].avg_latency_ms is not None


@pytest.mark.usefixtures("_cache")
async def test_get_calendar_records_auth_errors_before_raising(
        health_pool: ConnectionPool, upstreams: SimpleNamespace,
) -> None:
    upstreams.netology.side_effect = HTTPException(status_code=401, detail="cookies expired")

    with pytest.raises(HTTPException):
        await _get_calendar()

    async with Redis(connection_pool=health_pool) as redis:
        summary = await upstream_health.build_summary(redis)
    netology = summary.services[0]
    assert netology.windows["15m"].auth == 1
    assert netology.windows["15m"].errors == {}  # the user's session, not the service
    assert netology.status == "unknown"  # and nothing else is known about it yet
    assert summary.services[2].windows["15m"].ok == 1  # the other calls were still counted
