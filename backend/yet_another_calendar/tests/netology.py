from unittest.mock import AsyncMock, patch

import httpx
import pytest

from httpx import AsyncClient
from starlette import status
from fastapi import HTTPException

from yet_another_calendar.web.api.netology.integration import (
    send_request,
    auth_netology,
    get_events_by_id,
    get_program_ids,
    get_calendar
)
from yet_another_calendar.web.api.netology.schema import (
    NetologyCookies,
    CalendarResponse
)


mock_cookies = NetologyCookies.model_validate({"_netology-on-rails_session": "aboba"})


async def handler(request):
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
        case '/backend/api/user/programs/1/schedule':
            response_json = {
                "title": "NETOLOGY",
                "lessons": [
                    {"lesson_items": [{"rus": "234"}]}
                ]
            }
            return httpx.Response(200, json=response_json)
        case '/backend/api/user/programs/2/schedule':
            return httpx.Response(404, json={})
        case '/backend/api/user/professions/1/schedule':
            response_json = {
                "profession_modules": [
                    {
                        "program": {
                            "id": 1,
                            "name": "DevOps",
                        }
                    },
                    {
                        "program": {
                            "id": 2,
                            "name": "C++"
                        }
                    }
                ]
            }
            return httpx.Response(200, json=response_json)
        case '/backend/api/user/professions/2/schedule':
            return httpx.Response(404, json={})
        case _:
            return httpx.Response(200, json={"Azamat": 'Lox'})

transport = httpx.MockTransport(handler)


@pytest.mark.asyncio
async def test_send_request_unauthorized():
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/user/programs/calendar/filters'}
    mock_response = AsyncMock()
    mock_response.status_code = status.HTTP_401_UNAUTHORIZED

    mock_client = AsyncMock(spec=AsyncClient)
    mock_client.request.return_value = mock_response

    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=mock_client):
        with pytest.raises(HTTPException) as exc_info:
            await send_request(mock_cookies, mock_request_settings)

    assert exc_info.value.detail == "Netology error. Cookies expired."
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    mock_client.request.assert_called_once_with(**mock_request_settings)


@pytest.mark.asyncio
async def test_send_request_unknown():
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/unknown'}

    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await send_request(mock_cookies, mock_request_settings)

        assert exc_info.type is httpx.HTTPStatusError
        assert exc_info.value.response.status_code == 404
        assert exc_info.value.response.text == '{"detail": "Not Found"}'


@pytest.mark.asyncio
async def test_send_request_server_error():
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/server_problem'}
    
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await send_request(mock_cookies, mock_request_settings)

        assert exc_info.type is httpx.HTTPStatusError
        assert exc_info.value.response.status_code == 500


@pytest.mark.asyncio
async def test_send_request_ok():
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/user/programs/calendar/filters'}

    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        response_json = await send_request(mock_cookies, mock_request_settings)

        assert response_json == {"ok": True}


@pytest.mark.asyncio
async def test_auth_netology_unauthorized():
    mock_response = AsyncMock()
    mock_response.status_code = status.HTTP_401_UNAUTHORIZED

    mock_client = AsyncMock(spec=AsyncClient)
    mock_client.post.return_value = mock_response

    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=mock_client):
        with pytest.raises(HTTPException) as exc_info:
            await auth_netology("alex", "password12345")

    assert exc_info.value.detail == "Netology error. Username/password is incorrect."
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
async def test_auth_netology_ok():
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    client.cookies = {"_netology-on-rails_session": "aboba"}
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        netology_cookies = await auth_netology("alex", "password12345")
        assert netology_cookies == NetologyCookies.model_validate(client.cookies)


@pytest.mark.asyncio
async def test_get_events_by_id_not_found():
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await get_events_by_id(mock_cookies, 2)

        assert exc_info.value.response.status_code == 404


@pytest.mark.asyncio
async def test_get_events_by_id_ok():
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        calendar_response = await get_events_by_id(mock_cookies, 1)
        assert calendar_response == CalendarResponse.model_validate({
            "title": "NETOLOGY",
            "lessons": [
                {"lesson_items": [{"rus": "234"}]}
            ]
        })


@pytest.mark.asyncio
async def test_get_program_ids_not_found():
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await get_program_ids(mock_cookies, 2)

        assert exc_info.value.response.status_code == 404


@pytest.mark.asyncio
async def test_get_program_ids_ok():
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        lessons_ids = await get_program_ids(mock_cookies, 1)

        assert lessons_ids == {1, 2}


@pytest.mark.asyncio
async def test_get_calendar_not_found():
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await get_program_ids(mock_cookies, 2)

        assert exc_info.value.response.status_code == 404


@pytest.mark.asyncio
async def test_get_calendar_ok():
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        serialized_events = await get_program_ids(mock_cookies, 1)

        assert serialized_events == {1, 2}
