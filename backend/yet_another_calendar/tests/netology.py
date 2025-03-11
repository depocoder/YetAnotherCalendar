import datetime
import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from pydantic import ValidationError
from starlette import status

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.netology import integration, schema

mock_cookies = schema.NetologyCookies.model_validate({"_netology-on-rails_session": "aboba"})


def handler(request: httpx.Request) -> httpx.Response:  # noqa: PLR0911
    match request.url.path:
        case '/backend/api/user/programs/calendar/filters/not-auth':
            return httpx.Response(401, json={"text": "Not authorized"})
        case '/backend/api/user/programs/calendar/filters':
            return httpx.Response(200, json={"ok": True})
        case '/backend/api/user/sign_in':
            return httpx.Response(201, json={"ok": True})
        case '/backend/api/server_problem':
            return httpx.Response(500, json={})
        case '/backend/api/unauthorized':
            return httpx.Response(404, json={"detail": "Not Found"})
        case '/backend/api/unknown':
            return httpx.Response(404, json={"detail": "Not Found"})
        case '/backend/api/user/programs/45526/schedule':
            with open(settings.test_parent_path / 'fixtures/program_45526.json') as f:
                response_json = json.load(f)
                return httpx.Response(200, json=response_json)
        case '/backend/api/user/programs/57604/schedule':
            with open(settings.test_parent_path / 'fixtures/program_57604.json') as f:
                response_json = json.load(f)
                return httpx.Response(200, json=response_json)
        case '/backend/api/user/programs/2/schedule':
            return httpx.Response(404, json={})
        case '/backend/api/user/professions/45526/schedule':
            with open(settings.test_parent_path / 'fixtures/profession.json') as f:
                response_json = json.load(f)
                return httpx.Response(200, json=response_json)
        case '/backend/api/user/professions/2/schedule':
            return httpx.Response(404, json={})
        case _:
            return httpx.Response(200, json={"Azamat": 'Lox'})


transport = httpx.MockTransport(handler)


@pytest.mark.asyncio
async def test_send_request_unauthorized() -> None:
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/user/programs/calendar/filters/not-auth'}
    client = AsyncClient(http2=True, base_url=settings.netology_base_url, transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        with pytest.raises(HTTPException) as exc_info:
            await integration.send_request(mock_cookies, mock_request_settings)

    assert exc_info.value.detail == "Netology error. Cookies expired."
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
async def test_send_request_unknown() -> None:
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/unknown'}

    client = AsyncClient(http2=True, base_url=settings.netology_base_url, transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await integration.send_request(mock_cookies, mock_request_settings)

        assert exc_info.type is httpx.HTTPStatusError
        assert exc_info.value.response.status_code == 404
        assert exc_info.value.response.json() == {"detail": "Not Found"}


@pytest.mark.asyncio
async def test_send_request_server_error() -> None:
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/server_problem'}

    client = AsyncClient(http2=True, base_url=settings.netology_base_url, transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await integration.send_request(mock_cookies, mock_request_settings)

        assert exc_info.type is httpx.HTTPStatusError
        assert exc_info.value.response.status_code == 500


@pytest.mark.asyncio
async def test_send_request_ok() -> None:
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/user/programs/calendar/filters'}

    client = AsyncClient(http2=True, base_url=settings.netology_base_url, transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        response_json = await integration.send_request(mock_cookies, mock_request_settings)

        assert response_json == {"ok": True}


@pytest.mark.asyncio
async def test_auth_netology_unauthorized() -> None:
    mock_response = AsyncMock()
    mock_response.status_code = status.HTTP_401_UNAUTHORIZED

    mock_client = AsyncMock(spec=AsyncClient)
    mock_client.post.return_value = mock_response

    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient.__aenter__", return_value=mock_client):
        with pytest.raises(HTTPException) as exc_info:
            await integration.auth_netology("alex", "password12345")

    assert exc_info.value.detail == "Netology error. Username/password is incorrect."
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
async def test_auth_netology_ok() -> None:
    client = AsyncClient(http2=True, base_url=settings.netology_base_url, transport=transport)
    client.cookies = httpx.Cookies({"_netology-on-rails_session": "aboba"})
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        netology_cookies = await integration.auth_netology("alex", "password12345")
        assert netology_cookies == schema.NetologyCookies.model_validate(client.cookies)


@pytest.mark.asyncio
async def test_get_events_by_id_not_found() -> None:
    client = AsyncClient(http2=True, base_url=settings.netology_base_url, transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await integration.get_events_by_id(mock_cookies, 2)

        assert exc_info.value.response.status_code == 404


@pytest.mark.asyncio
async def test_get_events_by_id_ok() -> None:
    client = AsyncClient(http2=True, base_url=settings.netology_base_url, transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        calendar_response = await integration.get_events_by_id(mock_cookies, 45526)
        assert calendar_response.model_dump().get("block_title") == \
               "Бакалавриат Разработка IT-продуктов и информационных систем"


@pytest.mark.asyncio
async def test_get_program_ids_not_found() -> None:
    client = AsyncClient(http2=True, base_url=settings.netology_base_url, transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await integration.get_program_ids(mock_cookies, 2)

        assert exc_info.value.response.status_code == 404


@pytest.mark.asyncio
async def test_get_program_ids_ok() -> None:
    client = AsyncClient(http2=True, base_url=settings.netology_base_url, transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        lessons_ids = await integration.get_program_ids(mock_cookies, 45526)

        assert lessons_ids == {57604}


@pytest.mark.asyncio
async def test_get_calendar_not_found() -> None:
    client = AsyncClient(http2=True, base_url=settings.netology_base_url, transport=transport)
    modeus_time_body = schema.ModeusTimeBody.model_validate({
        "timeMin": "2024-09-23T00:00:00+00:00",
        "timeMax": "2024-09-29T23:59:59+00:00",
    })

    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await integration.get_calendar(mock_cookies, 2, modeus_time_body)

        assert exc_info.value.response.status_code == 404


@pytest.mark.asyncio
async def test_modeus_time_body() -> None:
    with pytest.raises(ValidationError) as exc_info:
        schema.ModeusTimeBody.model_validate({
            "timeMin": "2024-09-23T00:00:00+03:00",
            "timeMax": "2028-09-10T23:59:59+03:00",
        })

    assert "2 validation errors for ModeusTimeBody" in str(exc_info.value)
    assert "Time must be UTC" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        schema.ModeusTimeBody.model_validate({
            "timeMin": "2024-09-23T15:34:53+00:00",
            "timeMax": "2028-09-10T23:56:54+00:00",
        })

    assert "2 validation errors for ModeusTimeBody" in str(exc_info.value)
    assert "Time must me 00:00:00" in str(exc_info.value)
    assert "Time must me 23:59:59" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        schema.ModeusTimeBody.model_validate({
            "timeMin": "2024-09-24T15:34:53+00:00",
            "timeMax": "2028-09-11T23:59:59+00:00",
        })

    assert "2 validation errors for ModeusTimeBody" in str(exc_info.value)
    assert "Weekday time_min must be Monday" in str(exc_info.value)
    assert "Weekday time_min must be Sunday" in str(exc_info.value)


@pytest.mark.asyncio
async def test_get_calendar_ok() -> None:
    client = AsyncClient(http2=True, base_url=settings.netology_base_url, transport=transport)
    modeus_time_body = schema.ModeusTimeBody.model_validate({
        "timeMin": "2024-09-23T00:00:00+00:00",
        "timeMax": "2028-09-10T23:59:59+00:00",
    })

    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient.__aenter__", return_value=client):
        serialized_events = await integration.get_calendar(mock_cookies, 45526, modeus_time_body)

        assert len(serialized_events.homework) == 2
        assert len(serialized_events.webinars) == 2



@pytest.mark.asyncio
async def test_courses_response_schema():
    with open(settings.test_parent_path / "fixtures/course_response_schema.json") as f:
        programs_json = json.load(f)

    courses_response = schema.CoursesResponse.model_validate(programs_json)
    utmn_program = courses_response.get_utmn_program()

    assert len(json.loads(courses_response.model_dump_json())["programs"]) == 3
    assert utmn_program.id == 2
    assert utmn_program.type == "course"
    assert settings.netology_course_name in utmn_program.title


@pytest.mark.asyncio
async def test_lesson_webinar_schema():
    lesson_webinar = schema.LessonWebinar.model_validate({
        "id": 242,
        "lesson_id": 245,
        "type": "course",
        "title": "Aboba",
        "block_title": "ABOBA",
        "starts_at": datetime.datetime(2025, 3, 11, 10, 0),
        "ends_at": datetime.datetime(2025, 3, 11, 16, 0)
    })

    time_within_range = {
        "time_min": datetime.datetime(2025, 3, 11, 10, 0),
        "time_max": datetime.datetime(2025, 3, 11, 16, 0)
    }
    assert lesson_webinar.is_suitable_time(**time_within_range)

    time_starts_before_range = {
        "time_min": datetime.datetime(2025, 3, 11, 11, 0),
        "time_max": datetime.datetime(2025, 3, 11, 17, 0)
    }
    assert not lesson_webinar.is_suitable_time(**time_starts_before_range)

    time_ends_after_range = {
        "time_min": datetime.datetime(2025, 3, 11, 9, 0),
        "time_max": datetime.datetime(2025, 3, 11, 15, 0)
    }
    assert not lesson_webinar.is_suitable_time(**time_ends_after_range)

    time_both_outside_range = {
        "time_min": datetime.datetime(2025, 3, 11, 11, 0),
        "time_max": datetime.datetime(2025, 3, 11, 15, 0)
    }
    assert not lesson_webinar.is_suitable_time(**time_both_outside_range)


@pytest.mark.parametrize('title,date', [
    ("Complete task by 12.03.24", (2024, 3, 12)),
    ("Final exam - No date", None),
    ("Project submission by 45.03.24", None),
    ("Submit by 00.04.24", (2024, 4, 1)),
    ("Submit by 00..04..24", (2024, 4, 1)),
])
@pytest.mark.asyncio
async def test_lesson_task_schema_validation(title, date):
    base_data = {
        "id": 1,
        "lesson_id": 101,
        "type": "homework",
        "title": "",
        "block_title": "DevOps Basics",
        "path": "/tasks/docker-setup"
    }
    data_valid_date_in_title = base_data.copy()
    data_valid_date_in_title["title"] = title
    validated_data = schema.LessonTask.model_validate(data_valid_date_in_title)
    if date:
        excepted_deadline = datetime.datetime(*date).astimezone(datetime.timezone.utc)
    else:
        excepted_deadline = None
    assert validated_data.url == settings.netology_base_url + validated_data.path
    assert validated_data.deadline == excepted_deadline


@pytest.mark.asyncio
async def test_lesson_task_schema_suitable_time():
    lesson_task = schema.LessonTask.model_validate({
        "id": 1,
        "lesson_id": 101,
        "type": "homework",
        "title": "",
        "block_title": "DevOps Basics",
        "path": "/tasks/docker-setup",
        "deadline": datetime.datetime(2025, 3, 15, 12, 0)
    })

    time_deadline_within_range = {
        "time_min": datetime.datetime(2025, 3, 14, 12, 0),
        "time_max": datetime.datetime(2025, 3, 16, 12, 0)
    }
    assert lesson_task.is_suitable_time(**time_deadline_within_range)

    time_deadline_before_range = {
        "time_min": datetime.datetime(2025, 3, 16, 12, 0),
        "time_max": datetime.datetime(2025, 3, 17, 12, 0)
    }
    assert not lesson_task.is_suitable_time(**time_deadline_before_range)

    time_deadline_after_range = {
        "time_min": datetime.datetime(2025, 3, 13, 12, 0),
        "time_max": datetime.datetime(2025, 3, 14, 12, 0)
    }
    assert not lesson_task.is_suitable_time(**time_deadline_after_range)

    lesson_task.deadline = None
    assert not lesson_task.is_suitable_time(**time_deadline_within_range)