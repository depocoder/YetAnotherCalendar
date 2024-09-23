from __future__ import annotations

import re
from secrets import token_hex
from typing import TYPE_CHECKING, cast

import jwt
from bs4 import BeautifulSoup
from httpx import URL, AsyncClient

from .exceptions import CannotAuthenticate, LoginFailed

_token_re = re.compile(r"id_token=([a-zA-Z0-9\-_.]+)")

_MODEUS_CLIENT_ID = "sKir7YQnOUu4G0eCfn3tTxnBfzca"
_AUTH_URL = "https://auth.modeus.org/oauth2/authorize"


class ModeusCredentials:
    def __init__(
        self,
        token: str,
        common_auth_id: str | None,
        *,
        auth_url: str = _AUTH_URL,
        client_id: str = _MODEUS_CLIENT_ID,
        session: AsyncClient | None = None,
    ) -> None:
        self._token = token
        self._auth_id = common_auth_id
        if session is None:
            session = AsyncClient(http2=True, base_url="https://utmn.modeus.org/", timeout=15)
        self._session = session
        self._client_id = client_id
        self._auth_url = auth_url

    @staticmethod
    def _extract_token_from_url(url: str) -> str | None:
        if (match := _token_re.search(url)) is None:
            return None
        return match[1]

    @staticmethod
    def _get_auth_data(
        *,
        client_id: str = _MODEUS_CLIENT_ID,
        silent: bool = False,
    ) -> dict[str, str]:
        auth_data = dict(
            client_id=client_id,
            redirect_uri="https://utmn.modeus.org/",
            response_type="id_token",
            scope="openid",
            nonce=token_hex(16),
            state=token_hex(16),
        )
        if silent:
            auth_data["prompt"] = "none"
        return auth_data

    @property
    def token_data(self) -> dict[str, int | str | list[str]]:
        return jwt.decode(self._token, options=dict(verify_signature=False))

    @property
    def user_id(self) -> str:
        return cast(str, self.token_data["person_id"])

    @property
    def token(self) -> str:
        return self._token

    @property
    def common_auth_id(self) -> str | None:
        return self._auth_id

    @common_auth_id.setter
    def common_auth_id(self, value: str) -> None:
        self._auth_id = value

    @property
    def session(self) -> AsyncClient:
        return self._session

    async def refresh_login(self) -> None:
        auth_data = self._get_auth_data(client_id=self._client_id, silent=True)
        auth_data["id_token_hint"] = self._token
        if self._auth_id is None:
            raise LoginFailed("No auth id was provided")
        r = await self._session.get(
            self._auth_url,
            params=auth_data,
            cookies={"commonAuthId": self._auth_id},
            follow_redirects=False,
        )
        token = self._extract_token_from_url(URL(r.headers["Location"]).fragment)
        if token is None:
            raise CannotAuthenticate
        self._token = token

    async def relogin(self, login: str, password: str) -> None:
        self._token = (await self.login(login, password))['token']

    @classmethod
    async def login(cls, login: str, password: str) -> dict:
        session = AsyncClient(http2=True, base_url="https://utmn.modeus.org/", timeout=15)
        # Getting app config
        r = await session.get("/schedule-calendar/assets/app.config.json")
        client_id = r.json()["wso"]["clientId"]
        auth_url = r.json()["wso"]["loginUrl"]
        # Getting auth URL
        auth_data = dict(
            client_id=client_id,
            redirect_uri="https://utmn.modeus.org/",
            response_type="id_token",
            scope="openid",
            nonce=token_hex(16),
            state=token_hex(16),
        )
        r = await session.get(auth_url, params=auth_data)
        post_url = r.url
        assert post_url is not None

        # Trying to log in
        login_data = dict(UserName=login, Password=password, AuthMethod="FormsAuthentication")
        r = await session.post(post_url, data=login_data)
        html_text = r.text

        # Parsing response
        html = BeautifulSoup(html_text, "lxml")
        error_tag = html.find(id="errorText")
        if error_tag is not None and error_tag.text != "":
            raise LoginFailed(error_tag.text)

        # Auth succeeded, continuing auth flow to get the token
        form = html.form
        if form is None:
            raise CannotAuthenticate
        # TODO: SAMLRequest/-Response are base64-encoded XMLs, try to parse them
        auth_data = {}
        continue_auth_url = "https://auth.modeus.org/commonauth"
        for el in form.find_all("input", type="hidden"):
            auth_data[el["name"]] = el["value"]  # Collecting form data
        r = await session.post(continue_auth_url, data=auth_data, follow_redirects=False)
        h = {"Referer": "https://fs.utmn.ru/"}
        auth_id = r.cookies.get("commonAuthId")
        # This auth request redirects to another URL, which redirects to Modeus home page,
        #  so we use HEAD in the latter one to get only target URL and extract the token
        r = await session.head(r.headers["Location"], headers=h)
        if r.url is None:
            raise CannotAuthenticate
        token = cls._extract_token_from_url(r.url.fragment)  # Yay! We got it!
        if token is None:
            raise CannotAuthenticate
        return {"token": token, "auth_id": auth_id}
