"""Grades from Modeus: parsing, request flow and the remembered-users-only endpoint.

Fixtures are real "Мои результаты" responses with the personal data
replaced: every id is fake and no names are left.
"""
import datetime
import json
from collections.abc import Iterator
from typing import Any
from unittest.mock import AsyncMock, patch

import httpx
import jwt
import pytest
from fastapi import HTTPException
from starlette import status

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.grades import integration, schema
from yet_another_calendar.web.api.modeus import integration as modeus_integration
from yet_another_calendar.web.api.vault import integration as vault_integration

STUDENT_ID = "11111111-2222-3333-4444-555555555555"
PERSON_ID = "66666666-7777-8888-9999-000000000000"
PAST_SEMESTER = "00000000-0000-0000-0000-abc00000d889"  # the one the results fixtures are of
FIRST_SEMESTER = "00000000-0000-0000-0000-abc000005ccd"
VAULT_BODY = {
    "netology": {"username": "user@example.com", "password": "netology-pass"},
    "lxp": {"username": "user@study.utmn.ru", "password": "lxp-pass", "service": "test"},
    "modeus_person_id": PERSON_ID,
    "calendar_ids": [45526],
}


def _fixture(name: str) -> Any:
    with open(settings.test_parent_path / "fixtures/modeus_grades" / name, encoding="utf-8") as file:
        return json.load(file)


def _token(expires_in: datetime.timedelta = datetime.timedelta(hours=24)) -> str:
    expires = datetime.datetime.now(tz=datetime.UTC) + expires_in
    return jwt.encode({"person_id": PERSON_ID, "exp": int(expires.timestamp())}, "secret", algorithm="HS256")


PERSONS = {"_embedded": {"persons": [{"id": PERSON_ID}], "students": [
    {"id": "old-record", "personId": PERSON_ID, "learningStartDate": "2019-09-01T00:00:00",
     "learningEndDate": "2023-06-30T00:00:00"},
    {"id": STUDENT_ID, "personId": PERSON_ID, "learningStartDate": "2024-09-01T00:00:00", "learningEndDate": None},
]}}


class FakeModeus:
    """Modeus students-app answering from the fixtures and recording what was asked."""

    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []
        self.overrides: dict[str, httpx.Response] = {}
        self.responses = {
            settings.modeus_search_people_part: PERSONS,
            settings.modeus_student_card_part: _fixture("student_card.json"),
            settings.modeus_ratings_part: _fixture("ratings.json"),
            settings.modeus_attendance_rates_part: _fixture("attendance_rates.json"),
            settings.modeus_results_primary_part: _fixture("results_primary.json"),
            settings.modeus_results_secondary_part: _fixture("results_secondary.json"),
        }

    def handle(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if request.url.path in self.overrides:
            return self.overrides[request.url.path]
        if request.url.path in self.responses:
            return httpx.Response(200, json=self.responses[request.url.path])
        return httpx.Response(404, json={})

    def body(self, path: str) -> Any:
        return json.loads(next(request for request in self.requests if request.url.path == path).content)

    def session(self, token: str, timeout: int = 15) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=settings.modeus_base_url, transport=httpx.MockTransport(self.handle),
            headers={"Authorization": f"Bearer {token}"},
        )


@pytest.fixture
def modeus() -> Iterator[FakeModeus]:
    fake = FakeModeus()
    with patch.object(integration, "modeus_session", new=fake.session):
        yield fake


async def test_grades_of_a_semester(modeus: FakeModeus) -> None:
    grades = await integration.get_grades(_token(), PAST_SEMESTER)

    assert grades.period_id == PAST_SEMESTER
    assert [period.number for period in grades.periods] == [1, 2, 3, 4, 5, 6]
    assert grades.gpa == schema.Rating(score=4.2, position=11, total=110)
    assert grades.cgpa == schema.Rating(score=4.5, position=100, total=700)
    assert grades.attendance is not None and grades.attendance.present == 0.77

    reading, finance, sport = grades.courses
    assert reading.name == "Аналитическое чтение"
    # The final grade of the unit first, then the running total
    assert [(result.name, result.value) for result in reading.results] == [
        ("Итог модуля", "хор."), ("Итог текущ.", "86.00"),
    ]
    assert [result.value for result in finance.results] == ["отл.", "100.00"]
    assert sport.academic_course == "Физическая культура и спорт: элективные курсы по видам спорта"
    assert reading.attendance == schema.AttendanceRate(present=0.69, absent=0.09, undefined=0.22)

    # Lessons in time order, with their grades and attendance marks
    starts = [lesson.starts_at for lesson in reading.lessons]
    assert starts == sorted(starts)
    first = reading.lessons[0]
    assert first.starts_at == datetime.datetime(2025, 10, 2, 17, 30)
    assert first.attendance == "PRESENT"
    assert [(result.name, result.value) for result in first.results] == [
        ("Работа на учебной встрече", "1"), ("Самоанализ", "1"),
    ]
    # Each lesson carries its calendar event id, for the event card to find it
    primary = _fixture("results_primary.json")
    event_ids = {lesson["id"]: lesson["eventId"] for unit in primary["courseUnitRealizations"] for lesson in unit["lessons"]}
    assert all(lesson.event_id == event_ids[lesson.id] for course in grades.courses for lesson in course.lessons)
    assert any(lesson.event_id for course in grades.courses for lesson in course.lessons)
    absent = next(lesson for lesson in reading.lessons if lesson.attendance == "ABSENT")
    assert [result.value for result in absent.results] == ["3"]
    assert all(lesson.results or lesson.attendance for course in grades.courses for lesson in course.lessons)


async def test_grades_requests_mirror_the_modeus_page(modeus: FakeModeus) -> None:
    await integration.get_grades(_token(), PAST_SEMESTER)

    assert modeus.body(settings.modeus_search_people_part) == {"id": [PERSON_ID], "size": 10}
    card_request = next(r for r in modeus.requests if r.url.path == settings.modeus_student_card_part)
    assert card_request.method == "GET"
    assert card_request.url.params["studentId"] == STUDENT_ID  # the ongoing record, not the old one
    assert modeus.body(settings.modeus_results_primary_part) == {
        "personId": PERSON_ID,
        "withMidcheckModulesIncluded": False,
        "aprId": PAST_SEMESTER,
        "studentId": STUDENT_ID,
        "curriculumFlowId": "00000000-0000-0000-0000-abc000001eef",
        "curriculumPlanId": "00000000-0000-0000-0000-abc000003dde",
    }
    secondary = modeus.body(settings.modeus_results_secondary_part)
    assert len(secondary["courseUnitRealizationId"]) == 3
    assert secondary["studentId"] == STUDENT_ID and secondary["personId"] == PERSON_ID
    assert len(modeus.body(settings.modeus_ratings_part)["aprId"]) == 6


async def test_ratings_and_attendance_failures_keep_the_grades(modeus: FakeModeus) -> None:
    modeus.overrides[settings.modeus_ratings_part] = httpx.Response(500, json={})
    modeus.overrides[settings.modeus_attendance_rates_part] = httpx.Response(200, json={"unexpected": True})

    grades = await integration.get_grades(_token(), PAST_SEMESTER)

    assert grades.gpa is None and grades.cgpa is None and grades.attendance is None
    assert len(grades.courses) == 3


async def test_results_table_failure_is_an_error(modeus: FakeModeus) -> None:
    modeus.overrides[settings.modeus_results_primary_part] = httpx.Response(500, json={})

    with pytest.raises(httpx.HTTPStatusError):
        await integration.get_grades(_token(), PAST_SEMESTER)


async def test_rejected_token_is_401(modeus: FakeModeus) -> None:
    modeus.overrides[settings.modeus_search_people_part] = httpx.Response(401, json={})

    with pytest.raises(HTTPException) as exc_info:
        await integration.get_grades(_token(), PAST_SEMESTER)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


async def test_unknown_semester_is_404(modeus: FakeModeus) -> None:
    with pytest.raises(HTTPException) as exc_info:
        await integration.get_grades(_token(), "no-such-semester")
    assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND


async def test_retry_logs_in_again_once_on_401() -> None:
    tokens: list[bool] = []

    async def get_token(force: bool) -> str:
        tokens.append(force)
        return "fresh" if force else "cached"

    grades = schema.GradesResponse()
    fake_get_grades = AsyncMock(side_effect=[HTTPException(status_code=401), grades])
    with patch.object(integration, "get_grades", new=fake_get_grades):
        assert await integration.get_grades_with_retry(get_token, None) is grades

    assert tokens == [False, True]
    assert [call.args[0] for call in fake_get_grades.await_args_list] == ["cached", "fresh"]


@pytest.mark.parametrize("today, expected", [
    (datetime.date(2025, 10, 1), 3),   # inside a semester
    (datetime.date(2026, 2, 9), 4),    # its first day
    (datetime.date(2024, 8, 1), 1),    # before the studies: the first one
    (datetime.date(2030, 1, 1), 6),    # after all of them: the last one started
])
def test_current_semester(today: datetime.date, expected: int) -> None:
    card = schema.StudentCard.model_validate(_fixture("student_card.json"))
    period = card.pick_period(None, today)
    assert period is not None and period.number == expected


def test_pick_student_id() -> None:
    people = schema.PersonsSearchResponse.model_validate(PERSONS)
    assert people.pick_student_id(PERSON_ID) == STUDENT_ID
    assert schema.PersonsSearchResponse.model_validate({}).pick_student_id(PERSON_ID) is None


# --- Endpoint ------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _pepper(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ics_pepper", "test-pepper")


@pytest.fixture
def modeus_login(monkeypatch: pytest.MonkeyPatch) -> AsyncMock:
    login = AsyncMock(side_effect=lambda username, password: _token())
    monkeypatch.setattr(modeus_integration, "login", login)
    return login


async def test_grades_need_remember_me(client, modeus: FakeModeus) -> None:
    response = await client.get("/api/grades/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert modeus.requests == []


async def test_grades_endpoint_logs_in_once_and_caches_the_token(
        client, modeus: FakeModeus, modeus_login: AsyncMock, fake_redis_pool,
) -> None:
    await client.post("/api/vault/", json=VAULT_BODY)

    response = await client.get("/api/grades/", params={"period_id": PAST_SEMESTER})
    assert response.status_code == 200
    assert response.json()["period_id"] == PAST_SEMESTER
    assert len(response.json()["courses"]) == 3
    response = await client.get("/api/grades/", params={"period_id": PAST_SEMESTER})
    assert response.status_code == 200

    # Logged in with the remembered university login, once
    modeus_login.assert_awaited_once_with("user@study.utmn.ru", "lxp-pass")
    # The cached token is encrypted: no JWT in redis
    from redis.asyncio import Redis
    async with Redis(connection_pool=fake_redis_pool) as redis:
        keys = [key async for key in redis.scan_iter("vault_modeus_token:*")]
        assert len(keys) == 1
        assert b"eyJ" not in await redis.get(keys[0])

    # Forgetting the browser forgets the token too
    await client.delete("/api/vault/")
    async with Redis(connection_pool=fake_redis_pool) as redis:
        assert [key async for key in redis.scan_iter("vault_modeus_token:*")] == []


async def test_grades_endpoint_relogs_in_when_modeus_rejects_the_token(
        client, modeus: FakeModeus, modeus_login: AsyncMock,
) -> None:
    await client.post("/api/vault/", json=VAULT_BODY)
    assert (await client.get("/api/grades/", params={"period_id": PAST_SEMESTER})).status_code == 200

    rejected = {"left": 1}
    handle = modeus.handle

    def reject_once(request: httpx.Request) -> httpx.Response:
        if rejected["left"]:
            rejected["left"] -= 1
            modeus.requests.append(request)
            return httpx.Response(401, json={})
        return handle(request)

    modeus.handle = reject_once  # type: ignore[method-assign]
    response = await client.get("/api/grades/", params={"period_id": PAST_SEMESTER})

    assert response.status_code == 200
    assert modeus_login.await_count == 2


async def test_grades_endpoint_rejected_password_is_403(
        client, modeus: FakeModeus, monkeypatch: pytest.MonkeyPatch,
) -> None:
    await client.post("/api/vault/", json=VAULT_BODY)
    monkeypatch.setattr(modeus_integration, "login", AsyncMock(side_effect=HTTPException(
        detail="Modeus error. Username/password is incorrect.", status_code=401,
    )))

    response = await client.get("/api/grades/")

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert modeus.requests == []


async def test_grades_endpoint_modeus_down_is_502(client, modeus: FakeModeus, modeus_login: AsyncMock) -> None:
    await client.post("/api/vault/", json=VAULT_BODY)
    modeus.overrides[settings.modeus_results_primary_part] = httpx.Response(503, json={})

    response = await client.get("/api/grades/", params={"period_id": PAST_SEMESTER})

    assert response.status_code == status.HTTP_502_BAD_GATEWAY


async def test_cached_token_close_to_expiry_is_renewed(fake_redis_pool, modeus_login: AsyncMock) -> None:
    from redis.asyncio import Redis

    from yet_another_calendar.web.api.vault import schema as vault_schema

    vault_id, secret = await vault_integration.create_vault(
        fake_redis_pool, vault_schema.EncryptedCreds.model_validate(VAULT_BODY),
        modeus_person_id=PERSON_ID, calendar_ids=[], time_zone="Europe/Moscow", grant_kind="browser",
    )
    modeus_login.side_effect = [_token(datetime.timedelta(minutes=12)), _token()]
    async with Redis(connection_pool=fake_redis_pool) as redis:
        record, _, dek = await vault_integration.resolve(redis, vault_id, secret)
        first = await vault_integration.get_modeus_token(redis, vault_id, record, dek)
        # 12 minutes left: cached for 2 of them, then renewed ahead of the expiry
        assert await redis.ttl(vault_integration.MODEUS_TOKEN_KEY.format(vault_id=vault_id)) <= 2 * 60
        await redis.delete(vault_integration.MODEUS_TOKEN_KEY.format(vault_id=vault_id))
        second = await vault_integration.get_modeus_token(redis, vault_id, record, dek)
        assert second != first
        assert await vault_integration.get_modeus_token(redis, vault_id, record, dek) == second
    assert modeus_login.await_count == 2


def test_ungraded_zero_is_not_shown() -> None:
    """Before anything is graded Modeus shows "Итог текущ. 0.00" that was never stored: not a grade."""
    table = schema.ResultsTable.model_validate({"courseUnitRealizations": [{"id": "unit", "name": "Курс"}]})
    control = {"courseUnitRealizationId": "unit", "typeCode": "CURRENT_COURSE_UNIT_RESULT", "typeName": "Итог текущ."}
    placeholder = schema.ResultsDetails.model_validate({"courseUnitRealizationControlObjects": [
        {**control, "resultCurrent": {"id": None, "resultValue": "0.00", "updatedTs": None}},
    ]})
    real_zero = schema.ResultsDetails.model_validate({"courseUnitRealizationControlObjects": [
        {**control, "resultCurrent": {"id": "r1", "resultValue": "0.00", "updatedTs": "2026-01-20T12:57:02"}},
    ]})

    assert integration.build_course_grades(table, placeholder)[0].results == []
    assert [result.value for result in integration.build_course_grades(table, real_zero)[0].results] == ["0.00"]


# --- Netology --------------------------------------------------------------------

NETOLOGY_HEADERS = {"_netology-on-rails_session": "session"}
MULTITHREADING = 86895  # the program whose "all homework" page the fixture is


@pytest.fixture
def netology(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """Netology answering from the fixtures: the homework list loads for one program only."""
    from yet_another_calendar.web.api.netology import integration as netology_integration

    state: dict[str, Any] = {"calls": [], "fail": {}}
    answers = {
        settings.netology_student_calendar_part: _fixture("netology_student_calendar.json"),
        settings.netology_student_actual_part: _fixture("netology_student_actual.json"),
        settings.netology_program_homework_part.format(program_id=MULTITHREADING):
            _fixture("netology_program_homework.json"),
    }

    async def send_request(cookies, request_settings, timeout=15):
        url = request_settings["url"]
        state["calls"].append((url, timeout, cookies.rails_session, request_settings.get("params")))
        if url in state["fail"]:
            raise state["fail"][url]
        if url not in answers:
            raise httpx.ConnectError("no answer")
        return answers[url]

    monkeypatch.setattr(netology_integration, "send_request", send_request)
    return state


async def test_netology_grades(client, netology: dict[str, Any]) -> None:
    response = await client.get("/api/grades/netology/", headers=NETOLOGY_HEADERS)

    assert response.status_code == 200
    grades = schema.NetologyGradesResponse.model_validate(response.json())
    # The latest semester first; a program without homework is left out
    assert [(program.semester, program.done, len(program.tasks), program.complete) for program in grades.programs] == [
        (5, 6, 9, True), (3, 1, 2, False), (2, 1, 2, False),
    ]

    # The full list: self-study homework sent counts as done, links lead to the task
    multithreading = grades.programs[0]
    assert [task.status for task in multithreading.tasks] == [
        "submitted", "submitted", "submitted", "submitted", "submitted", "submitted", None, None, None,
    ]
    first = multithreading.tasks[0]
    assert first.url == "https://netology.ru/profile/program/bhebdps-24-tpm-5/lessons/659406/lesson_items/3540292"
    # From the title "(дедлайн 09.09.2026)": the end of that day in Moscow, like real deadlines
    assert first.deadline == datetime.datetime(2026, 9, 9, 20, 59, 59, tzinfo=datetime.UTC)
    final = multithreading.tasks[-1]
    assert (final.task_type, final.deadline) == (
        "common", datetime.datetime(2026, 11, 8, 20, 59, 59, tzinfo=datetime.UTC),
    )

    # Where the list failed the summary stands in: reviewed homework only
    assert [(task.status, task.score) for task in grades.programs[1].tasks] == [("accepted", "good"), ("rework", None)]
    assert [task.status for task in grades.programs[2].tasks] == ["accepted", None]

    assert grades.feedback is not None and grades.feedback.content == "Задание принято. Хорошая работа."
    assert "expert" not in response.json()["feedback"]  # no expert names

    calls = {url: (timeout, session, params) for url, timeout, session, params in netology["calls"]}
    assert calls[settings.netology_student_calendar_part][0] == 30
    homework_params = calls[settings.netology_program_homework_part.format(program_id=MULTITHREADING)][2]
    assert [value for _, value in homework_params] == list(settings.netology_homework_resource_types)
    assert {session for _, session, _ in calls.values()} == {"session"}
    # Every program is asked for its list: the summary misses lessons of some of them
    asked = {url for url in calls if "lesson_items" in url}
    assert asked == {settings.netology_program_homework_part.format(program_id=program_id)
                     for program_id in (86895, 66064, 50489, 56076, 45526)}


async def test_netology_grades_survive_feedback_failure(client, netology: dict[str, Any]) -> None:
    netology["fail"][settings.netology_student_actual_part] = httpx.ReadTimeout("slow")

    response = await client.get("/api/grades/netology/", headers=NETOLOGY_HEADERS)

    assert response.status_code == 200
    assert response.json()["feedback"] is None
    assert len(response.json()["programs"]) == 3


@pytest.mark.parametrize("error, expected", [
    (HTTPException(detail="Netology error. Cookies expired.", status_code=401), 401),
    (httpx.ConnectError("down"), 502),
])
async def test_netology_grades_errors(client, netology: dict[str, Any], error: Exception, expected: int) -> None:
    netology["fail"][settings.netology_student_calendar_part] = error

    response = await client.get("/api/grades/netology/", headers=NETOLOGY_HEADERS)

    assert response.status_code == expected


@pytest.mark.parametrize("item, expected", [
    ({"type": "task", "lesson_task": {"task_type": "common", "homework": {"status": "accepted"}}}, "accepted"),
    ({"type": "task", "lesson_task": {"task_type": "common", "homework": {"solutions": [{"id": 1}]}}}, "review"),
    ({"type": "task", "passed": True, "lesson_task": {"task_type": "independent", "homework": {}}}, "submitted"),
    ({"type": "test", "passed": True}, "passed"),
    ({"type": "task", "passed": False, "lesson_task": {"task_type": "independent"}}, None),
])
def test_homework_status(item: dict[str, Any], expected: str | None) -> None:
    assert schema.homework_status(schema.NetologyLessonItem.model_validate({"id": 1, **item})) == expected


def test_netology_semester_is_read_from_the_title() -> None:
    calendar = schema.NetologyStudentCalendar.model_validate({"programs": [
        {"title": "12 семестр: Диплом", "lesson_items": [{"id": 1, "type": "task", "title": "ДЗ"}]},
        {"title": "Бэкенд-разработка", "lesson_items": [{"id": 2, "type": "task", "title": "ДЗ"}]},
    ]})
    grades = schema.NetologyGradesResponse.build(calendar, {}, None)
    assert [program.semester for program in grades.programs] == [12, None]
    assert grades.programs[0].tasks[0].status is None
