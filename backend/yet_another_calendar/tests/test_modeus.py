import json
import typing
from unittest.mock import patch, AsyncMock, MagicMock

import httpx
import pytest
from fastapi import HTTPException
from httpx import HTTPStatusError
from pydantic import ValidationError

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.modeus import integration, schema


@pytest.mark.asyncio
async def test_get_post_url_invalid_app_config(modeus_bad_client) -> None:
    with pytest.raises(KeyError) as exc_info:
        await integration.get_post_url(modeus_bad_client)

    assert str(exc_info.value) == "'clientId'"


@pytest.mark.asyncio
async def test_get_post_url_ok(modeus_client) -> None:
    post_url = await integration.get_post_url(modeus_client)

    assert str(post_url) == "https://fs.utmn.ru/adfs/ls?aboba=true"


@pytest.mark.asyncio
async def test_get_auth_form_bad_request(modeus_bad_client) -> None:
    with patch("yet_another_calendar.web.api.modeus.integration.get_post_url",
               return_value="https://fs.utmn.ru/bad-request"):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await integration.get_auth_form(modeus_bad_client, "ivan", "12345")

    assert exc_info.type is httpx.HTTPStatusError
    assert exc_info.value.response.status_code == 400


@pytest.mark.asyncio
async def test_get_auth_form_with_error_tag(modeus_bad_client) -> None:
    with patch("yet_another_calendar.web.api.modeus.integration.get_post_url",
               return_value="https://fs.utmn.ru/error-tag"):
        with pytest.raises(HTTPException) as exc_info:
            await integration.get_auth_form(modeus_bad_client, "ivan", "12345")

        assert exc_info.value.detail == "Modeus error. ERROR"
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_auth_form_none(modeus_bad_client) -> None:
    with patch("yet_another_calendar.web.api.modeus.integration.get_post_url",
               return_value="https://fs.utmn.ru/form-none"):
        with pytest.raises(HTTPException) as exc_info:
            await integration.get_auth_form(modeus_bad_client, "ivan", "12345")

        assert exc_info.value.detail == "Modeus error. Can't get form."
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
@typing.no_type_check
async def test_get_auth_form_ok(modeus_client) -> None:
    with patch("yet_another_calendar.web.api.modeus.integration.get_post_url",
               return_value="https://fs.utmn.ru/form-ok"):
        form = await integration.get_auth_form(modeus_client, "ivan", "12345")

        assert not form.is_empty_element
        assert form.get("action") == "/submit"
        assert form.find_all("input")[0].get("name") == "username"
        assert form.find_all("input")[1].get("name") == "password"
        assert form.find("button").text == "Login"


@pytest.mark.asyncio
@pytest.mark.skip(reason="problems with mocking response.text")
@typing.no_type_check
async def test_login_bad_request() -> None:
    # client = AsyncClient(http2=True, base_url=settings.modeus_base_url, transport=handlers.bad_request_transport)

    mock_response = MagicMock()
    mock_response.text = open(settings.test_parent_path / "fixtures/auth_form_ok.html").read()
    mock_response.raise_for_status = MagicMock()
    mock_response.status_code = 400

    mock_session = AsyncMock()
    mock_session.post.return_value = mock_response

    valid_auth_form = integration.get_auth_form(mock_session, "Azamat", "Azamat_12345")

    with patch("yet_another_calendar.web.api.modeus.integration.get_auth_form",
               return_value=valid_auth_form):
        with pytest.raises(HTTPStatusError):
            await integration.login("Azamat", "Azamat_12345")


@pytest.mark.asyncio
@pytest.mark.parametrize("url", [
    "https://example.com/page?no_token_here=true",
    "https://example.com/page?user=abc&value=123",
])
async def test_extract_token_from_url_none_return(url: str) -> None:
    # Should return None safely (no match, so broken line not reached)
    assert integration._extract_token_from_url(url) is None


@pytest.mark.asyncio
@pytest.mark.parametrize("url, expected_token", [
    ("https://example.com/callback?id_token=abc123-def456.ghi789_xyz", "abc123-def456.ghi789_xyz"),
    ("https://example.com/page?id_token=tok-en.123_456&other=1", "tok-en.123_456"),
])
async def test_extract_token_from_url_raises_typeerror(url: str, expected_token: str) -> None:
    # Match is found -> code reaches broken line -> TypeError

    assert integration._extract_token_from_url(url) == expected_token


@pytest.mark.asyncio
async def test_post_modeus_unauthorized(modeus_bad_client) -> None:
    body = schema.ModeusEventsBody.model_validate({
        "timeMin": "2024-09-23",
        "timeMax": "2024-09-29",
        "size": 50,
        "attendeePersonId": ["307ad0dd-7211-4152-b0db-d6242b6c81f0", "47124e24-1c6c-40ae-ba89-49503d8e9a3c"],
    })

    with pytest.raises(HTTPException) as exc_info:
        await integration.post_modeus("a.b.c", body, "/unauthorized")

    assert exc_info.value.detail == "Modeus token expired!"
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_post_modeus_ok(modeus_client) -> None:
    body = schema.ModeusEventsBody.model_validate({
        "timeMin": "2024-09-23",
        "timeMax": "2024-09-29",
        "size": 50,
        "attendeePersonId": ["307ad0dd-7211-4152-b0db-d6242b6c81f0", "47124e24-1c6c-40ae-ba89-49503d8e9a3c"],
    })

    response_text = await integration.post_modeus("a.b.c", body, "/ok")

    assert json.loads(response_text) == {"ok": True}


@pytest.mark.asyncio
async def test_get_events_unauthorized(modeus_bad_client) -> None:
    body = schema.ModeusEventsBody.model_validate({
        "timeMin": "2024-09-23",
        "timeMax": "2024-09-29",
        "size": 50,
        "attendeePersonId": ["307ad0dd-7211-4152-b0db-d6242b6c81f0", "47124e24-1c6c-40ae-ba89-49503d8e9a3c"],
    })

    with pytest.raises(HTTPException) as exc_info:
        _ = await integration.get_events(body, "a.b.c")

    assert exc_info.value.detail == "Modeus token expired!"
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_events_ok(modeus_client) -> None:
    body = schema.ModeusEventsBody.model_validate({
        "timeMin": "2024-09-23",
        "timeMax": "2024-09-29",
        "size": 50,
        "attendeePersonId": ["307ad0dd-7211-4152-b0db-d6242b6c81f0", "47124e24-1c6c-40ae-ba89-49503d8e9a3c"],
    })

    events = await integration.get_events(body, "a.b.c")

    assert len(events) == 5
    assert events[0].custom_location == "Нетология"
    assert str(events[1].id) == "6859c910-da4f-4ba1-954a-8017b1a13f91"
    assert not events[2].is_lxp
    assert events[3].name == "Контрольная работа 3."
    assert events[4].course_name == "Технологии анимации"


@pytest.mark.asyncio
async def test_get_people_empty_response(modeus_bad_client) -> None:
    body = schema.FullModeusPersonSearch.model_validate({
        "fullName": "Комаев Олег Азаматович",
        "sort": "+fullName",
        "size": 10,
        "page": 0,
    })

    filtered_people = await integration.get_people("a.b.c", body)

    assert filtered_people == []


@pytest.mark.asyncio
async def test_get_people_ok(modeus_client) -> None:
    body = schema.FullModeusPersonSearch.model_validate({
        "fullName": "Комаев Азамат Олегович",
        "sort": "+fullName",
        "size": 12345,
        "page": 0,
    })

    filtered_people = await integration.get_people("a.b.c", body)

    assert len(filtered_people) == 1
    assert str(filtered_people[0].id) == "d69c87c8-aece-4f39-b6a2-7b467b968211"
    assert filtered_people[0].full_name == "Комаев Азамат Олегович"
    assert filtered_people[0].specialty_code == "09.03.02"


@pytest.mark.asyncio
@pytest.mark.parametrize("username,expected", [
    ("ivan@utmn.ru", "ivan@study.utmn.ru"),
    ("ivan@study.utmn.ru", "ivan@study.utmn.ru"),
])
async def test_valid_usernames_creds(username: str, expected: str) -> None:
    creds = schema.Creds(username=username, password="secret")
    assert creds.username == expected


@pytest.mark.asyncio
@pytest.mark.parametrize("username, error_msg", [
    ("ivanutmn.ru", "Email must contain one @."),
    ("ivan@@utmn.ru", "Email must contain one @."),
    ("ivan@gmail.com", "Email must contain @study.utmn.ru."),
])
async def test_invalid_usernames_creds(username: str, error_msg: str) -> None:
    with pytest.raises(ValidationError):
        schema.Creds(username=username, password="secret")


def test_day_events_request_validation() -> None:
    """Test DayEventsRequest validation."""
    from yet_another_calendar.web.api.modeus.schema import DayEventsRequest
    import datetime

    request = DayEventsRequest(
        date=datetime.date(2024, 1, 15),
        learningStartYear=[2024],
        profileName=["Test Profile"],
        specialtyCode=["09.03.02"],
    )

    payload = request.to_search_payload()

    assert "timeMin" in payload
    assert "timeMax" in payload
    assert payload["learningStartYear"] == [2024]
    assert payload["profileName"] == ["Test Profile"]
    assert payload["specialtyCode"] == ["09.03.02"]


def test_day_events_request_defaults() -> None:
    """Test DayEventsRequest with default values."""
    from yet_another_calendar.web.api.modeus.schema import DayEventsRequest
    import datetime

    request = DayEventsRequest(
        date=datetime.date(2024, 1, 15),
        learningStartYear=[2024],
    )

    assert request.profile_name == ["Разработка IT-продуктов и информационных систем"]
    assert request.specialty_code == ["09.03.02"]


def test_day_events_request_to_search_payload() -> None:
    """Test DayEventsRequest to_search_payload method."""
    from yet_another_calendar.web.api.modeus.schema import DayEventsRequest
    import datetime

    test_date = datetime.date(2024, 1, 15)
    request = DayEventsRequest(
        date=test_date,
        learningStartYear=[2024],
        profileName=["Custom Profile"],
        specialtyCode=["Custom Code"],
    )

    payload = request.to_search_payload()

    assert payload["timeMin"] == "2024-01-15T00:00:00+00:00"
    assert payload["timeMax"] == "2024-01-15T23:59:59+00:00"
    assert payload["learningStartYear"] == [2024]
    assert payload["profileName"] == ["Custom Profile"]
    assert payload["specialtyCode"] == ["Custom Code"]


@pytest.mark.asyncio
class TestModeusIntegration:
    """Tests for the integration logic in `integration.py`."""

    async def test_get_day_events_success(self, modeus_client) -> None:
        """
        Tests successful retrieval of day events from the mocked Modeus API.
        """
        jwt = "fake-jwt-token"
        payload = {"timeMin": "2024-09-02T00:00:00Z"}
        events = await integration.get_day_events(jwt, payload)

        assert len(events) == 6
