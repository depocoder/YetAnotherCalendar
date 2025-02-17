from unittest.mock import AsyncMock, patch

import httpx
import pytest

from httpx import AsyncClient
from starlette import status
from fastapi import HTTPException

from yet_another_calendar.web.api.netology.integration import send_request
from yet_another_calendar.web.api.netology.schema import NetologyCookies


mock_cookies = NetologyCookies.model_validate({"_netology-on-rails_session": "aboba"})

async def handler(request):
    match request.url.path:
        case '/backend/api/user/programs/calendar/filters':
            return httpx.Response(200, json={"ok": True})
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
async def test_send_request_server_error():
    mock_request_settings = {'method': 'GET', 'url': '/backend/api/user/programs/calendar/filters'}
    
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", return_value=client):
        response_json = await send_request(mock_cookies, mock_request_settings)
        assert response_json == {"ok": True}
