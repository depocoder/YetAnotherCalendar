import datetime

import pytest
from fastapi import HTTPException

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.bulk import schema as bulk_schema
from yet_another_calendar.web.api.subscription import integration
from yet_another_calendar.web.api.vault import integration as vault_integration
from yet_another_calendar.web.api.vault import schema as vault_schema


@pytest.fixture(autouse=True)
def _pepper(monkeypatch):
    monkeypatch.setattr(settings, "ics_pepper", "test-pepper")


def _creds() -> vault_schema.EncryptedCreds:
    return vault_schema.EncryptedCreds.model_validate({
        "netology": {"username": "user@example.com", "password": "netology-pass"},
        "lxp": {"username": "user@study.utmn.ru", "password": "lxp-pass"},
    })


def _record_with_grants(dek: bytes, secrets: dict[str, str]) -> vault_schema.VaultRecord:
    nonce, ciphertext = vault_integration.encrypt_creds(dek, _creds())
    grants = {
        grant_id: vault_integration.make_grant(secret, dek, "ics")
        for grant_id, secret in secrets.items()
    }
    return vault_schema.VaultRecord(
        creds_ciphertext=ciphertext,
        creds_nonce=nonce,
        modeus_person_id="person-id-123",
        calendar_ids=[45526],
        grants=grants,
    )


def test_envelope_roundtrip_with_two_grants() -> None:
    """One encrypted blob must be readable through every grant secret."""
    dek = b"\x01" * 32
    record = _record_with_grants(dek, {"g1": "browser-secret", "g2": "url-secret"})

    for secret in ("browser-secret", "url-secret"):
        _, grant = vault_integration.find_grant(record, secret)
        unwrapped = vault_integration.unwrap_dek(secret, grant)
        assert unwrapped == dek
        decrypted = vault_integration.decrypt_creds(unwrapped, record)
        assert decrypted == _creds()

    assert "netology-pass" not in record.creds_ciphertext


def test_wrong_secret_is_rejected() -> None:
    record = _record_with_grants(b"\x02" * 32, {"g1": "right-secret"})

    with pytest.raises(HTTPException) as exc_info:
        vault_integration.find_grant(record, "wrong-secret")
    assert exc_info.value.status_code == 404

    _, grant = vault_integration.find_grant(record, "right-secret")
    with pytest.raises(HTTPException):
        vault_integration.unwrap_dek("wrong-secret", grant)


def test_revoking_one_grant_keeps_the_other() -> None:
    dek = b"\x03" * 32
    record = _record_with_grants(dek, {"g1": "browser-secret", "g2": "url-secret"})

    grant_id, _ = vault_integration.find_grant(record, "browser-secret")
    del record.grants[grant_id]

    with pytest.raises(HTTPException):
        vault_integration.find_grant(record, "browser-secret")
    _, survivor = vault_integration.find_grant(record, "url-secret")
    assert vault_integration.unwrap_dek("url-secret", survivor) == dek


def test_unwrap_requires_same_pepper(monkeypatch) -> None:
    dek = b"\x04" * 32
    record = _record_with_grants(dek, {"g1": "secret"})
    _, grant = vault_integration.find_grant(record, "secret")

    monkeypatch.setattr(settings, "ics_pepper", "another-pepper")
    with pytest.raises(HTTPException):
        vault_integration.unwrap_dek("secret", grant)


def test_build_time_bodies_windows() -> None:
    bodies = integration.build_time_bodies(today=datetime.date(2026, 9, 9))  # Wednesday

    assert len(bodies) == settings.ics_weeks_past + settings.ics_weeks_future + 1
    first_body, current_body = bodies[0], bodies[settings.ics_weeks_past]
    assert current_body.time_min.date() == datetime.date(2026, 9, 7)  # Monday
    assert first_body.time_min.weekday() == 0
    for body in bodies:
        assert body.time_max.weekday() == 6
        assert (body.time_max - body.time_min).days == 6


def test_merge_calendars_deduplicates() -> None:
    webinar = {
        "id": 1, "lesson_id": 2, "type": "webinar", "title": "Webinar",
        "block_title": "Block",
    }
    calendar = bulk_schema.CalendarResponse.model_validate({
        "netology": {"homework": [], "webinars": [webinar]},
        "utmn": {"modeus_events": [], "lms_events": []},
    })

    merged = integration.merge_calendars([calendar, calendar])

    assert len(merged.netology.webinars) == 1
    assert merged.netology.webinars[0].id == 1


def test_build_warning_ics_from_scratch_and_from_last() -> None:
    warning_only = integration.build_warning_ics(None)
    assert b"BEGIN:VCALENDAR" in warning_only
    assert "подписка отвязана".encode() in warning_only

    extended = integration.build_warning_ics(warning_only)
    assert extended.count(b"BEGIN:VEVENT") == 2
