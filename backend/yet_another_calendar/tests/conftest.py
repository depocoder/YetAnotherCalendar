from unittest import mock


def mock_cache():
    mock.patch("fastapi_cache.decorator.cache", lambda *args, **kwargs: lambda f: f).start()


def pytest_sessionstart(session):
    mock_cache()