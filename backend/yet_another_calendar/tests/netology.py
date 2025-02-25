import json

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from httpx import AsyncClient
from starlette import status
from fastapi import HTTPException
from pydantic import ValidationError

from yet_another_calendar.web.api.netology import integration
from yet_another_calendar.web.api.netology.schema import (
    NetologyCookies,
    ModeusTimeBody,
)
from yet_another_calendar.settings import settings


mock_cookies = NetologyCookies.model_validate({"_netology-on-rails_session": "aboba"})


def handler(request: httpx.Request) -> httpx.Response:  # noqa: PLR0911
    match request.url.path:
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
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/user/programs/calendar/filters'}
    mock_response = AsyncMock()
    mock_response.status_code = status.HTTP_401_UNAUTHORIZED

    mock_client = AsyncMock(spec=AsyncClient)
    mock_client.request.return_value = mock_response

    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=mock_client):
        with pytest.raises(HTTPException) as exc_info:
            await integration.send_request(mock_cookies, mock_request_settings)

    assert exc_info.value.detail == "Netology error. Cookies expired."
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    mock_client.request.assert_called_once_with(**mock_request_settings)


@pytest.mark.asyncio
async def test_send_request_unknown() -> None:
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/unknown'}

    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await integration.send_request(mock_cookies, mock_request_settings)

        assert exc_info.type is httpx.HTTPStatusError
        assert exc_info.value.response.status_code == 404
        assert exc_info.value.response.text == '{"detail": "Not Found"}'


@pytest.mark.asyncio
async def test_send_request_server_error() -> None:
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/server_problem'}
    
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await integration.send_request(mock_cookies, mock_request_settings)

        assert exc_info.type is httpx.HTTPStatusError
        assert exc_info.value.response.status_code == 500


@pytest.mark.asyncio
async def test_send_request_ok() -> None:
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/user/programs/calendar/filters'}

    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        response_json = await integration.send_request(mock_cookies, mock_request_settings)

        assert response_json == {"ok": True}


@pytest.mark.asyncio
async def test_auth_netology_unauthorized() -> None:
    mock_response = AsyncMock()
    mock_response.status_code = status.HTTP_401_UNAUTHORIZED

    mock_client = AsyncMock(spec=AsyncClient)
    mock_client.post.return_value = mock_response

    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=mock_client):
        with pytest.raises(HTTPException) as exc_info:
            await integration.auth_netology("alex", "password12345")

    assert exc_info.value.detail == "Netology error. Username/password is incorrect."
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
async def test_auth_netology_ok() -> None:
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    client.cookies = httpx.Cookies({"_netology-on-rails_session": "aboba"})
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        netology_cookies = await integration.auth_netology("alex", "password12345")
        assert netology_cookies == NetologyCookies.model_validate(client.cookies)


@pytest.mark.asyncio
async def test_get_events_by_id_not_found() -> None:
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await integration.get_events_by_id(mock_cookies, 2)

        assert exc_info.value.response.status_code == 404


@pytest.mark.asyncio
async def test_get_events_by_id_ok() -> None:
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        calendar_response = await integration.get_events_by_id(mock_cookies, 45526)
        assert calendar_response.dict().get("block_title") == \
               "Бакалавриат Разработка IT-продуктов и информационных систем"


@pytest.mark.asyncio
async def test_get_program_ids_not_found() -> None:
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await integration.get_program_ids(mock_cookies, 2)

        assert exc_info.value.response.status_code == 404


@pytest.mark.asyncio
async def test_get_program_ids_ok() -> None:
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        lessons_ids = await integration.get_program_ids(mock_cookies, 45526)

        assert lessons_ids == {57604}


@pytest.mark.asyncio
async def test_get_calendar_not_found() -> None:
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    modeus_time_body = ModeusTimeBody.model_validate({
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
        ModeusTimeBody.model_validate({
            "timeMin": "2024-09-23T00:00:00+03:00",
            "timeMax": "2028-09-10T23:59:59+03:00",
        })

    assert "2 validation errors for ModeusTimeBody" in str(exc_info.value)
    assert "Time must be UTC" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        ModeusTimeBody.model_validate({
            "timeMin": "2024-09-23T15:34:53+00:00",
            "timeMax": "2028-09-10T23:56:54+00:00",
        })

    assert "2 validation errors for ModeusTimeBody" in str(exc_info.value)
    assert "Time must me 00:00:00" in str(exc_info.value)
    assert "Time must me 23:59:59" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        ModeusTimeBody.model_validate({
            "timeMin": "2024-09-24T15:34:53+00:00",
            "timeMax": "2028-09-11T23:59:59+00:00",
        })

    assert "2 validation errors for ModeusTimeBody" in str(exc_info.value)
    assert "Weekday time_min must be Monday" in str(exc_info.value)
    assert "Weekday time_min must be Sunday" in str(exc_info.value)


@pytest.mark.asyncio
async def test_get_calendar_ok() -> None:
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    modeus_time_body = ModeusTimeBody.model_validate({
        "timeMin": "2024-09-23T00:00:00+00:00",
        "timeMax": "2028-09-10T23:59:59+00:00",
    })

    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        serialized_events = await integration.get_calendar(mock_cookies, 45526, modeus_time_body)

        assert len(serialized_events.homework) == 2
        assert len(serialized_events.webinars) == 2

