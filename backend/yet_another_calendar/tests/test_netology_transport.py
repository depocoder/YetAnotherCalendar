"""Regressions for Netology's HTTP 200 cookie check (Rollbar #55)."""
import asyncio
import time
from email import policy
from email.parser import BytesParser
from unittest.mock import AsyncMock
from urllib.parse import quote

import httpx
import pytest
from fastapi import HTTPException

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.netology import integration, schema, transport


@pytest.fixture(autouse=True)
def reset_check(monkeypatch):
    monkeypatch.setattr(transport, '_check_cookies', None)
    monkeypatch.setattr(transport, '_lock', asyncio.Lock())


@pytest.fixture
def verify_check(monkeypatch):
    verify = AsyncMock(return_value=transport.CheckCookies(
        {'__js_p_': 'checked', '__hash_': 'anonymous-proof'}, 'python-httpx', time.monotonic() + 900,
    ))
    monkeypatch.setattr(transport, '_verify_check', verify)
    return verify


def install_client(monkeypatch, handler):
    factory = httpx.AsyncClient
    monkeypatch.setattr(integration, 'AsyncClient', lambda **kwargs: factory(
        **kwargs, transport=httpx.MockTransport(handler),
    ))


def challenge(source=transport._JHASH_SOURCE, cookie='484,1800,0,0,0'):
    return httpx.Response(200, text=f'<html><script>{source}</script></html>', headers={
        'content-type': 'text/html; charset=utf-8', 'set-cookie': f'__js_p_={cookie}; Path=/',
    })


@pytest.mark.parametrize('code,expected', [(0, 489), (1, 856), (484, 721), (1000, 1013)])
def test_cookie_hash_matches_upstream_javascript(code, expected):
    # Values independently computed by the upstream function in Node.js.
    assert transport._jhash(code) == expected


async def test_login_completes_check_on_get_then_replays_post(monkeypatch):
    methods = []
    posts = []

    def handler(request):
        methods.append(request.method)
        cookie = request.headers.get('cookie', '')
        if request.method == 'GET':
            assert request.url.path == settings.netology_get_course_part
            assert '__jhash_=721' in cookie
            assert f"__jua_={quote(request.headers['user-agent'], safe='')}" in cookie
            if '__hash_=verified' not in cookie:
                return httpx.Response(302, headers={
                    'location': settings.netology_get_course_part, 'set-cookie': '__hash_=verified; Path=/',
                })
            return httpx.Response(401, json={'error': 'not signed in'})
        posts.append(request)
        if len(posts) == 1:
            return challenge()
        assert cookie.count('__js_p_=') == 1
        assert '__hash_=verified' in cookie
        for attempt in posts:
            message = BytesParser(policy=policy.default).parsebytes(
                f"Content-Type: {attempt.headers['content-type']}\r\n\r\n".encode() + attempt.content,
            )
            assert {part.get_param('name', header='content-disposition'): part.get_payload(decode=True)
                    for part in message.iter_parts()} == {
                'login': b'student@example.com', 'password': b'private-password', 'remember': b'1',
            }
        return httpx.Response(200, json={'ok': True}, headers={
            'set-cookie': '_netology-on-rails_session=student-session; Path=/; Secure; HttpOnly',
        })

    install_client(monkeypatch, handler)
    assert (await integration.auth_netology('student@example.com', 'private-password')).rails_session == 'student-session'
    assert methods == ['POST', 'GET', 'GET', 'POST']
    assert '_netology-on-rails_session' not in transport._check_cookies.cookies


@pytest.mark.parametrize('html', [False, True])
async def test_login_without_session_is_unavailable_instead_of_validation_error(monkeypatch, html, verify_check):
    install_client(monkeypatch, lambda _: challenge() if html else httpx.Response(200, json={'ok': True}))
    with pytest.raises(HTTPException) as exc:
        await integration.auth_netology('student@example.com', 'password')
    assert exc.value.status_code == 503
    assert exc.value.detail == transport.UNAVAILABLE
    assert verify_check.await_count == int(html)


@pytest.mark.parametrize('source,cookie', [('unknown JavaScript', '484,1800,0,0,0'),
                                         (transport._JHASH_SOURCE, 'invalid')])
async def test_unknown_check_fails_without_executing_javascript(monkeypatch, source, cookie):
    install_client(monkeypatch, lambda _: challenge(source, cookie))
    with pytest.raises(HTTPException) as exc:
        await integration.auth_netology('student@example.com', 'password')
    assert exc.value.status_code == 503


async def test_calendar_requests_share_only_anonymous_cookies(monkeypatch, verify_check):
    requests = []

    def handler(request):
        requests.append(request)
        cookie = request.headers['cookie']
        if '__hash_=anonymous-proof' not in cookie:
            return challenge()
        assert ('_netology-on-rails_session=alice' in cookie) != ('_netology-on-rails_session=bob' in cookie)
        return httpx.Response(200, json={'programs': []})

    install_client(monkeypatch, handler)
    for student in ('alice', 'bob'):
        cookies = schema.NetologyCookies.model_validate({'_netology-on-rails_session': student})
        assert (await integration.get_netology_courses(cookies)).programs == []
    assert len(requests) == 3
    verify_check.assert_awaited_once()


async def test_check_does_not_mask_rejected_credentials(monkeypatch, verify_check):
    count = 0

    def handler(request):
        nonlocal count
        count += 1
        return challenge() if count == 1 else httpx.Response(401, json={'error': 'bad credentials'})

    install_client(monkeypatch, handler)
    with pytest.raises(HTTPException) as exc:
        await integration.auth_netology('student@example.com', 'wrong-password')
    assert exc.value.status_code == 401
    assert exc.value.detail == 'Netology error. Username/password is incorrect.'


async def test_server_error_does_not_start_check(monkeypatch, verify_check):
    install_client(monkeypatch, lambda _: httpx.Response(503, text='<html>Unavailable</html>', headers={
        'content-type': 'text/html',
    }))
    with pytest.raises(httpx.HTTPStatusError):
        await integration.auth_netology('student@example.com', 'password')
    verify_check.assert_not_awaited()


async def test_concurrent_checks_verify_once(verify_check):
    cookies = verify_check.return_value

    async def verify(*args):
        await asyncio.sleep(0)
        return cookies

    verify_check.side_effect = verify
    async with httpx.AsyncClient(base_url=settings.netology_base_url) as session:
        results = await asyncio.gather(*(transport._refresh_cookies(session, challenge(), None) for _ in range(10)))
    assert all(result is results[0] for result in results)
    verify_check.assert_awaited_once()


async def test_rejected_cached_check_is_refreshed(monkeypatch, verify_check):
    old = transport.CheckCookies({'__hash_': 'expired-proof'}, 'python-httpx', time.monotonic() + 900)
    monkeypatch.setattr(transport, '_check_cookies', old)
    install_client(monkeypatch, lambda request: httpx.Response(200, json={'ok': True})
                   if '__hash_=anonymous-proof' in request.headers['cookie'] else challenge())
    result = await integration.send_request(
        schema.NetologyCookies.model_validate({'_netology-on-rails_session': 'student'}),
        {'method': 'GET', 'url': settings.netology_get_course_part},
    )
    assert result == {'ok': True}
    verify_check.assert_awaited_once()
