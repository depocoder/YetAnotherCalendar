"""ICS subscription implementation.

Storage model ("key in the URL"):

* The server keeps only the AES-GCM ciphertext of the user's credentials.
* The decryption key is derived (HKDF) from a random secret that lives only
  in the subscription URL plus a server-side pepper from the environment.
* So neither a database dump alone nor a leaked URL alone is enough to
  recover the credentials.

Tokens for upstream services are refreshed lazily: calendar clients poll the
URL every few hours, and expired tokens are re-created from the decrypted
credentials during the poll itself.
"""
import asyncio
import base64
import datetime
import hashlib
import hmac
import secrets as secrets_module
from typing import Any, cast

import icalendar
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
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

_META_KEY = "ics_sub:{sub_id}"
_TOKENS_KEY = "ics_tokens:{sub_id}"
_CACHE_KEY = "ics_cache:{sub_id}"
_LAST_KEY = "ics_last:{sub_id}"

_NOT_FOUND = HTTPException(detail="Subscription not found", status_code=status.HTTP_404_NOT_FOUND)


def _require_pepper() -> str:
    if not settings.ics_pepper:
        raise HTTPException(
            detail="ICS subscriptions are not configured on this server",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return settings.ics_pepper


def _derive_key(secret: str, salt: bytes) -> bytes:
    """Derive the AES key from the URL secret and the server-side pepper."""
    hkdf = HKDF(algorithm=hashes.SHA256(), length=32, salt=salt, info=b"ics-subscription")
    return hkdf.derive(f"{secret}:{_require_pepper()}".encode())


def _hash_secret(secret: str) -> str:
    return hashlib.sha256(f"{secret}:{_require_pepper()}".encode()).hexdigest()


def encrypt_creds(secret: str, creds: schema.EncryptedCreds) -> tuple[str, str, str]:
    """Encrypt the credentials blob, returns (salt, nonce, ciphertext) in base64."""
    salt = secrets_module.token_bytes(16)
    nonce = secrets_module.token_bytes(12)
    key = _derive_key(secret, salt)
    ciphertext = AESGCM(key).encrypt(nonce, creds.model_dump_json().encode(), None)
    return (
        base64.b64encode(salt).decode(),
        base64.b64encode(nonce).decode(),
        base64.b64encode(ciphertext).decode(),
    )


def decrypt_creds(secret: str, meta: schema.SubscriptionMeta) -> schema.EncryptedCreds:
    """Decrypt the credentials blob using the secret from the URL."""
    key = _derive_key(secret, base64.b64decode(meta.salt))
    try:
        payload = AESGCM(key).decrypt(
            base64.b64decode(meta.nonce), base64.b64decode(meta.ciphertext), None,
        )
    except InvalidTag:
        raise _NOT_FOUND from None
    return schema.EncryptedCreds.model_validate_json(payload)


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


async def _load_meta(redis: Redis, sub_id: str) -> schema.SubscriptionMeta:
    raw_meta = await redis.get(_META_KEY.format(sub_id=sub_id))
    if not raw_meta:
        raise _NOT_FOUND
    return schema.SubscriptionMeta.model_validate_json(raw_meta)


def _check_secret(meta: schema.SubscriptionMeta, secret: str) -> None:
    if not hmac.compare_digest(meta.secret_hash, _hash_secret(secret)):
        raise _NOT_FOUND


async def create_subscription(
        redis_pool: ConnectionPool,
        request: schema.SubscriptionCreateRequest,
) -> str:
    """Validate credentials, store them encrypted, return the subscription path."""
    _require_pepper()
    # Fail fast with upstream 401 before storing anything.
    netology_cookies = await netology_integration.auth_netology(
        request.netology.username, request.netology.password,
    )
    lms_user = await lms_integration.auth_lms(request.lxp)

    sub_id = secrets_module.token_hex(16)
    secret = secrets_module.token_urlsafe(32)
    salt, nonce, ciphertext = encrypt_creds(
        secret, schema.EncryptedCreds(netology=request.netology, lxp=request.lxp),
    )
    meta = schema.SubscriptionMeta(
        secret_hash=_hash_secret(secret),
        ciphertext=ciphertext,
        nonce=nonce,
        salt=salt,
        modeus_person_id=request.modeus_person_id,
        calendar_ids=sorted(set(request.calendar_ids)),
        time_zone=request.time_zone,
    )
    tokens = schema.CachedTokens(
        netology_session=netology_cookies.rails_session,
        lms_id=lms_user.id,
        lms_token=lms_user.token,
    )
    async with Redis(connection_pool=redis_pool) as redis:
        await redis.set(_META_KEY.format(sub_id=sub_id), meta.model_dump_json())
        await redis.set(
            _TOKENS_KEY.format(sub_id=sub_id), tokens.model_dump_json(),
            ex=settings.ics_tokens_time_live,
        )
    logger.info(f"Created ICS subscription {sub_id}")
    return f"/api/subscription/{sub_id}/{secret}/calendar.ics"


async def delete_subscription(redis_pool: ConnectionPool, sub_id: str, secret: str) -> None:
    async with Redis(connection_pool=redis_pool) as redis:
        meta = await _load_meta(redis, sub_id)
        _check_secret(meta, secret)
        await redis.delete(
            _META_KEY.format(sub_id=sub_id),
            _TOKENS_KEY.format(sub_id=sub_id),
            _CACHE_KEY.format(sub_id=sub_id),
            _LAST_KEY.format(sub_id=sub_id),
        )
    logger.info(f"Deleted ICS subscription {sub_id}")


def _is_auth_error(exception: BaseException) -> bool:
    if isinstance(exception, HTTPException):
        return exception.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    if isinstance(exception, BaseExceptionGroup):
        return any(_is_auth_error(sub_exception) for sub_exception in exception.exceptions)
    return False


async def _refresh_tokens(
        redis: Redis, sub_id: str, secret: str, meta: schema.SubscriptionMeta,
) -> schema.CachedTokens:
    """Re-authenticate in upstream services using the decrypted credentials."""
    creds = decrypt_creds(secret, meta)
    netology_cookies = await netology_integration.auth_netology(
        creds.netology.username, creds.netology.password,
    )
    lms_user = await lms_integration.auth_lms(creds.lxp)
    tokens = schema.CachedTokens(
        netology_session=netology_cookies.rails_session,
        lms_id=lms_user.id,
        lms_token=lms_user.token,
    )
    await redis.set(
        _TOKENS_KEY.format(sub_id=sub_id), tokens.model_dump_json(),
        ex=settings.ics_tokens_time_live,
    )
    return tokens


async def _build_ics(meta: schema.SubscriptionMeta, tokens: schema.CachedTokens) -> bytes:
    cookies = netology_schema.NetologyCookies.model_validate(
        {"_netology-on-rails_session": tokens.netology_session},
    )
    lms_user = lms_schema.User(id=tokens.lms_id, token=tokens.lms_token)
    donor_token = cast(str, await modeus_integration.get_donor_token())
    calendar_id = netology_schema.normalize_calendar_ids(meta.calendar_ids)

    weekly_calendars = await asyncio.gather(*[
        bulk_integration.get_calendar(
            body, calendar_id, meta.modeus_person_id,
            lms_user=lms_user, cookies=cookies, modeus_jwt_token=donor_token,
        )
        for body in build_time_bodies()
    ])
    merged = merge_calendars(list(weekly_calendars)).change_timezone(meta.time_zone)
    return b"".join(bulk_integration.export_to_ics(merged))


async def _mark_broken(redis: Redis, sub_id: str, meta: schema.SubscriptionMeta) -> bytes:
    if not meta.broken:
        meta.broken = True
        await redis.set(_META_KEY.format(sub_id=sub_id), meta.model_dump_json())
    last_ics = await redis.get(_LAST_KEY.format(sub_id=sub_id))
    return build_warning_ics(last_ics)


async def get_subscription_ics(redis_pool: ConnectionPool, sub_id: str, secret: str) -> bytes:
    """Serve the ICS feed, lazily refreshing upstream tokens when needed."""
    async with Redis(connection_pool=redis_pool) as redis:
        meta = await _load_meta(redis, sub_id)
        _check_secret(meta, secret)

        cached_ics = await redis.get(_CACHE_KEY.format(sub_id=sub_id))
        if cached_ics:
            return bytes(cached_ics)

        raw_tokens = await redis.get(_TOKENS_KEY.format(sub_id=sub_id))
        tokens = schema.CachedTokens.model_validate_json(raw_tokens) if raw_tokens else None

        for attempt_with_fresh_tokens in (False, True):
            if tokens is None or attempt_with_fresh_tokens:
                try:
                    tokens = await _refresh_tokens(redis, sub_id, secret, meta)
                except HTTPException as exception:
                    if _is_auth_error(exception):
                        logger.warning(f"ICS subscription {sub_id} is broken: credentials rejected")
                        return await _mark_broken(redis, sub_id, meta)
                    raise
            try:
                ics_bytes = await _build_ics(meta, tokens)
            except (HTTPException, BaseExceptionGroup) as exception:
                if _is_auth_error(exception) and not attempt_with_fresh_tokens:
                    # Cached tokens expired earlier than expected: retry once.
                    await redis.delete(_TOKENS_KEY.format(sub_id=sub_id))
                    continue
                raise
            if meta.broken:
                meta.broken = False
                await redis.set(_META_KEY.format(sub_id=sub_id), meta.model_dump_json())
            await redis.set(
                _CACHE_KEY.format(sub_id=sub_id), ics_bytes, ex=settings.ics_cache_time_live,
            )
            await redis.set(_LAST_KEY.format(sub_id=sub_id), ics_bytes)
            return ics_bytes
        raise HTTPException(  # pragma: no cover - unreachable
            detail="Can't build calendar", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
