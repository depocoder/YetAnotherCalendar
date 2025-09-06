import datetime
from typing import Any
from collections.abc import Callable
from collections.abc import AsyncGenerator
from unittest import mock
from unittest.mock import Mock, patch

import pytest
from fakeredis import FakeServer
from fakeredis.aioredis import FakeConnection
from fastapi import FastAPI, Request
from httpx import AsyncClient
from redis.asyncio import ConnectionPool

from yet_another_calendar.web.application import get_app
from yet_another_calendar.web.lifespan import get_redis_pool
from yet_another_calendar.settings import settings
from yet_another_calendar.tests import handlers


def mock_cache() -> None:
    mock.patch("fastapi_cache.decorator.cache", lambda *args, **kwargs: lambda f: f).start()


def pytest_sessionstart(session: pytest.Session) -> None:
    mock_cache()


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    """
    Backend for anyio pytest plugin.

    :return: backend name.
    """
    return "asyncio"


@pytest.fixture
async def fake_redis_pool() -> AsyncGenerator[ConnectionPool, None]:
    """
    Get instance of a fake redis.

    :yield: FakeRedis instance.
    """
    server = FakeServer()
    server.connected = True
    pool = ConnectionPool(connection_class=FakeConnection, server=server)

    yield pool

    await pool.disconnect()


@pytest.fixture
def fastapi_app(
        fake_redis_pool: ConnectionPool,
) -> FastAPI:
    """
    Fixture for creating FastAPI app.

    :return: fastapi app with mocked dependencies.
    """
    application = get_app()
    application.dependency_overrides[get_redis_pool] = lambda: fake_redis_pool
    return application


@pytest.fixture
async def client(
        fastapi_app: FastAPI,
        anyio_backend: Any,
) -> AsyncGenerator[AsyncClient, None]:
    """
    Fixture that creates client for requesting server.

    :param fastapi_app: the application.
    :yield: client for the app.
    """
    async with AsyncClient(app=fastapi_app, base_url="http://test", timeout=2.0) as ac:
        yield ac


@pytest.fixture
def mock_request() -> Callable[[str], Mock]:
    """Create a mock request fixture."""
    def _create_request(client_ip: str = "127.0.0.1") -> Mock:
        request = Mock(spec=Request)
        request.headers = {}
        request.client = Mock()
        request.client.host = client_ip
        return request
    return _create_request


@pytest.fixture
async def modeus_client():
    """Fixture for Modeus client with transport handlers."""
    async with AsyncClient(
        http2=True,
        base_url="https://utmn.modeus.org",
        transport=handlers.transport,
    ) as client:
        with patch("yet_another_calendar.web.api.modeus.integration.AsyncClient.__aenter__", return_value=client):
            yield client


@pytest.fixture  
async def modeus_bad_client():
    """Fixture for Modeus client with bad request transport."""
    async with AsyncClient(
        http2=True,
        base_url="https://utmn.modeus.org",
        transport=handlers.bad_request_transport,
    ) as client:
        with patch("yet_another_calendar.web.api.modeus.integration.AsyncClient.__aenter__", return_value=client):
            yield client


@pytest.fixture
async def netology_client():
    """Fixture for Netology client with transport handlers."""
    async with AsyncClient(
        http2=True,
        base_url=settings.netology_base_url,
        transport=handlers.transport,
    ) as client:
        with patch("yet_another_calendar.web.api.netology.integration.AsyncClient.__aenter__", return_value=client):
            yield client


@pytest.fixture  
async def netology_bad_client():
    """Fixture for Netology client with bad request transport."""
    async with AsyncClient(
        http2=True,
        base_url=settings.netology_base_url,
        transport=handlers.bad_request_transport,
    ) as client:
        with patch("yet_another_calendar.web.api.netology.integration.AsyncClient.__aenter__", return_value=client):
            yield client


@pytest.fixture
async def lms_client():
    """Fixture for LMS client with transport handlers."""
    async with AsyncClient(
        http2=True,
        base_url=settings.lms_base_url,
        transport=handlers.transport,
    ) as client:
        with patch("yet_another_calendar.web.api.lms.integration.AsyncClient.__aenter__", return_value=client):
            yield client


@pytest.fixture  
async def lms_bad_client():
    """Fixture for LMS client with bad request transport."""
    async with AsyncClient(
        http2=True,
        base_url=settings.lms_base_url,
        transport=handlers.bad_request_transport,
    ) as client:
        with patch("yet_another_calendar.web.api.lms.integration.AsyncClient.__aenter__", return_value=client):
            yield client


# Bulk test fixtures
@pytest.fixture
def bulk_fixture_data():
    """Fixture that loads the bulk test data."""
    import json
    with open(settings.test_parent_path / "fixtures/bulk_fixture.json") as f:
        return json.load(f)


@pytest.fixture
def bulk_fixture_content():
    """Fixture that loads the bulk test data as raw JSON string."""
    with open(settings.test_parent_path / "fixtures/bulk_fixture.json") as f:
        return f.read()


@pytest.fixture
def sample_datetime():
    """Fixture that provides a standard datetime for testing."""
    return {
        'start': datetime.datetime(2025, 6, 5, 14, 0),
        'end': datetime.datetime(2025, 6, 5, 15, 0),
        'invalid_end': datetime.datetime(2025, 6, 5, 13, 0)  # before start
    }
