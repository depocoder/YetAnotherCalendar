"""Tests for UTMN API implementation."""
import pytest
from unittest.mock import patch
from httpx import AsyncClient, HTTPStatusError
from typing import Any
from collections.abc import Generator

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.utmn import integration, schema
from yet_another_calendar.tests import handlers


from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend


@pytest.fixture(autouse=True)
def _init_cache() -> Generator[Any, Any, None]:  # pyright: ignore[reportUnusedFunction]
    FastAPICache.init(InMemoryBackend())
    yield
    FastAPICache.reset()

@pytest.fixture
async def utmn_client():
    """Fixture for UTMN client with transport handlers."""
    async with AsyncClient(
        http2=True,
        base_url=settings.utmn_base_url,
        transport=handlers.utmn_transport,
    ) as client:
        with patch("yet_another_calendar.web.api.utmn.integration.AsyncClient.__aenter__", return_value=client):
            yield client

@pytest.fixture  
async def utmn_bad_client():
    """Fixture for UTMN client with bad request transport."""
    async with AsyncClient(
        http2=True,
        base_url=settings.utmn_base_url,
        transport=handlers.bad_request_transport,
    ) as client:
        with patch("yet_another_calendar.web.api.utmn.integration.AsyncClient.__aenter__", return_value=client):
            yield client

@pytest.mark.asyncio
async def test_get_teachers_by_page_success(utmn_client):
    """Test successful teacher fetching from single page."""
    teachers = await integration.get_teachers_by_page(timeout=30, page=1)
    
    assert isinstance(teachers, dict)
    assert len(teachers) == 19
    
    assert "Абайдулина Флора Фатыховна" in teachers

@pytest.mark.asyncio
async def test_get_teachers_by_page_empty_page(utmn_client):
    """Test fetching from empty page."""
        
    teachers = await integration.get_teachers_by_page(timeout=30, page=3)
    
    assert isinstance(teachers, dict)
    assert len(teachers) == 0  # Page 3 returns empty from fixture

@pytest.mark.asyncio
async def test_get_teachers_by_page_different_pages(utmn_client):
    """Test fetching from different pages returns different data."""

    teachers_page_1 = await integration.get_teachers_by_page(timeout=30, page=1)
    assert len(teachers_page_1) == 19

    teachers_page_2 = await integration.get_teachers_by_page(timeout=30, page=2)
    assert len(teachers_page_2) == 20
    
    teachers_page_3 = await integration.get_teachers_by_page(timeout=30, page=3)
    assert len(teachers_page_3) == 0

@pytest.mark.asyncio
async def test_get_teachers_by_page_server_error(utmn_bad_client):
    """Test handling server errors."""
    with pytest.raises(HTTPStatusError):
        await integration.get_teachers_by_page(timeout=30, page=500)

@pytest.mark.asyncio
async def test_get_all_teachers_cached_success(fastapi_app, utmn_client):
    """Test successful fetching of all teachers with pagination."""

    teachers = await integration.get_all_teachers_cached(timeout=30, per_page=5)
    
    assert isinstance(teachers, dict)
    assert len(teachers) == 39

@pytest.mark.asyncio
async def test_get_all_teachers_exception_handling():
    """Test exception handling in get_all_teachers."""
    with patch('yet_another_calendar.web.api.utmn.integration.get_all_teachers_cached') as mock_cached:
        # Simulate an exception in cached function
        mock_cached.side_effect = Exception("Network error")
        
        teachers = await integration.get_all_teachers(timeout=30, per_page=5)
        
        # Should return empty dict on exception
        assert isinstance(teachers, dict)
        assert len(teachers) == 0

def test_teacher_schema_validation():
    """Test Teacher schema validation."""
    # Valid teacher data
    teacher_data = {
        "avatar_profile": "https://nova.utmn.ru/static/users/test/avatar.jpg",
        "profile_url": "https://www.utmn.ru/o-tyumgu/sotrudniki/test/",
    }
    
    teacher = schema.Teacher.model_validate(teacher_data)
    assert teacher.avatar_profile == teacher_data["avatar_profile"]
    assert teacher.profile_url == teacher_data["profile_url"]


