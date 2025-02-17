from unittest.mock import AsyncMock, patch
import pytest

from httpx import AsyncClient
from starlette import status
from fastapi import HTTPException

from yet_another_calendar.web.api.netology.integration import send_request
from yet_another_calendar.web.api.netology.schema import NetologyCookies


mock_cookies = NetologyCookies.model_validate({"_netology-on-rails_session": "aboba"})
mock_request_settings = {"method": "GET", "url": "/"}


@pytest.mark.asyncio
async def test_send_request_unauthorized():
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
    mock_response = AsyncMock()
    mock_response.status_code = status.HTTP_200_OK
    mock_response.json.return_value = {"ok": True}
    
    # mock_client = AsyncMock(spec=AsyncClient)
    # mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response) 
    # mock_client.request.return_value = mock_response

    
    with patch("yet_another_calendar.web.api.netology.integration.AsyncClient", new_callable=AsyncMock) as mock_client:
        mock_session = mock_client.return_value.__aenter__.return_value
        mock_session.cookies = None
        mock_session.get = AsyncMock(return_value=mock_response)
        response_json = await send_request(mock_cookies, mock_request_settings)
        assert response_json == {"ok": True}


    # assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    # mock_client.request.assert_called_once_with(**mock_request_settings)

