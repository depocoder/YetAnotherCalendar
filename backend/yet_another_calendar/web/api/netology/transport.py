"""Support the known Netology JavaScript cookie check without a browser."""
import asyncio
import re
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any
from urllib.parse import quote

import httpx
from fastapi import HTTPException
from starlette import status

from yet_another_calendar.settings import settings

UNAVAILABLE = "Нетология сейчас не отвечает. Попробуйте еще раз через несколько минут."
_CHECK_COOKIE_NAMES = {"__js_p_", "__jhash_", "__jua_", "__hash_", "__lhash_"}
_lock = asyncio.Lock()
# Recognise the exact algorithm we implement; never execute upstream JavaScript.
_JHASH_SOURCE = (
    "function get_jhash(b) {var x = 123456789;var i = 0; var k = 0;"
    "for (i = 0; i < 1677696; i++) {"
    "x = ((x + b) ^ (x + (x % 3) + (x % 17) + b) ^ i) % 16776960;"
    "if (x % 117 == 0) { k = (k + 1) % 1111; }}return k;}"
)


@dataclass
class CheckCookies:
    """Anonymous check cookies only; never a student's login session."""
    cookies: dict[str, str]
    user_agent: str
    expires_at: float


_check_cookies: CheckCookies | None = None


@lru_cache(maxsize=128)
def _jhash(code: int) -> int:
    """The get_jhash function served by Netology (October 2026)."""
    value, result = 123456789, 0
    for index in range(1677696):
        value = ((value + code) ^ (value + value % 3 + value % 17 + code) ^ index) % 16776960
        if value % 117 == 0:
            result = (result + 1) % 1111
    return result


def _unavailable() -> HTTPException:
    return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=UNAVAILABLE)


async def _verify_check(session: httpx.AsyncClient, response: httpx.Response) -> CheckCookies:
    cookie = response.cookies.get("__js_p_") or ""
    params = re.fullmatch(r"(\d{1,4}),(\d{1,6}),[01],[01],[01]", cookie)
    if params is None or _JHASH_SOURCE not in response.text:
        raise _unavailable()
    code, age = map(int, params.groups())
    # The page waits one second before submitting its cookies. Run the bounded
    # calculation off the event loop and preserve that delay even on a cache hit.
    proof, _ = await asyncio.gather(asyncio.to_thread(_jhash, code), asyncio.sleep(1))
    user_agent = session.headers["User-Agent"]
    session.cookies.set("__jhash_", str(proof), domain=session.base_url.host, path="/")
    session.cookies.set("__jua_", quote(user_agent, safe=""), domain=session.base_url.host, path="/")
    # Complete the check on a GET: its 302 must not turn a sign-in POST into GET.
    verified = await session.get(settings.netology_get_course_part, follow_redirects=True)
    if verified.status_code != status.HTTP_401_UNAUTHORIZED:
        verified.raise_for_status()
    if _is_html(verified):
        raise _unavailable()
    return CheckCookies(
        {cookie.name: cookie.value for cookie in session.cookies.jar
         if cookie.name in _CHECK_COOKIE_NAMES and cookie.value is not None},
        user_agent, time.monotonic() + min(age, 900),
    )


async def _refresh_cookies(
        session: httpx.AsyncClient, response: httpx.Response, previous: CheckCookies | None,
) -> CheckCookies:
    global _check_cookies  # noqa: PLW0603 - anonymous, process-wide upstream check
    async with _lock:
        # Requests challenged together share one verification.
        if (_check_cookies is not None and _check_cookies is not previous
                and _check_cookies.expires_at > time.monotonic()):
            return _check_cookies
        _check_cookies = await _verify_check(session, response)
        return _check_cookies


def _apply_cookies(session: httpx.AsyncClient, check_cookies: CheckCookies | None) -> None:
    if check_cookies is not None:
        for cookie in list(session.cookies.jar):
            if cookie.name in _CHECK_COOKIE_NAMES:
                session.cookies.delete(cookie.name, domain=cookie.domain, path=cookie.path)
        for name, value in check_cookies.cookies.items():
            session.cookies.set(name, value, domain=session.base_url.host, path="/")
        session.headers["User-Agent"] = check_cookies.user_agent


def _is_html(response: httpx.Response) -> bool:
    return "text/html" in response.headers.get("content-type", "").lower()


async def request(session: httpx.AsyncClient, **kwargs: Any) -> httpx.Response:
    """Verify the known cookie check and retry the original API request once."""
    current = _check_cookies
    if current is not None and current.expires_at <= time.monotonic():
        current = None
    _apply_cookies(session, current)
    response = await session.request(**kwargs)
    if _is_html(response) and response.status_code < status.HTTP_500_INTERNAL_SERVER_ERROR:
        _apply_cookies(session, await _refresh_cookies(session, response, current))
        response = await session.request(**kwargs)
    if _is_html(response):
        response.raise_for_status()
        raise _unavailable()
    return response
