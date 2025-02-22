import json
from pathlib import Path

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from httpx import AsyncClient
from starlette import status
from fastapi import HTTPException
from pydantic import ValidationError

from yet_another_calendar.web.api.modeus.integration import get_post_url


parent_path = Path(__file__).parent


async def handler(request):
    match request.url.path:
        case '/schedule-calendar/assets/app_config.json':
            file_path, status_code = ("fixtures/app_config.json", 200)

            if request.headers.get("invalid_app_config"):
                file_path, status_code = ("fixtures/wrong_app_config.json", 500)

            with open(parent_path / file_path, 'r') as f:
                response_json = json.load(f)
                return httpx.Response(status_code, json=response_json)
        case '/oauth2/authorize':
            if request.headers.get("invalid_authorize"):
                return httpx.Response(400, headers={"Location": ""})   # todo: fix
            return httpx.Response(302, headers={"Location": "https://fs.utmn.ru/adfs/ls?aboba=true"})
        case _:
            return httpx.Response(200, json={"Azamat": 'Lox'})

transport = httpx.MockTransport(handler)


@pytest.mark.asyncio
async def test_get_post_url_invalid_app_config():
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport, headers={"invalid_app_config": "1"})

    with pytest.raises(KeyError) as exc_info:
        await get_post_url(client)

    assert str(exc_info.value) == "'clientId'"


@pytest.mark.asyncio
async def test_get_post_url_invalid_auth_url():
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport, headers={"invalid_authorize": "1"})

    post_url = await get_post_url(client)

    assert True


@pytest.mark.asyncio
async def test_get_post_url_ok():
    client = AsyncClient(http2=True, base_url="https://netology.ru", transport=transport)
    post_url = await get_post_url(client)

    assert str(post_url) == "https://fs.utmn.ru/adfs/ls?aboba=true"

