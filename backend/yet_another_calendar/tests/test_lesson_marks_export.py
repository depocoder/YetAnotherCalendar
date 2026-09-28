"""Attendance and grades of past Modeus pairs in exported calendars, and encrypted stored feeds."""
import datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from redis.asyncio import ConnectionPool, Redis

from yet_another_calendar.settings import settings
from yet_another_calendar.tests import test_grades
from yet_another_calendar.tests.test_grades import modeus  # noqa: F401 - the fake Modeus fixture
from yet_another_calendar.tests.test_subscription_outage import SECRET, TOKENS, VAULT_ID, _record
from yet_another_calendar.web.api.bulk import integration as bulk_integration
from yet_another_calendar.web.api.bulk import schema as bulk_schema
from yet_another_calendar.web.api.grades import integration as grades_integration
from yet_another_calendar.web.api.grades import schema as grades_schema
from yet_another_calendar.web.api.subscription import integration
from yet_another_calendar.web.api.vault import integration as vault_integration

# The results fixture is a real semester; one of its lessons, attended and graded.
GRADED_EVENT = "00000000-0000-0000-0000-abc000051336"
GRADED_START = datetime.datetime(2025, 10, 2, 17, 30, tzinfo=datetime.timezone(datetime.timedelta(hours=5)))
DEK = bytes([5]) * 32  # the key _record() encrypts with
EVENT_ID = "11111111-1111-1111-1111-111111111111"
PAST = datetime.datetime(2026, 9, 21, 12, 0, tzinfo=datetime.UTC)


@pytest.fixture(autouse=True)
def _pepper(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ics_pepper", "test-pepper")


def _marks(attendance: str | None, *values: str) -> grades_schema.LessonGrades:
    return grades_schema.LessonGrades(
        id="lesson", event_id=EVENT_ID, name="Практика 3", attendance=attendance,
        results=[grades_schema.Result(name="Работа на учебной встрече", value=value) for value in values],
    )


@pytest.mark.parametrize("marks, expected", [
    (_marks("PRESENT", "5.00"), "Практика 3\n✅ Был на паре\n🎓 Работа на учебной встрече: 5"),
    (_marks("ABSENT"), "Практика 3\n❌ Не был на паре"),
    # Unmarked attendance is not "absent": nothing about it
    (_marks(None, "2.26"), "Практика 3\n🎓 Работа на учебной встрече: 2.26"),
    (_marks("SOMETHING_ELSE"), "Практика 3"),
    (None, "Практика 3"),
])
def test_describe_modeus_lesson(marks: grades_schema.LessonGrades | None, expected: str) -> None:
    assert bulk_integration.describe_modeus_lesson("Практика 3", marks) == expected


def _calendar(start: datetime.datetime) -> bulk_schema.CalendarResponse:
    return bulk_schema.CalendarResponse.model_validate({
        "netology": {"homework": [], "webinars": []},
        "utmn": {"modeus_events": [{
            "id": EVENT_ID, "name": "Практика 3", "nameShort": "П3", "description": None,
            "start": start.isoformat(), "end": (start + datetime.timedelta(hours=1, minutes=30)).isoformat(),
            "course_name": "Базы данных", "cycle_realization": "unknown", "teacher_full_name": "unknown",
            "eventId": EVENT_ID, "customLocation": "Нетология",
        }], "lms_events": []},
        "failures": [],
    })


async def test_build_ics_adds_lesson_marks() -> None:
    """Past Modeus pairs of a subscription say whether the student was there and what they got."""
    marks = AsyncMock(return_value={EVENT_ID: _marks("PRESENT", "5.00")})

    with (
        patch.object(integration.modeus_integration, "get_donor_token", new=AsyncMock(return_value="jwt")),
        patch.object(integration.bulk_integration, "get_calendar", new=AsyncMock(return_value=_calendar(PAST))),
    ):
        ics = (await integration._build_ics(_record(), TOKENS, marks)).decode()

    assert marks.await_args.args[0] == {EVENT_ID: PAST}
    unfolded = ics.replace("\r\n ", "")
    assert "✅ Был на паре" in unfolded
    assert "🎓 Работа на учебной встрече: 5" in unfolded


async def test_subscription_feed_is_stored_encrypted_and_served_from_cache(fake_redis_pool: ConnectionPool) -> None:
    """Feeds carry grades: nothing readable lands in redis, the next poll decrypts the cached one."""
    async with Redis(connection_pool=fake_redis_pool) as redis:
        await vault_integration.save_record(redis, VAULT_ID, _record())
        await redis.set(vault_integration.TOKENS_KEY.format(vault_id=VAULT_ID), TOKENS.model_dump_json())
    feed = b"BEGIN:VCALENDAR\r\nPRODID:fresh\r\nEND:VCALENDAR\r\n"
    build = AsyncMock(return_value=feed)

    with patch.object(integration, "_build_ics", new=build):
        assert await integration.get_subscription_ics(fake_redis_pool, VAULT_ID, SECRET) == feed
        assert await integration.get_subscription_ics(fake_redis_pool, VAULT_ID, SECRET) == feed

    build.assert_awaited_once()
    assert build.await_args.args[2] is not None  # the lesson marks loader
    async with Redis(connection_pool=fake_redis_pool) as redis:
        for key in (integration._CACHE_KEY, integration._LAST_KEY):
            stored = await redis.get(key.format(vault_id=VAULT_ID))
            assert stored.startswith(integration._SEALED)
            assert b"VCALENDAR" not in stored


def test_unseal() -> None:
    sealed = integration._seal(DEK, b"feed")
    assert integration._unseal(DEK, sealed) == b"feed"
    assert integration._unseal(b"\x06" * 32, sealed) is None  # another vault's key
    assert integration._unseal(DEK, b"BEGIN:VCALENDAR") == b"BEGIN:VCALENDAR"  # cached before encryption
    assert integration._unseal(DEK, None) is None


async def test_lesson_marks_reads_the_semester_of_past_events(modeus: test_grades.FakeModeus) -> None:
    starts = {
        GRADED_EVENT: GRADED_START,
        "future-event": datetime.datetime.now(tz=datetime.UTC) + datetime.timedelta(days=3),
    }

    marks = await grades_integration.lesson_marks(test_grades._token(), starts)

    assert list(marks) == [GRADED_EVENT]
    assert marks[GRADED_EVENT].attendance == "PRESENT"
    assert [result.value for result in marks[GRADED_EVENT].results] == ["1", "1"]
    # Only what the marks need: no GPA ratings, no semester attendance
    asked = {request.url.path for request in modeus.requests}
    assert settings.modeus_ratings_part not in asked
    assert settings.modeus_attendance_rates_part not in asked


async def test_lesson_marks_skip_modeus_without_past_events(modeus: test_grades.FakeModeus) -> None:
    future = datetime.datetime.now(tz=datetime.UTC) + datetime.timedelta(days=3)
    assert await grades_integration.lesson_marks(test_grades._token(), {"event": future}) == {}
    assert modeus.requests == []


async def test_vault_lesson_marks_relogs_in_once_on_a_rejected_token() -> None:
    tokens: list[bool] = []

    async def get_token(force: bool) -> str:
        tokens.append(force)
        return "fresh" if force else "cached"

    marks = AsyncMock(side_effect=[HTTPException(status_code=401), {"event": _marks("PRESENT")}])
    with patch.object(grades_integration, "lesson_marks", new=marks):
        result = await grades_integration.vault_lesson_marks(get_token, {"event": PAST})

    assert list(result) == ["event"]
    assert tokens == [False, True]


@pytest.mark.parametrize("failure", [
    HTTPException(detail="Modeus rejected the remembered credentials", status_code=401),
    RuntimeError("Modeus is down"),
])
async def test_vault_lesson_marks_never_fail_the_export(failure: Exception) -> None:
    get_token = AsyncMock(side_effect=failure)
    assert await grades_integration.vault_lesson_marks(get_token, {"event": PAST}) == {}
    get_token.assert_awaited_once()  # a rejected password is not tried twice


async def test_one_off_export_adds_marks_for_the_remembered_person(client, fake_redis_pool) -> None:
    """The .ics download of a remembered browser gets the marks - of that person only."""
    from yet_another_calendar.web.api.grades import views as grades_views

    await client.post("/api/vault/", json=test_grades.VAULT_BODY)
    cookie = client.cookies.get("yac_vault")
    starts = {EVENT_ID: PAST}
    loaded = AsyncMock(return_value={EVENT_ID: _marks("PRESENT")})

    with patch.object(grades_integration, "vault_lesson_marks", new=loaded):
        marks = await grades_views.remembered_lesson_marks(fake_redis_pool, cookie, test_grades.PERSON_ID, starts)
        assert list(marks) == [EVENT_ID]
        # Someone else's calendar exported from this browser: no marks
        assert await grades_views.remembered_lesson_marks(fake_redis_pool, cookie, "another-person", starts) == {}
        # No "remember me", or a cookie that no longer opens a vault
        assert await grades_views.remembered_lesson_marks(fake_redis_pool, None, test_grades.PERSON_ID, starts) == {}
        assert await grades_views.remembered_lesson_marks(
            fake_redis_pool, "0123456789abcdef.wrong-secret", test_grades.PERSON_ID, starts,
        ) == {}

    loaded.assert_awaited_once()


def _homework(**review: object) -> "bulk_integration.netology_schema.LessonTask":
    return bulk_integration.netology_schema.LessonTask.model_validate({
        "id": 1, "lesson_id": 2, "type": "task", "title": "ДЗ по теме 1", "block_title": "Многопоточность",
        "path": "/profile/program/bhebdps-24-tpm-5/lessons/2/lesson_items/1", "passed": False, **review,
    })


def test_describe_netology_homework_says_who_checks_it() -> None:
    expert = bulk_integration.describe_netology_homework(
        _homework(task_type="common", review_status="accepted", score="good", passed=True),
    )
    assert expert.split("\n") == [
        "ДЗ по теме 1",
        "🧑‍🏫 Проверяет эксперт — примет или вернет на доработку и поставит оценку",
        "Статус: принято",
        "🎓 Оценка: хорошо",
        "Практика: https://netology.ru/profile/program/bhebdps-24-tpm-5/execution/all",
    ]
    self_check = bulk_integration.describe_netology_homework(
        _homework(task_type="independent", review_status="submitted", passed=True),
    )
    assert "🔁 Самопроверка — засчитывается, как только решение отправлено, оценки не будет" in self_check
    assert "Статус: сдано" in self_check and "Оценка" not in self_check
    # Nothing sent yet: no status line, the missing ✅ in the title already says so
    pending = bulk_integration.describe_netology_homework(_homework(task_type="common", review_status=None))
    assert "Статус" not in pending
    # A calendar cached before the review was read: title and practice only
    assert bulk_integration.describe_netology_homework(_homework(review_status=None)).split("\n") == [
        "ДЗ по теме 1", "Практика: https://netology.ru/profile/program/bhebdps-24-tpm-5/execution/all",
    ]
