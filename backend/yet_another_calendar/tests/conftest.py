from unittest import mock

import pytest


def mock_cache() -> None:
    mock.patch("fastapi_cache.decorator.cache", lambda *args, **kwargs: lambda f: f).start()


def pytest_sessionstart(session: pytest.Session) -> None:
    mock_cache()