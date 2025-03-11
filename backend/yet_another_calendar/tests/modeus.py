import json
import typing
from unittest.mock import patch

import httpx
import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.modeus import integration


def handler(request: httpx.Request) -> httpx.Response:
    match request.url.path:
        case '/schedule-calendar/assets/app.config.json':
            file_path, status_code = ("fixtures/app_config.json", 200)

            if request.headers.get("invalid_app_config"):
                file_path, status_code = ("fixtures/wrong_app_config.json", 500)

            with open(settings.test_parent_path / file_path) as f:
                response_json = json.load(f)
                return httpx.Response(status_code, json=response_json)
        case '/oauth2/authorize':
            if request.headers.get("invalid_authorize"):
                return httpx.Response(400, headers={"Location": ""})  # todo: fix
            return httpx.Response(302, headers={"Location": "https://fs.utmn.ru/adfs/ls?aboba=true"})
        case '/bad-request':
            return httpx.Response(400, json={"ok": False})
        case '/error-tag':
            with open(settings.test_parent_path / "fixtures/auth_form_error_tag.html", "r") as f:
                return httpx.Response(200, text=f.read())
        case '/form-none':
            with open(settings.test_parent_path / "fixtures/auth_form_none.html", "r") as f:
                return httpx.Response(200, text=f.read())
        case '/form-ok':
            with open(settings.test_parent_path / "fixtures/auth_form_ok.html", "r") as f:
                return httpx.Response(200, text=f.read())
        case _:
            return httpx.Response(200, json={"Azamat": 'Lox'})


transport = httpx.MockTransport(handler)


@pytest.mark.asyncio
async def test_get_post_url_invalid_app_config() -> None:
    client = AsyncClient(http2=True,
                         base_url="https://utmn.modeus.org",
                         transport=transport,
                         headers={"invalid_app_config": "1"})

    with pytest.raises(KeyError) as exc_info:
        await integration.get_post_url(client)

    assert str(exc_info.value) == "'clientId'"


@pytest.mark.asyncio
async def test_get_post_url_ok() -> None:
    client = AsyncClient(http2=True, base_url="https://utmn.modeus.org", transport=transport)
    post_url = await integration.get_post_url(client)

    assert str(post_url) == "https://fs.utmn.ru/adfs/ls?aboba=true"


@pytest.mark.asyncio
async def test_get_auth_form_bad_request() -> None:
    client = AsyncClient(
        http2=True,
        base_url="https://utmn.modeus.org",
        transport=transport
    )

    with patch("yet_another_calendar.web.api.modeus.integration.get_post_url",
               return_value="https://fs.utmn.ru/bad-request"):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await integration.get_auth_form(client, "ivan", "12345")

    assert exc_info.type is httpx.HTTPStatusError
    assert exc_info.value.response.status_code == 400


@pytest.mark.asyncio
async def test_get_auth_form_with_error_tag() -> None:
    client = AsyncClient(
        http2=True,
        base_url="https://utmn.modeus.org",
        transport=transport
    )

    with patch("yet_another_calendar.web.api.modeus.integration.get_post_url",
               return_value="https://fs.utmn.ru/error-tag"):
        with pytest.raises(HTTPException) as exc_info:
            await integration.get_auth_form(client, "ivan", "12345")

        assert exc_info.value.detail == "Modeus error. ERROR"
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_auth_form_none() -> None:
    client = AsyncClient(
        http2=True,
        base_url="https://utmn.modeus.org",
        transport=transport
    )

    with patch("yet_another_calendar.web.api.modeus.integration.get_post_url",
               return_value="https://fs.utmn.ru/form-none"):
        with pytest.raises(HTTPException) as exc_info:
            await integration.get_auth_form(client, "ivan", "12345")

        assert exc_info.value.detail == "Modeus error. Can't get form."
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
@typing.no_type_check
async def test_get_auth_form_ok() -> None:
    client = AsyncClient(
        http2=True,
        base_url="https://utmn.modeus.org",
        transport=transport
    )

    with patch("yet_another_calendar.web.api.modeus.integration.get_post_url",
               return_value="https://fs.utmn.ru/form-ok"):
        form = await integration.get_auth_form(client, "ivan", "12345")

        assert not form.is_empty_element
        assert form.get("action") == "/submit"
        assert form.find_all("input")[0].get("name") == "username"
        assert form.find_all("input")[1].get("name") == "password"
        assert form.find("button").text == "Login"
