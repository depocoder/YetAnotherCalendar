import datetime
import json

import httpx
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from starlette import status

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api import validators
from yet_another_calendar.web.api.netology import integration, schema


mock_cookies = schema.NetologyCookies.model_validate({"_netology-on-rails_session": "aboba"})


@pytest.mark.asyncio
async def test_send_request_unauthorized(netology_bad_client) -> None:
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/user/programs/calendar/filters/not-auth'}
    with pytest.raises(HTTPException) as exc_info:
        await integration.send_request(mock_cookies, mock_request_settings)

    assert exc_info.value.detail == "Netology error. Cookies expired."
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
async def test_send_request_unknown(netology_bad_client) -> None:
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/unknown'}

    with pytest.raises(httpx.HTTPStatusError) as exc_info:
        await integration.send_request(mock_cookies, mock_request_settings)

        assert exc_info.type is httpx.HTTPStatusError
        assert exc_info.value.response.status_code == 404
        assert exc_info.value.response.json() == {"detail": "Not Found"}


@pytest.mark.asyncio
async def test_send_request_server_error(netology_bad_client) -> None:
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/server_problem'}

    with pytest.raises(httpx.HTTPStatusError) as exc_info:
        await integration.send_request(mock_cookies, mock_request_settings)

        assert exc_info.type is httpx.HTTPStatusError
        assert exc_info.value.response.status_code == 500


@pytest.mark.asyncio
async def test_send_request_ok(netology_client) -> None:
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/user/programs/calendar/filters'}

    response_json = await integration.send_request(mock_cookies, mock_request_settings)

    assert response_json == {"ok": True}


@pytest.mark.asyncio
async def test_auth_netology_unauthorized(netology_bad_client) -> None:
    netology_bad_client.cookies = httpx.Cookies({"_netology-on-rails_session": "aboba"})
    with pytest.raises(HTTPException) as exc_info:
        await integration.auth_netology("alex", "password12345")

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Netology error. Username/password is incorrect."



@pytest.mark.asyncio
async def test_auth_netology_ok(netology_client) -> None:
    netology_client.cookies = httpx.Cookies({"_netology-on-rails_session": "aboba"})
    netology_cookies = await integration.auth_netology("alex", "password12345")
    assert netology_cookies == schema.NetologyCookies.model_validate(netology_client.cookies)


@pytest.mark.asyncio
async def test_get_events_by_id_not_found(netology_bad_client) -> None:
    with pytest.raises(httpx.HTTPStatusError) as exc_info:
        await integration.get_events_by_id(mock_cookies, 2)

        assert exc_info.value.response.status_code == 404


@pytest.mark.asyncio
async def test_get_events_by_id_ok(netology_client) -> None:
    calendar_response = await integration.get_events_by_id(mock_cookies, 45526)
    assert calendar_response.model_dump().get("block_title") == \
           "Бакалавриат Разработка IT-продуктов и информационных систем"


@pytest.mark.asyncio
async def test_get_program_ids_not_found(netology_client) -> None:
    with pytest.raises(httpx.HTTPStatusError) as exc_info:
        await integration.get_program_ids(mock_cookies, 2)

        assert exc_info.value.response.status_code == 404


@pytest.mark.asyncio
async def test_get_program_ids_ok(netology_client) -> None:
    lessons_ids = await integration.get_program_ids(mock_cookies, 45526)

    assert lessons_ids == {57604}


@pytest.mark.asyncio
async def test_get_calendar_not_found(netology_client) -> None:
    modeus_time_body = schema.ModeusTimeBody.model_validate({
        "timeMin": "2024-09-23",
        "timeMax": "2024-09-29",
    })

    with pytest.raises(httpx.HTTPStatusError) as exc_info:
        await integration.get_calendar(mock_cookies, 2, modeus_time_body)

        assert exc_info.value.response.status_code == 404


@pytest.mark.asyncio
async def test_modeus_time_body() -> None:
    with pytest.raises(ValueError) as exc_info:
        schema.ModeusTimeBody.model_validate({
            "timeMin": "2025-04-29",
            "timeMax": "2025-05-04",
        })

    assert "1 validation error for ModeusTimeBody" in str(exc_info.value)

    with pytest.raises(ValueError) as exc_info:
        schema.ModeusTimeBody.model_validate({
            "timeMin": "2024-09-23",
            "timeMax": "2024-09-30",
        })

    assert "1 validation error for ModeusTimeBody" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        schema.ModeusTimeBody.model_validate({
            "timeMin": "2024-09-24",
            "timeMax": "2028-09-15",
        })

    assert "2 validation errors for ModeusTimeBody" in str(exc_info.value)
    assert "Weekday time_min must be Monday" in str(exc_info.value)
    assert "Weekday time_max must be Sunday" in str(exc_info.value)


@pytest.mark.asyncio
async def test_get_calendar_ok(netology_client) -> None:
    modeus_time_body = schema.ModeusTimeBody.model_validate({
        "timeMin": "2024-09-23",
        "timeMax": "2028-09-10",
    })

    serialized_events = await integration.get_calendar(mock_cookies, 45526, modeus_time_body)

    assert len(serialized_events.homework) == 2
    assert len(serialized_events.webinars) == 2



@pytest.mark.asyncio
async def test_courses_response_schema() -> None:
    with open(settings.test_parent_path / "fixtures/course_response_schema.json") as f:
        programs_json = json.load(f)

    courses_response = schema.CoursesResponse.model_validate(programs_json)
    utmn_program: schema.NetologyProgramId | None = courses_response.get_utmn_program()

    assert len(json.loads(courses_response.model_dump_json())["programs"]) == 3
    assert utmn_program
    assert utmn_program.id == 2
    assert utmn_program.type == "course"
    assert settings.netology_course_name in utmn_program.title


@pytest.mark.asyncio
async def test_lesson_webinar_schema() -> None:
    lesson_webinar = schema.LessonWebinar.model_validate({
        "id": 242,
        "lesson_id": 245,
        "type": "course",
        "title": "Aboba",
        "block_title": "ABOBA",
        "starts_at": datetime.datetime(2025, 3, 11, 10, 0),
        "ends_at": datetime.datetime(2025, 3, 11, 16, 0),
    })

    time_within_range = {
        "time_min": datetime.datetime(2025, 3, 11, 10, 0),
        "time_max": datetime.datetime(2025, 3, 11, 16, 0),
    }
    assert lesson_webinar.is_suitable_time(**time_within_range)

    time_starts_before_range = {
        "time_min": datetime.datetime(2025, 3, 11, 11, 0),
        "time_max": datetime.datetime(2025, 3, 11, 17, 0),
    }
    assert not lesson_webinar.is_suitable_time(**time_starts_before_range)

    time_ends_after_range = {
        "time_min": datetime.datetime(2025, 3, 11, 9, 0),
        "time_max": datetime.datetime(2025, 3, 11, 15, 0),
    }
    assert not lesson_webinar.is_suitable_time(**time_ends_after_range)

    time_both_outside_range = {
        "time_min": datetime.datetime(2025, 3, 11, 11, 0),
        "time_max": datetime.datetime(2025, 3, 11, 15, 0),
    }
    assert not lesson_webinar.is_suitable_time(**time_both_outside_range)


@pytest.mark.parametrize('title,date', [
    ("Complete task by 12.03.24", (2024, 3, 12)),
    ("Final exam - No date", None),
    ("Project submission by 45.03.24", None),
    ("Submit by 00.04.24", (2024, 4, 1)),
    ("Submit by 00..04..24", (2024, 4, 1)),
    ("Submit by 01.04.2025", (2025, 4, 1)),
])
@pytest.mark.asyncio
async def test_lesson_task_schema_validation(title: str, date: tuple[int, int, int] | None) -> None:
    validated_lesson = schema.LessonTask.model_validate({
        "id": 1,
        "lesson_id": 101,
        "type": "homework",
        "title": title,
        "block_title": "DevOps Basics",
        "path": "/tasks/docker-setup",
        "passed": True,
    })
    if date:
        excepted_deadline = datetime.datetime(*date).astimezone(datetime.UTC)
    else:
        excepted_deadline = None
    assert validated_lesson.url == settings.netology_base_url + validated_lesson.path
    assert validated_lesson.deadline == excepted_deadline


@pytest.mark.asyncio
async def test_lesson_task_schema_suitable_time() -> None:
    lesson_task = schema.LessonTask.model_validate({
        "id": 1,
        "lesson_id": 101,
        "type": "homework",
        "title": "",
        "block_title": "DevOps Basics",
        "path": "/tasks/docker-setup",
        "deadline": datetime.datetime(2025, 3, 15, 12, 0),
        "passed": True,
    })

    time_deadline_within_range = {
        "time_min": datetime.datetime(2025, 3, 14, 12, 0),
        "time_max": datetime.datetime(2025, 3, 16, 12, 0),
    }
    assert lesson_task.is_suitable_time(**time_deadline_within_range)

    time_deadline_before_range = {
        "time_min": datetime.datetime(2025, 3, 16, 12, 0),
        "time_max": datetime.datetime(2025, 3, 17, 12, 0),
    }
    assert not lesson_task.is_suitable_time(**time_deadline_before_range)

    time_deadline_after_range = {
        "time_min": datetime.datetime(2025, 3, 13, 12, 0),
        "time_max": datetime.datetime(2025, 3, 14, 12, 0),
    }
    assert not lesson_task.is_suitable_time(**time_deadline_after_range)

    lesson_task.deadline = None
    assert not lesson_task.is_suitable_time(**time_deadline_within_range)


@pytest.mark.parametrize('desc, time_min, time_max, expected_tasks, expected_webinars', [
    (
            "Lessons within range",
            datetime.datetime(2025, 3, 10, 10, 0),
            datetime.datetime(2025, 3, 20, 20, 0), # 2025-03-18T14:00:00
            ["Complete Assignment"],
            ["Live Lecture"],
    ),
    (
            "No lessons within range",
            datetime.datetime(2025, 3, 25, 0, 0),
            datetime.datetime(2025, 3, 30, 0, 0),
            [],
            [],
    ),
    (
            "Only webinar within range",
            datetime.datetime(2025, 3, 17, 0, 0),
            datetime.datetime(2025, 3, 18, 17, 0),
            [],
            ["Live Lecture"],
    ),
    (
            "Only task within range",
            datetime.datetime(2025, 3, 14, 0, 0),
            datetime.datetime(2025, 3, 16, 0, 0),
            ["Complete Assignment"],
            [],
    ),
])
@pytest.mark.asyncio
async def test_calendar_response_methods(desc: str,
                                         time_min: datetime.datetime,
                                         time_max: datetime.datetime,
                                         expected_tasks: list[str | None],
                                         expected_webinars: list[str | None]) -> None:
    with open(settings.test_parent_path / "fixtures/filter_lessons.json") as f:
        lessons = json.load(f)

    program = schema.NetologyProgram(
        lesson_items=lessons,
    )

    # Test filter_lessons()
    homework_events, webinars = schema.CalendarResponse.filter_lessons(
        block_title="DevOps Basics",
        program=program,
        time_min=time_min,
        time_max=time_max,
    )

    assert [task.title for task in homework_events] == expected_tasks, f"Failed: {desc}"
    assert [webinar.title for webinar in webinars] == expected_webinars, f"Failed: {desc}"



@pytest.mark.asyncio
async def test_extended_lesson_response_methods() -> None:
    with open(settings.test_parent_path / "fixtures/extended_lessons.json") as f:
        lessons = json.load(f)

    extended_lesson_response = schema.ExtendedLessonResponse.model_validate({
        "lesson_items": lessons,
    })

    filtered_lessons = extended_lesson_response.exclude_attachment()

    assert [lesson.title for lesson in filtered_lessons] == ["Live Lecture", "Assignment 1"]


@pytest.mark.parametrize(
    "input_date, expected_date",
    [
        (None, None),  # Test with None input
        (
            datetime.datetime(2025, 3, 20, 10, 0, tzinfo=datetime.UTC),  # Already UTC
            datetime.datetime(2025, 3, 20, 10, 0, tzinfo=datetime.UTC),  # Should remain the same
        ),
        (
            datetime.datetime(2025, 3, 20, 10, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=3))),  # UTC+3
            datetime.datetime(2025, 3, 20, 7, 0, tzinfo=datetime.UTC),  # Expected conversion to UTC
        ),
    ],
)
@pytest.mark.asyncio
async def test_detailed_program_methods(input_date: datetime.datetime, expected_date: datetime.datetime) -> None:
    program = schema.DetailedProgram.model_validate({
        "id": 1,
        "name": "DevOps Basics",
        "start_date": input_date,
    })

    assert program.start_date == expected_date


@pytest.mark.parametrize("input_dt, expected", [
    # (input, expected)
    # None input
    (None, None),

    # Naive datetime (will be converted to local time then UTC)
    (
            datetime.datetime(2023, 1, 1, 12, 0),
            datetime.datetime(2023, 1, 1, 12, 0).astimezone(datetime.UTC),
    ),

    # UTC datetime
    (
            datetime.datetime(2023, 1, 1, 12, 0, tzinfo=datetime.UTC),
            datetime.datetime(2023, 1, 1, 12, 0, tzinfo=datetime.UTC),
    ),

    # Positive offset timezone (+2 hours)
    (
            datetime.datetime(2023, 1, 1, 14, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=2))),
            datetime.datetime(2023, 1, 1, 12, 0, tzinfo=datetime.UTC),
    ),

    # Negative offset timezone (-5 hours)
    (
            datetime.datetime(2023, 1, 1, 7, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=-5))),
            datetime.datetime(2023, 1, 1, 12, 0, tzinfo=datetime.UTC),
    ),
])
def test_validate_utc_date(input_dt: datetime.datetime, expected: datetime.datetime) -> None:
    result = validators.validate_utc_date(input_dt)

    if expected is None:
        assert result is None
    else:
        assert result == expected
        assert result.tzinfo == datetime.UTC
        assert result.utcoffset() == datetime.timedelta(0)