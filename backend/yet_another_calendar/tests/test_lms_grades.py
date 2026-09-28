"""Points of LMS activities: the gradebook, the card endpoint and exported calendars."""
import datetime
from typing import Any
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import HTTPException

from yet_another_calendar.web.api.bulk import integration as bulk_integration
from yet_another_calendar.web.api.lms import integration, schema

LMS_HEADERS = {"lxp-token": "token", "lxp-id": "42"}
USER = schema.User(id=42, token="token")
GRADEBOOK = {"usergrades": [{"gradeitems": [
    {"itemtype": "course", "cmid": None, "graderaw": 80, "grademax": 100},
    {"itemtype": "mod", "itemmodule": "quiz", "cmid": 52549, "graderaw": 18.4, "grademax": 20,
     "gradedategraded": 1730452607, "gradeishidden": False},
    {"itemtype": "mod", "itemmodule": "assign", "cmid": 52550, "graderaw": None, "grademax": 10,
     "gradeishidden": False},
    {"itemtype": "mod", "itemmodule": "assign", "cmid": 52551, "graderaw": 5, "grademax": 5, "gradeishidden": True},
]}]}


def _module(module_id: int, course_id: int | None) -> schema.ModuleResponse:
    return schema.ModuleResponse.model_validate({
        "id": module_id, "name": "Тест", "uservisible": True, "modname": "quiz", "course_name": "Курс",
        "course_id": course_id, "dt_start": "2026-09-14T04:00:00Z", "dt_end": "2026-09-14T19:30:00Z",
        "is_completed": True,
    })


def test_gradebook_by_module() -> None:
    """Activities only (not the course total), hidden grades left out, ungraded ones keep their maximum."""
    grades = schema.CourseGradesResponse.model_validate(GRADEBOOK).by_module()

    assert set(grades) == {52549, 52550}
    assert grades[52549].text == "18,4 из 20"
    assert grades[52549].graded_at == datetime.datetime.fromtimestamp(1730452607, tz=datetime.UTC)
    assert (grades[52550].grade, grades[52550].grade_max, grades[52550].text) == (None, 10, None)


@pytest.mark.parametrize("grade, grade_max, expected", [
    (18.4, 20, "18,4 из 20"),
    (7.0, 10.0, "7 из 10"),
    (2.25, None, "2,25"),
    (0, 5, "0 из 5"),
])
def test_grade_text(grade: float, grade_max: float | None, expected: str) -> None:
    assert schema.ModuleGrade(grade=grade, grade_max=grade_max).text == expected


def test_module_response_keeps_old_cache_readable() -> None:
    """Calendars cached before the course id was kept still load."""
    module = _module(1, None)
    raw = module.model_dump(by_alias=True)
    del raw["course_id"]
    assert schema.ModuleResponse.model_validate(raw).course_id is None


async def test_modules_grades_ask_each_course_once_and_survive_a_closed_gradebook() -> None:
    calls: list[int] = []

    async def get_course_grades(user: schema.User, course_id: int) -> dict[int, schema.ModuleGrade]:
        calls.append(course_id)
        if course_id == 2321:
            raise HTTPException(detail="moodle_exception", status_code=400)
        return schema.CourseGradesResponse.model_validate(GRADEBOOK).by_module()

    modules = [_module(52549, 10), _module(52550, 10), _module(777, 2321), _module(888, None)]
    with patch.object(integration, "get_course_grades", new=get_course_grades):
        grades = await integration.get_modules_grades(USER, modules)

    assert sorted(calls) == [10, 2321]
    assert set(grades) == {52549, 52550}


async def test_lms_grades_endpoint(client) -> None:
    with patch.object(integration, "send_request", new=AsyncMock(return_value=GRADEBOOK)) as send:
        response = await client.get("/api/grades/lms/", params={"course_id": 10}, headers=LMS_HEADERS)

    assert response.status_code == 200
    assert response.json()["52549"] == {
        "grade": 18.4, "grade_max": 20.0, "graded_at": "2024-11-01T09:16:47Z", "text": "18,4 из 20",
    }
    params: dict[str, Any] = send.await_args.kwargs["request_settings"]["params"]
    assert (params["wsfunction"], params["courseid"], params["userid"]) == ("gradereport_user_get_grade_items", 10, 42)


@pytest.mark.parametrize("error, expected_status, expected_body", [
    (HTTPException(detail="moodle_exception", status_code=400), 200, {}),  # a closed gradebook
    (HTTPException(detail="Invalid token", status_code=401), 401, None),
    (httpx.ConnectError("down"), 502, None),
])
async def test_lms_grades_endpoint_errors(
        client, error: Exception, expected_status: int, expected_body: dict[str, Any] | None,
) -> None:
    with patch.object(integration, "send_request", new=AsyncMock(side_effect=error)):
        response = await client.get("/api/grades/lms/", params={"course_id": 10}, headers=LMS_HEADERS)

    assert response.status_code == expected_status
    if expected_body is not None:
        assert response.json() == expected_body


def test_describe_lms_activity() -> None:
    graded = schema.ModuleGrade(grade=18.4, grade_max=20)
    assert bulk_integration.describe_lms_activity("Тест 3", graded) == "Тест 3\n🎓 Оценка: 18,4 из 20"
    assert bulk_integration.describe_lms_activity("Тест 3", schema.ModuleGrade(grade_max=20)) == "Тест 3"
    assert bulk_integration.describe_lms_activity("Тест 3", None) == "Тест 3"
