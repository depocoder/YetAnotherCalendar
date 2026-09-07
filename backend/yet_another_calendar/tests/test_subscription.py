import datetime

import pytest
from fastapi import HTTPException

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.bulk import schema as bulk_schema
from yet_another_calendar.web.api.subscription import integration, schema


@pytest.fixture(autouse=True)
def _pepper(monkeypatch):
    monkeypatch.setattr(settings, "ics_pepper", "test-pepper")


def _creds() -> schema.EncryptedCreds:
    return schema.EncryptedCreds.model_validate({
        "netology": {"username": "user@example.com", "password": "netology-pass"},
        "lxp": {"username": "user@study.utmn.ru", "password": "lxp-pass"},
    })


def test_encrypt_decrypt_roundtrip() -> None:
    secret = "url-secret-value"
    salt, nonce, ciphertext = integration.encrypt_creds(secret, _creds())

    meta = schema.SubscriptionMeta(
        secret_hash=integration._hash_secret(secret),
        ciphertext=ciphertext, nonce=nonce, salt=salt,
        modeus_person_id="person-id-123",
        calendar_ids=[45526],
    )
    decrypted = integration.decrypt_creds(secret, meta)

    assert decrypted == _creds()
    assert "netology-pass" not in ciphertext


def test_decrypt_with_wrong_secret_fails() -> None:
    salt, nonce, ciphertext = integration.encrypt_creds("right-secret", _creds())
    meta = schema.SubscriptionMeta(
        secret_hash=integration._hash_secret("right-secret"),
        ciphertext=ciphertext, nonce=nonce, salt=salt,
        modeus_person_id="person-id-123",
        calendar_ids=[45526],
    )

    with pytest.raises(HTTPException) as exc_info:
        integration.decrypt_creds("wrong-secret", meta)
    assert exc_info.value.status_code == 404


def test_decrypt_requires_same_pepper(monkeypatch) -> None:
    salt, nonce, ciphertext = integration.encrypt_creds("secret", _creds())
    meta = schema.SubscriptionMeta(
        secret_hash=integration._hash_secret("secret"),
        ciphertext=ciphertext, nonce=nonce, salt=salt,
        modeus_person_id="person-id-123",
        calendar_ids=[45526],
    )
    monkeypatch.setattr(settings, "ics_pepper", "another-pepper")

    with pytest.raises(HTTPException):
        integration.decrypt_creds("secret", meta)


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
