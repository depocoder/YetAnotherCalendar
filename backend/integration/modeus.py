"""Modeus API implementation."""

from __future__ import annotations

import re
from secrets import token_hex
from typing import Any, Dict

from bs4 import BeautifulSoup, Tag
from httpx import URL, AsyncClient

from integration.exceptions import CannotAuthenticateError, LoginFailedError

_token_re = re.compile(r"id_token=([a-zA-Z0-9\-_.]+)")
_AUTH_URL = "https://auth.modeus.org/oauth2/authorize"


async def get_post_url(session: AsyncClient, token_length: int = 16) -> URL:
    """
    Get auth post url for log in.

    Raises:
        CannotAuthenticateError: if something changed in API
    """
    response = await session.get("/schedule-calendar/assets/app.config.json")
    client_id = response.json()["wso"]["clientId"]
    auth_url = response.json()["wso"]["loginUrl"]
    auth_data = {
        "client_id": client_id,
        "redirect_uri": "https://utmn.modeus.org/",
        "response_type": "id_token",
        "scope": "openid",
        "nonce": token_hex(token_length),
        "state": token_hex(token_length),
    }
    response = await session.get(auth_url, params=auth_data)
    response.raise_for_status()
    post_url = response.url
    if post_url is None:
        raise CannotAuthenticateError
    return post_url


async def get_auth_form(session: AsyncClient, username: str, password: str) -> Tag:
    """
    Get auth form.

    Raises:
        CannotAuthenticateError: if something changed in API
        LoginFailedError: if username or password incorrect
    """
    post_url = await get_post_url(session)
    login_data = {
        "UserName": username,
        "Password": password,
        "AuthMethod": "FormsAuthentication",
    }
    response = await session.post(post_url, data=login_data)
    response.raise_for_status()
    html_text = response.text

    html = BeautifulSoup(html_text, "lxml")
    error_tag = html.find(id="errorText")
    if error_tag is not None and error_tag.text != "":
        raise LoginFailedError(error_tag.text)

    form = html.form
    if form is None:
        raise CannotAuthenticateError
    return form


async def login(username: str, password: str, timeout: int = 15) -> Dict[str, Any]:
    """
    Log in Modeus.

    Raises:
        CannotAuthenticateError: if something changed in API
    """
    session = AsyncClient(
        http2=True,
        base_url="https://utmn.modeus.org/",
        timeout=timeout,
    )

    form = await get_auth_form(session, username, password)
    auth_data = {}
    continue_auth_url = "https://auth.modeus.org/commonauth"
    for input_html in form.find_all("input", type="hidden"):
        auth_data[input_html["name"]] = input_html["value"]
    response = await session.post(
        continue_auth_url,
        data=auth_data,
        follow_redirects=False,
    )
    headers = {"Referer": "https://fs.utmn.ru/"}
    auth_id = response.cookies.get("commonAuthId")
    # This auth request redirects to another URL, which redirects to Modeus home page,
    #  so we use HEAD in the latter one to get only target URL and extract the token
    response = await session.head(response.headers["Location"], headers=headers)
    if response.url is None:
        raise CannotAuthenticateError
    token = _extract_token_from_url(response.url.fragment)
    if token is None:
        raise CannotAuthenticateError
    return {"token": token, "auth_id": auth_id}


def _extract_token_from_url(url: str, match_index: int = 1) -> str | None:
    """Get token from url."""
    if (match := _token_re.search(url)) is None:
        return None
    return match[match_index]
