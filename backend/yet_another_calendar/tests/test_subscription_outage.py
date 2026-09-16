"""ICS subscriptions while an upstream service is down."""
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from redis.asyncio import ConnectionPool, Redis

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.bulk import schema as bulk_schema
from yet_another_calendar.web.api.subscription import integration
from yet_another_calendar.web.api.vault import integration as vault_integration
from yet_another_calendar.web.api.vault import schema as vault_schema

VAULT_ID = "0123456789abcdef0123456789abcdef"
SECRET = "url-secret-url-secret-url"
LAST_GOOD = b"BEGIN:VCALENDAR\r\nPRODID:last-good\r\nEND:VCALENDAR\r\n"
TOKENS = vault_schema.CachedTokens(netology_session="session", lms_id=1, lms_token="token")


@pytest.fixture(autouse=True)
def _pepper(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ics_pepper", "test-pepper")


def _record() -> vault_schema.VaultRecord:
    dek = b"\x05" * 32
    creds = vault_schema.EncryptedCreds.model_validate({
        "netology": {"username": "user@example.com", "password": "netology-pass"},
        "lxp": {"username": "user@study.utmn.ru", "password": "lxp-pass"},
    })
    nonce, ciphertext = vault_integration.encrypt_creds(dek, creds)
    return vault_schema.VaultRecord(
        creds_ciphertext=ciphertext,
        creds_nonce=nonce,
        modeus_person_id="person-id-123",
        calendar_ids=[45526],
        grants={"g1": vault_integration.make_grant(SECRET, dek, "ics")},
    )


def _degraded_calendar() -> bulk_schema.CalendarResponse:
    return bulk_schema.CalendarResponse.model_validate({
        "netology": {"homework": [], "webinars": []},
        "utmn": {"modeus_events": [], "lms_events": []},
        "failures": [{"service": "lms", "error": "maintenance"}],
    })


async def test_build_ics_refuses_incomplete_feed() -> None:
    """A feed missing a service would delete its events on the client."""
    with (
        patch.object(integration.modeus_integration, "get_donor_token", new=AsyncMock(return_value="jwt")),
        patch.object(integration.bulk_integration, "get_calendar", new=AsyncMock(return_value=_degraded_calendar())),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await integration._build_ics(_record(), TOKENS)
    assert exc_info.value.status_code == 503
    assert "lms" in str(exc_info.value.detail)


@pytest.fixture
async def stored_vault(fake_redis_pool: ConnectionPool) -> ConnectionPool:
    async with Redis(connection_pool=fake_redis_pool) as redis:
        await vault_integration.save_record(redis, VAULT_ID, _record())
        await redis.set(vault_integration.TOKENS_KEY.format(vault_id=VAULT_ID), TOKENS.model_dump_json())
    return fake_redis_pool


async def test_outage_serves_last_good_feed(stored_vault: ConnectionPool) -> None:
    async with Redis(connection_pool=stored_vault) as redis:
        await redis.set(integration._LAST_KEY.format(vault_id=VAULT_ID), LAST_GOOD)
    outage = HTTPException(detail="Upstream unavailable: lms", status_code=503)

    with patch.object(integration, "_build_ics", new=AsyncMock(side_effect=outage)):
        ics_bytes = await integration.get_subscription_ics(stored_vault, VAULT_ID, SECRET)

    assert ics_bytes == LAST_GOOD
    async with Redis(connection_pool=stored_vault) as redis:
        # Cached only briefly, so the next poll retries upstream.
        assert await redis.get(integration._CACHE_KEY.format(vault_id=VAULT_ID)) == LAST_GOOD
        assert 0 < await redis.ttl(integration._CACHE_KEY.format(vault_id=VAULT_ID)) <= settings.redis_degraded_retry_time
        record = await vault_integration.load_record(redis, VAULT_ID)
        assert record.broken is False


async def test_outage_without_last_good_feed_fails(stored_vault: ConnectionPool) -> None:
    outage = HTTPException(detail="Upstream unavailable: lms", status_code=503)

    with patch.object(integration, "_build_ics", new=AsyncMock(side_effect=outage)):
        with pytest.raises(HTTPException) as exc_info:
            await integration.get_subscription_ics(stored_vault, VAULT_ID, SECRET)
    assert exc_info.value.status_code == 503


async def test_expired_tokens_are_refreshed_once(stored_vault: ConnectionPool) -> None:
    build = AsyncMock(side_effect=[HTTPException(detail="expired", status_code=401), b"fresh"])
    refresh = AsyncMock(return_value=TOKENS)

    with (
        patch.object(integration, "_build_ics", new=build),
        patch.object(vault_integration, "refresh_tokens", new=refresh),
    ):
        ics_bytes = await integration.get_subscription_ics(stored_vault, VAULT_ID, SECRET)

    assert ics_bytes == b"fresh"
    refresh.assert_awaited_once()


async def test_rejected_credentials_mark_subscription_broken(stored_vault: ConnectionPool) -> None:
    build = AsyncMock(side_effect=HTTPException(detail="expired", status_code=401))
    refresh = AsyncMock(side_effect=HTTPException(detail="wrong password", status_code=401))

    with (
        patch.object(integration, "_build_ics", new=build),
        patch.object(vault_integration, "refresh_tokens", new=refresh),
    ):
        ics_bytes = await integration.get_subscription_ics(stored_vault, VAULT_ID, SECRET)

    assert "подписка отвязана".encode() in ics_bytes
    async with Redis(connection_pool=stored_vault) as redis:
        record = await vault_integration.load_record(redis, VAULT_ID)
    assert record.broken is True


async def test_login_outage_serves_last_good_feed(fake_redis_pool: ConnectionPool) -> None:
    """No cached tokens and Netology login is down: the last feed is still served."""
    async with Redis(connection_pool=fake_redis_pool) as redis:
        await vault_integration.save_record(redis, VAULT_ID, _record())
        await redis.set(integration._LAST_KEY.format(vault_id=VAULT_ID), LAST_GOOD)
    refresh = AsyncMock(side_effect=RuntimeError("netology login is down"))

    with patch.object(vault_integration, "refresh_tokens", new=refresh):
        ics_bytes = await integration.get_subscription_ics(fake_redis_pool, VAULT_ID, SECRET)

    assert ics_bytes == LAST_GOOD
