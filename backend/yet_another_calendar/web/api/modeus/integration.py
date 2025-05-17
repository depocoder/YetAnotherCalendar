"""Modeus API implementation."""
import logging
import re
from secrets import token_hex
from typing import Any

import httpx
import reretry
from bs4 import BeautifulSoup, Tag
from fastapi import HTTPException
from fastapi_cache.decorator import cache
from httpx import URL, AsyncClient, Response
from starlette import status

from yet_another_calendar.settings import settings
from .schema import (
    ModeusCalendar,
    FullEvent, FullModeusPersonSearch, SearchPeople, ExtendedPerson, ModeusEventsBody,
)

from ...cache_builder import key_builder

logger = logging.getLogger(__name__)
_token_re = re.compile(r"id_token=([a-zA-Z0-9\-_.]+)")


async def get_post_url(session: AsyncClient, token_length: int = 16) -> URL:
    """
    Get auth post url for log in.
    """
    response = await session.get(settings.modeus_login_part)
    client_id = response.json()["wso"]["clientId"]
    auth_url = response.json()["wso"]["loginUrl"]
    auth_data = {
        "client_id": client_id,
        "redirect_uri": settings.modeus_base_url,
        "response_type": "id_token",
        "scope": "openid",
        "nonce": token_hex(token_length),
        "state": token_hex(token_length),
    }
    response = await session.get(auth_url, params=auth_data, follow_redirects=True)
    post_url = response.url
    if post_url is None:
        raise HTTPException(detail=f"Modeus error. Can't get post_url. Response: {response.text}",
                            status_code=response.status_code)
    return post_url


async def get_auth_form(session: AsyncClient, username: str, password: str) -> Tag:
    """
    Get auth form.
    """
    post_url = await get_post_url(session)
    login_data = {
        "UserName": username,
        "Password": password,
        "AuthMethod": "FormsAuthentication",
    }
    response = await session.post(post_url, data=login_data, follow_redirects=True)
    response.raise_for_status()
    html_text = response.text

    html = BeautifulSoup(html_text, "lxml")
    error_tag = html.find(id="errorText")
    if error_tag is not None and error_tag.text != "":
        raise HTTPException(detail=f"Modeus error. {error_tag.text}", status_code=status.HTTP_401_UNAUTHORIZED)

    form = html.form
    if form is None:
        raise HTTPException(detail="Modeus error. Can't get form.", status_code=status.HTTP_401_UNAUTHORIZED)
    return form


@reretry.retry(exceptions=httpx.TransportError, tries=settings.retry_tries, delay=settings.retry_delay)
@cache(expire=settings.redis_jwt_time_live)
async def login(username: str, __password: str, timeout: int = 15) -> str:
    """
    Log in Modeus.

    Raises:
        CannotAuthenticateError: if something changed in API
    """
    async with httpx.AsyncClient(
            base_url=settings.modeus_base_url,
            timeout=timeout,
            headers={
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
            },
            follow_redirects=True,
    ) as session:
        form = await get_auth_form(session, username, __password)
        auth_data = {}
        for input_html in form.find_all("input", type="hidden"):
            auth_data[input_html["name"]] = input_html["value"]  # type: ignore
        response = await session.post(
            settings.modeus_continue_auth_url,
            data=auth_data,  # type: ignore
            follow_redirects=False,
        )
        if response.status_code >= status.HTTP_400_BAD_REQUEST:
            response.raise_for_status()
        headers = {"Referer": "https://fs.utmn.ru/"}
        # This auth request redirects to another URL, which redirects to Modeus home page,
        #  so we use HEAD in the latter one to get only target URL and extract the token
        response = await session.head(response.headers["Location"], headers=headers)
        if response.url is None:
            raise HTTPException(detail='Modeus error. Username/password is incorrect.',
                                status_code=response.status_code)
        token = _extract_token_from_url(response.url.fragment)
        if token is None:
            raise HTTPException(
                detail=f"Modeus error. Can't get token. Response: {response.text}", status_code=response.status_code,
            )
        return token


def _extract_token_from_url(url: str, match_index: int = 1) -> str | None:
    """Get token from url."""
    if (match := _token_re.search(url)) is None:
        return None
    return match[match_index]


@reretry.retry(exceptions=httpx.TransportError, tries=settings.retry_tries, delay=settings.retry_delay)
async def post_modeus(__jwt: str, body: Any, url_part: str, timeout: int = 15) -> str:
    """
    Post into modeus.
    """
    async with AsyncClient(
        http2=True,
        base_url=settings.modeus_base_url,
        timeout=timeout,
    ) as session:
        session.headers["Authorization"] = f"Bearer {__jwt}"
        session.headers["content-type"] = "application/json"
        response = await session.post(
            url_part,
            content=body.model_dump_json(by_alias=True),
        )
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            raise HTTPException(detail='Modeus token expired!', status_code=response.status_code)
        response.raise_for_status()
        return response.text


async def get_events(
        body: ModeusEventsBody,
        __jwt: str,

) -> list[FullEvent]:
    """Get events for student in modeus"""

    response = await post_modeus(__jwt, body, settings.modeus_search_events_part)
    modeus_calendar = ModeusCalendar.model_validate_json(response)
    return modeus_calendar.serialize_modeus_response()



@cache(expire=settings.redis_events_time_live, key_builder=key_builder)
async def get_day_events(token: str, payload: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Запрашивает календарь Modeus на один день.

    :param token: Bearer-токен (без префикса «Bearer »).
    :param payload: Тело запроса, сформированное DayEventsRequest.to_search_payload().
    :return: Список событий в «сыро́м» формате Modeus.
    """

    async with AsyncClient(http2=True, base_url=settings.modeus_base_url, follow_redirects=True, timeout=30) as client:
        client.headers["Authorization"] = f"Bearer {token}"
        client.headers["content-type"] = "application/json"
        client.headers["Accept"] = "application/json"
        resp: Response = await client.post(settings.modeus_search_events_part, json=payload)
        resp.raise_for_status()
        modeus_calendar = ModeusCalendar.model_validate_json(resp.text)
        return modeus_calendar.serialize_modeus_response()


async def get_people(
        __jwt: str,
        body: FullModeusPersonSearch,
) -> list[ExtendedPerson]:
    """Get people from modeus"""

    response = await post_modeus(__jwt, body, settings.modeus_search_people_part)
    search_people = SearchPeople.model_validate_json(response)
    return search_people.serialize_modeus_response()
