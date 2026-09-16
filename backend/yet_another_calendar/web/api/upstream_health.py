"""Anonymous health statistics of the upstream services.

Every call to Netology, Modeus or LMS made while a calendar is built is
counted in Redis: per service, per 5-minute bucket, by outcome. Only
counters are stored - no identifiers, tokens or request details - so the
statistics are public and drive the status indicator in the frontend.

The module is self-contained on purpose: lifespan initialises it, so it
must not import anything that imports lifespan back.
"""
import datetime
from collections import Counter
from dataclasses import dataclass
from typing import Any, Literal

import httpx
from fastapi import HTTPException
from loguru import logger
from pydantic import BaseModel, Field, ValidationError
from redis.asyncio import ConnectionPool, Redis
from starlette import status

from yet_another_calendar.settings import settings
from .errors import leaf_exceptions

ServiceName = Literal["netology", "modeus", "lms"]
ServiceStatus = Literal["ok", "degraded", "down", "unknown"]

SERVICES: tuple[ServiceName, ...] = ("netology", "modeus", "lms")
BUCKET_MINUTES = 5
# Window name -> length in minutes. The first one decides the status.
WINDOWS: dict[str, int] = {"15m": 15, "1h": 60, "24h": 24 * 60}
_BUCKET_KEY = "health:{service}:{bucket}"
_SUMMARY_KEY = "health:summary"
_LATENCY_FIELD = "latency_ms"
_AUTH_STATUSES = (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
# At least this share of failed calls (and at least two of them) means "down".
_DOWN_SHARE = 0.5
_DOWN_MIN_FAILURES = 2
_SEVERITY: dict[ServiceStatus, int] = {"unknown": 0, "ok": 1, "degraded": 2, "down": 3}
# Most specific first: TimeoutException is a TransportError.
_GENERIC_CATEGORIES: tuple[tuple[type[BaseException], str], ...] = (
    (httpx.TimeoutException, "timeout"),
    (httpx.TransportError, "network"),
    (ValidationError, "format"),
)

_redis_pool: ConnectionPool | None = None


def init(redis_pool: ConnectionPool | None) -> None:
    """Attach the pool used for recording (None disables recording)."""
    global _redis_pool  # noqa: PLW0603 - process-wide like FastAPICache.init
    _redis_pool = redis_pool


@dataclass(frozen=True)
class Outcome:
    """One upstream call: how it ended and how long it took."""
    service: ServiceName
    category: str
    latency_ms: int = 0


class WindowStats(BaseModel):
    ok: int = 0
    # Credentials rejected by the service: the user's session, not the
    # service, is at fault - counted apart and never colours the status.
    auth: int = 0
    # Failed calls by reason: an HTTP status ("503"), "timeout", "network",
    # "format" (unexpected response) or "other".
    errors: dict[str, int] = Field(default_factory=dict)
    avg_latency_ms: int | None = None

    @property
    def bad(self) -> int:
        return sum(self.errors.values())

    @property
    def total(self) -> int:
        return self.ok + self.bad


class ServiceHealth(BaseModel):
    service: ServiceName
    status: ServiceStatus
    windows: dict[str, WindowStats]


class ServicesHealth(BaseModel):
    status: ServiceStatus
    generated_at: datetime.datetime
    services: list[ServiceHealth]


def classify(exception: BaseException | None) -> str:
    """Bucket name for the way an upstream call ended."""
    if exception is None:
        return "ok"
    if isinstance(exception, BaseExceptionGroup):
        leaves = leaf_exceptions(exception)
        return classify(leaves[0]) if leaves else "other"
    status_code: int | None = None
    if isinstance(exception, HTTPException):
        status_code = exception.status_code
    elif isinstance(exception, httpx.HTTPStatusError):
        status_code = exception.response.status_code
    if status_code is not None:
        return "auth" if status_code in _AUTH_STATUSES else f"http:{status_code}"
    return next(
        (name for exception_type, name in _GENERIC_CATEGORIES if isinstance(exception, exception_type)),
        "other",
    )


def _now() -> datetime.datetime:
    return datetime.datetime.now(tz=datetime.UTC)


def bucket_start(moment: datetime.datetime) -> datetime.datetime:
    return moment.replace(minute=moment.minute - moment.minute % BUCKET_MINUTES, second=0, microsecond=0)


def _bucket_key(service: str, bucket: datetime.datetime) -> str:
    return _BUCKET_KEY.format(service=service, bucket=bucket.strftime("%Y%m%d%H%M"))


async def record(outcomes: list[Outcome], now: datetime.datetime | None = None) -> None:
    """Count the outcomes. Never raises: statistics must not break a calendar."""
    if _redis_pool is None or not outcomes:
        return
    bucket = bucket_start(now or _now())
    try:
        async with Redis(connection_pool=_redis_pool) as redis, redis.pipeline(transaction=False) as pipe:
            for outcome in outcomes:
                key = _bucket_key(outcome.service, bucket)
                pipe.hincrby(key, outcome.category, 1)
                if outcome.category == "ok":
                    # Only successful calls count towards the response time:
                    # a timeout would drown the real numbers.
                    pipe.hincrby(key, _LATENCY_FIELD, outcome.latency_ms)
                pipe.expire(key, settings.health_bucket_time_live)
            await pipe.execute()
    except Exception:
        logger.exception("Can't record upstream health")


def _window_stats(buckets: list[dict[str, int]]) -> WindowStats:
    ok = sum(bucket.get("ok", 0) for bucket in buckets)
    auth = sum(bucket.get("auth", 0) for bucket in buckets)
    latency = sum(bucket.get(_LATENCY_FIELD, 0) for bucket in buckets)
    errors: Counter[str] = Counter()
    for bucket in buckets:
        for field, count in bucket.items():
            if field in ("ok", "auth", _LATENCY_FIELD):
                continue
            errors[field.removeprefix("http:")] += count
    return WindowStats(
        ok=ok, auth=auth, errors=dict(errors), avg_latency_ms=round(latency / ok) if ok else None,
    )


def service_status(recent: WindowStats, hour: WindowStats) -> ServiceStatus:
    """Status from the most recent window with data, so a recovery shows quickly."""
    window = recent if recent.total else hour
    if not window.total:
        return "unknown"
    if not window.bad:
        return "ok"
    if window.bad >= _DOWN_MIN_FAILURES and window.bad / window.total >= _DOWN_SHARE:
        return "down"
    return "degraded"


def _decode_bucket(raw: dict[Any, Any]) -> dict[str, int]:
    decoded: dict[str, int] = {}
    for field, value in raw.items():
        name = field.decode() if isinstance(field, bytes) else str(field)
        try:
            decoded[name] = int(value)
        except (TypeError, ValueError):
            continue
    return decoded


async def build_summary(redis: Redis, now: datetime.datetime | None = None) -> ServicesHealth:
    now = now or _now()
    longest = max(WINDOWS.values()) // BUCKET_MINUTES
    latest = bucket_start(now)
    # Oldest first, so a window is simply the tail of the list.
    buckets = [latest - datetime.timedelta(minutes=BUCKET_MINUTES * index) for index in range(longest - 1, -1, -1)]
    async with redis.pipeline(transaction=False) as pipe:
        for service in SERVICES:
            for bucket in buckets:
                pipe.hgetall(_bucket_key(service, bucket))
        raw_buckets = await pipe.execute()
    services: list[ServiceHealth] = []
    for index, service in enumerate(SERVICES):
        decoded = [_decode_bucket(raw) for raw in raw_buckets[index * longest:(index + 1) * longest]]
        windows = {
            name: _window_stats(decoded[-(minutes // BUCKET_MINUTES):]) for name, minutes in WINDOWS.items()
        }
        recent_name, hour_name = list(WINDOWS)[:2]
        services.append(ServiceHealth(
            service=service,
            status=service_status(windows[recent_name], windows[hour_name]),
            windows=windows,
        ))
    overall: ServiceStatus = "unknown"
    for service_health in services:
        if _SEVERITY[service_health.status] > _SEVERITY[overall]:
            overall = service_health.status
    return ServicesHealth(status=overall, generated_at=now, services=services)


async def get_summary(redis_pool: ConnectionPool) -> ServicesHealth:
    """The summary, cached briefly: every open calendar polls it."""
    async with Redis(connection_pool=redis_pool) as redis:
        cached = await redis.get(_SUMMARY_KEY)
        if cached:
            try:
                return ServicesHealth.model_validate_json(cached)
            except ValidationError:
                logger.warning("Ignoring an unreadable cached health summary")
        summary = await build_summary(redis)
        await redis.set(_SUMMARY_KEY, summary.model_dump_json(), ex=settings.health_summary_time_live)
        return summary
