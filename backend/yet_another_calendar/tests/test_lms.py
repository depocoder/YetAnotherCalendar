import datetime
import json
from unittest.mock import patch, AsyncMock

import httpx
import pytest
from fastapi import HTTPException
from httpx import HTTPStatusError
from pydantic import ValidationError
import copy

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.lms import integration, schema


@pytest.mark.asyncio
async def test_get_token_with_error(lms_bad_client) -> None:
    creds = schema.LxpCreds(username="ivan@utmn.ru", password="12345678", service="test")

    with pytest.raises(HTTPException) as exc_info:
        _ = await integration.get_token(creds)

    assert creds.username == "ivan@study.utmn.ru"
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Something went wrong. Server response: {'error': 'Something went wrong'}"


@pytest.mark.asyncio
async def test_get_token_ok(lms_client) -> None:
    creds = schema.LxpCreds(username="ivan@utmn.ru", password="12345678", service="test")

    token = await integration.get_token(creds)

    assert token == "token_12345"


@pytest.mark.asyncio
async def test_send_request_get_list(lms_client) -> None:
    mock_request_settings = {'method': 'GET', 'url': '/lms/send_request_list'}

    response = await integration.send_request(mock_request_settings)

    assert response == {"token": [1,2,3]}


@pytest.mark.asyncio
async def test_send_request_unknown(lms_bad_client) -> None:
    mock_request_settings = {'method': 'GET', 'url': '/lms/send_request_unknown'}

    with pytest.raises(httpx.HTTPStatusError) as exc_info:
        await integration.send_request(mock_request_settings)

        assert exc_info.type is httpx.HTTPStatusError
        assert exc_info.value.response.status_code == 404
        assert exc_info.value.response.json() == {"detail": "Not Found"}


@pytest.mark.asyncio
async def test_send_request_server_error(lms_bad_client) -> None:
    mock_request_settings = {'method': 'GET', 'url': '/lms/send_request_server_error'}

    with pytest.raises(httpx.HTTPStatusError) as exc_info:
        await integration.send_request(mock_request_settings)

        assert exc_info.type is httpx.HTTPStatusError
        assert exc_info.value.response.status_code == 500


@pytest.mark.asyncio
async def test_send_request_with_json_error(lms_bad_client) -> None:
    mock_request_settings = {'method': 'GET', 'url': settings.lms_login_part}

    with pytest.raises(HTTPException) as exc_info:
        await integration.send_request(mock_request_settings)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Something went wrong. Server response: {'error': 'Something went wrong'}"



@pytest.mark.asyncio
async def test_send_request_ok(lms_client) -> None:
    mock_request_settings = {'method': 'GET', 'url': settings.lms_login_part}

    response_json = await integration.send_request(mock_request_settings)

    assert response_json == {"token": "token_12345"}


@pytest.mark.asyncio
async def test_get_user_info_forbidden(lms_bad_client) -> None:
    with pytest.raises(httpx.HTTPStatusError) as exc_info:
        _ = await integration.get_user_info(token="token_123", username="azamat")

        assert exc_info.value.response.status_code == 403
        assert exc_info.value.response.json() == {"text": "Forbidden"}


@pytest.mark.asyncio
async def test_get_user_info_ok(lms_client) -> None:
    response_json = await integration.get_user_info(token="token_123", username="azamat")

    assert response_json == [{"name": "azamat"}]


@pytest.mark.asyncio
async def test_auth_lms_error(lms_bad_client) -> None:
    creds = schema.LxpCreds(username="ivan@utmn.ru", password="12345678", service="test")
    with pytest.raises(HTTPException) as exc_info:
        _ = await integration.auth_lms(creds)

    assert creds.username == "ivan@study.utmn.ru"
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Something went wrong. Server response: {'error': 'Something went wrong'}"


@pytest.mark.asyncio
async def test_auth_lms_ok(lms_client) -> None:
    creds = schema.LxpCreds(username="ivan@utmn.ru", password="12345678", service="test")
    with patch("yet_another_calendar.web.api.lms.integration.get_user_info",
               return_value=[{"id": "1"}]):
        user = await integration.auth_lms(creds)

    assert user.id == 1
    assert user.token == "token_12345"


@pytest.mark.asyncio
async def test_get_courses_error(lms_bad_client) -> None:
    user = schema.User(id=1, token="token_12345")
    with pytest.raises(HTTPStatusError) as exc_info:
        _ = await integration.get_courses(user)

        assert exc_info.value.response.status_code == 403
        assert exc_info.value.response.json() == {"text": "Forbidden"}


@pytest.mark.asyncio
async def test_get_courses_ok(lms_bad_client) -> None:
    user = schema.User(id=1, token="token_12345")
    with patch("yet_another_calendar.web.api.lms.integration.send_request",
               new_callable=AsyncMock) as mock_send:
        mock_send.return_value = json.load(open(settings.test_parent_path / "fixtures/courses_schema_lms.json"))
        response = await integration.get_courses(user)

    assert len(response) == 5
    assert response[0].id == 1
    assert response[1].short_name == "phys201"
    assert response[4].full_name == "English 210: Academic Writing"


@pytest.mark.asyncio
async def test_get_extended_courses_error(lms_bad_client) -> None:
    user = schema.User(id=1, token="token_12345")
    with pytest.raises(HTTPStatusError) as exc_info:
        _ = await integration.get_extended_course(user, 1)

        assert exc_info.value.response.status_code == 403
        assert exc_info.value.response.json() == {"text": "Forbidden"}


@pytest.mark.asyncio
async def test_get_extended_courses_ok(lms_bad_client) -> None:
    user = schema.User(id=1, token="token_12345")

    with patch("yet_another_calendar.web.api.lms.integration.send_request",
               new_callable=AsyncMock) as mock_send:
        mock_send.return_value = json.load(open(settings.test_parent_path /
                                                "fixtures/extended_courses_schema_lms.json"))
        response = await integration.get_extended_course(user, 1)

    assert len(response) == 2
    assert response[0].id == 1
    assert len(response[1].modules) == 1
    assert response[1].modules[0].name == "Introduction to Pandas"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "lxp_token, lxp_id, expected_error_field",
    [
        ("valid-token", "not-an-int", "id"),          # invalid id (not int)
        (None, "123", "token"),                        # missing token (None)
        ("valid-token", None, "id"),                   # missing id (None)
        ("valid-token", "", "id"),                      # empty id string (should fail int conversion)
    ],
)
async def test_get_user_invalid_inputs(lxp_token: str, lxp_id: str, expected_error_field: str) -> None:
    with pytest.raises(ValidationError) as exc_info:
        await schema.get_user(lxp_token=lxp_token, lxp_id=lxp_id)

    assert expected_error_field in str(exc_info.value)


@pytest.mark.parametrize(
    "input_data, expected_date, should_raise",
    [
        # valid int timestamp (epoch seconds)
        ({"label": "start", "timestamp": 1717236000, "dataid": "abc"},
         datetime.datetime.fromtimestamp(1717236000, tz=datetime.UTC), False),
        # valid float timestamp
        ({"label": "start", "timestamp": 1717236000.0, "dataid": "abc"},
         datetime.datetime.fromtimestamp(1717236000.0, tz=datetime.UTC), False),
        # timestamp missing → date not set (validation should pass, date missing means error on missing required field)
        ({"label": "start", "dataid": "abc"}, None, True),
        # timestamp is None → validation passes, date missing → error on missing required field
        ({"label": "start", "timestamp": None, "dataid": "abc"}, None, True),
        # timestamp is string → should raise TypeError in validator (or convert fails)
        ({"label": "start", "timestamp": "not-a-number", "dataid": "abc"}, None, True),
        # data is not a dict → validator returns data untouched, but parsing fails (missing fields)
        ("just a string", None, True),
    ],
)
def test_deadline_validation(input_data: dict[str, str], expected_date: datetime.datetime, should_raise: bool) -> None:
    input_data = copy.deepcopy(input_data)
    if should_raise:
        with pytest.raises((ValidationError, TypeError, ValueError)):
            schema.DateModule.model_validate(input_data)
    else:
        dm = schema.DateModule.model_validate(input_data)
        # datetime equality with tz-aware: compare iso strings
        assert dm.date.isoformat() == expected_date.isoformat()


@pytest.mark.parametrize(
    "deadline, time_min, time_max, expected",
    [
        # deadline between time_min and time_max → True
        (
            datetime.datetime(2025, 6, 5, 12, 0),
            datetime.datetime(2025, 6, 1, 0, 0),
            datetime.datetime(2025, 6, 10, 0, 0),
            True,
        ),
        # deadline equal to time_min → False (strictly greater)
        (
            datetime.datetime(2025, 6, 1, 0, 0),
            datetime.datetime(2025, 6, 1, 0, 0),
            datetime.datetime(2025, 6, 10, 0, 0),
            False,
        ),
        # deadline equal to time_max → False (strictly less)
        (
            datetime.datetime(2025, 6, 10, 0, 0),
            datetime.datetime(2025, 6, 1, 0, 0),
            datetime.datetime(2025, 6, 10, 0, 0),
            False,
        ),
        # deadline less than time_min → False
        (
            datetime.datetime(2025, 5, 31, 23, 59),
            datetime.datetime(2025, 6, 1, 0, 0),
            datetime.datetime(2025, 6, 10, 0, 0),
            False,
        ),
        # deadline greater than time_max → False
        (
            datetime.datetime(2025, 6, 11, 0, 0),
            datetime.datetime(2025, 6, 1, 0, 0),
            datetime.datetime(2025, 6, 10, 0, 0),
            False,
        ),
        # deadline is None → False
        (
            None,
            datetime.datetime(2025, 6, 1, 0, 0),
            datetime.datetime(2025, 6, 10, 0, 0),
            False,
        ),
    ],
)
def test_is_suitable_time(deadline: datetime.datetime,
                          time_min: datetime.datetime,
                          time_max: datetime.datetime,
                          expected: bool) -> None:
    result = schema.ExtendedCourse.is_suitable_time(deadline, time_min, time_max)
    assert result is expected
