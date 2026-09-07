"""Tests for the credentials vault: remember-me endpoints and vault-backed subscriptions."""
import asyncio

import pytest
from fastapi import HTTPException
from starlette import status

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.lms import integration as lms_integration
from yet_another_calendar.web.api.lms import schema as lms_schema
from yet_another_calendar.web.api.modeus import integration as modeus_integration
from yet_another_calendar.web.api.netology import integration as netology_integration
from yet_another_calendar.web.api.netology import schema as netology_schema

VAULT_BODY = {
    "netology": {"username": "user@example.com", "password": "netology-pass"},
    "lxp": {"username": "user@study.utmn.ru", "password": "lxp-pass", "service": "test"},
    "modeus_person_id": "00000000-0000-0000-0000-000000000000",
    "calendar_ids": [45526, 70685],
    "time_zone": "Europe/Moscow",
}


@pytest.fixture(autouse=True)
def _pepper(monkeypatch):
    monkeypatch.setattr(settings, "ics_pepper", "test-pepper")


@pytest.fixture
def upstream_auth(monkeypatch):
    """Fake upstream auth: counts calls and returns predictable tokens."""
    calls = {"netology": 0, "lms": 0}

    async def fake_auth_netology(username, password, timeout=15):
        calls["netology"] += 1
        if password == "wrong":
            raise HTTPException(detail="Netology error.", status_code=status.HTTP_401_UNAUTHORIZED)
        return netology_schema.NetologyCookies.model_validate(
            {"_netology-on-rails_session": f"session-{calls['netology']}"},
        )

    async def fake_auth_lms(creds):
        calls["lms"] += 1
        return lms_schema.User(id=80432, token=f"lms-token-{calls['lms']}")

    monkeypatch.setattr(netology_integration, "auth_netology", fake_auth_netology)
    monkeypatch.setattr(lms_integration, "auth_lms", fake_auth_lms)
    return calls


@pytest.mark.anyio
async def test_vault_lifecycle(client, upstream_auth) -> None:
    # Not remembered yet
    response = await client.get("/api/vault/")
    assert response.json() == {"active": False, "broken": False}

    # Remember: httpOnly cookie is set, no upstream calls happen on create
    response = await client.post("/api/vault/", json=VAULT_BODY)
    assert response.status_code == 200
    assert "yac_vault" in response.cookies
    assert upstream_auth == {"netology": 0, "lms": 0}

    response = await client.get("/api/vault/")
    assert response.json() == {"active": True, "broken": False}

    # Forget: everything is gone
    response = await client.delete("/api/vault/")
    assert response.status_code == 200
    client.cookies.delete("yac_vault")
    response = await client.get("/api/vault/")
    assert response.json() == {"active": False, "broken": False}


@pytest.mark.anyio
async def test_refresh_returns_tokens_and_caches_them(client, upstream_auth) -> None:
    await client.post("/api/vault/", json=VAULT_BODY)

    response = await client.post("/api/vault/refresh")
    assert response.status_code == 200
    session = response.json()
    assert session["netology_session"] == "session-1"
    assert session["lms_token"] == "lms-token-1"
    assert session["modeus_person_id"] == VAULT_BODY["modeus_person_id"]
    assert session["calendar_ids"] == [45526, 70685]

    # Second refresh serves the cache: no new upstream calls
    response = await client.post("/api/vault/refresh")
    assert response.json()["netology_session"] == "session-1"
    assert upstream_auth["netology"] == 1

    # force=true drops the cache and re-authenticates: a dead-but-cached
    # token can't be returned again after a failed request.
    response = await client.post("/api/vault/refresh?force=true")
    assert response.json()["netology_session"] == "session-2"
    assert upstream_auth["netology"] == 2


@pytest.mark.anyio
async def test_refresh_marks_vault_broken_on_rejected_creds(client, upstream_auth, monkeypatch) -> None:
    await client.post("/api/vault/", json={
        **VAULT_BODY, "netology": {"username": "user@example.com", "password": "wrong"},
    })

    response = await client.post("/api/vault/refresh")
    assert response.status_code == 401

    response = await client.get("/api/vault/")
    assert response.json() == {"active": True, "broken": True}


@pytest.mark.anyio
async def test_refresh_without_cookie_is_unauthorized(client) -> None:
    response = await client.post("/api/vault/refresh")
    assert response.status_code == 401


@pytest.mark.anyio
async def test_subscription_from_vault_without_passwords(client, upstream_auth) -> None:
    await client.post("/api/vault/", json=VAULT_BODY)

    # No creds in body: the ICS grant is attached to the remembered vault
    response = await client.post("/api/subscription/", json={"calendar_ids": [45526]})
    assert response.status_code == 200
    url = response.json()["url"]
    assert "/api/subscription/" in url
    assert upstream_auth == {"netology": 0, "lms": 0}

    # The subscription can be deleted by its URL, the browser grant survives
    sub_path = url.split(settings.app_domain)[-1].replace("/calendar.ics", "")
    response = await client.delete(sub_path)
    assert response.json() == {"deleted": True}
    response = await client.get("/api/vault/")
    assert response.json()["active"] is True


@pytest.mark.anyio
async def test_subscription_without_creds_and_cookie_is_unauthorized(client) -> None:
    response = await client.post("/api/subscription/", json={"calendar_ids": [45526]})
    assert response.status_code == 401


@pytest.mark.anyio
async def test_subscription_path_validation_is_silent_404(client) -> None:
    # Malformed ids/secrets are rejected with a plain 404: a Path pattern
    # would raise RequestValidationError echoing the secret into logs.
    response = await client.get("/api/subscription/not-hex/short/calendar.ics")
    assert response.status_code == 404
    assert "short" not in response.text

    valid_but_unknown = "0" * 32
    response = await client.get(
        f"/api/subscription/{valid_but_unknown}/{'A' * 30}/calendar.ics",
    )
    assert response.status_code == 404


@pytest.mark.anyio
async def test_modeus_login_retries_transient_token_failures(monkeypatch) -> None:
    attempts = []

    async def flaky_attempt(username, password, timeout=15):
        attempts.append(1)
        if len(attempts) < 3:
            raise HTTPException(
                detail="Modeus error. Can't get token. Response: ",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )
        return "jwt-token"

    monkeypatch.setattr(modeus_integration, "_login_attempt", flaky_attempt)
    monkeypatch.setattr(asyncio, "sleep", _instant_sleep)

    token = await modeus_integration.login("user@study.utmn.ru", "password")
    assert token == "jwt-token"
    assert len(attempts) == 3


@pytest.mark.anyio
async def test_modeus_login_does_not_retry_wrong_credentials(monkeypatch) -> None:
    attempts = []

    async def wrong_creds_attempt(username, password, timeout=15):
        attempts.append(1)
        raise HTTPException(
            detail="Modeus error. Username/password is incorrect.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    monkeypatch.setattr(modeus_integration, "_login_attempt", wrong_creds_attempt)
    monkeypatch.setattr(asyncio, "sleep", _instant_sleep)

    with pytest.raises(HTTPException):
        await modeus_integration.login("user@study.utmn.ru", "password")
    assert len(attempts) == 1


async def _instant_sleep(_delay: float) -> None:
    return None
