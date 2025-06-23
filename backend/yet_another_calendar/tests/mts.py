import uuid
from unittest.mock import AsyncMock, MagicMock


import pytest
from fastapi import HTTPException
from redis.asyncio import Redis
from pydantic import HttpUrl
from starlette import status

from yet_another_calendar.web.api.mts import integration
from yet_another_calendar.web.api.mts.schema import MtsLinkBody


@pytest.mark.asyncio
async def test_save_link_success() -> None:
    """Test successful link saving to Redis."""
    mock_redis = AsyncMock(spec=Redis)
    lesson_id = uuid.uuid4()
    url = "https://example.com/webinar"

    # Properly mock the async set method
    mock_redis.set = AsyncMock(return_value=True)

    await integration.save_link(mock_redis, lesson_id, url)

    mock_redis.set.assert_called_once_with(f"mtslink:{lesson_id}", url)


@pytest.mark.asyncio
async def test_get_link_success() -> None:
    """Test successful link retrieval from Redis."""
    mock_redis = AsyncMock(spec=Redis)
    lesson_id = uuid.uuid4()
    expected_url = "https://example.com/webinar"

    # Create a regular mock (not AsyncMock) for the bytes object
    mock_bytes = MagicMock()
    mock_bytes.decode.return_value = expected_url

    # Mock Redis get to return the mock bytes object
    mock_redis.get = AsyncMock(return_value=mock_bytes)

    result = await integration.get_link(mock_redis, lesson_id)

    assert result == expected_url
    mock_redis.get.assert_called_once_with(f"mtslink:{lesson_id}")


@pytest.mark.asyncio
async def test_get_link_not_found() -> None:
    """Test link not found in Redis - this tests the current buggy behavior."""
    mock_redis = AsyncMock(spec=Redis)
    lesson_id = uuid.uuid4()

    # Mock Redis get to return None (this will cause AttributeError in the current code)
    mock_redis.get = AsyncMock(return_value=None)

    # The current code has a bug - it tries to call .decode() on None
    with pytest.raises(AttributeError, match="'NoneType' object has no attribute 'decode'"):
        await integration.get_link(mock_redis, lesson_id)


@pytest.mark.asyncio
async def test_get_link_empty_string() -> None:
    """Test link with empty string (what should happen for not found)."""
    mock_redis = AsyncMock(spec=Redis)
    lesson_id = uuid.uuid4()

    # Mock Redis to return empty bytes which decode to empty string
    mock_bytes = MagicMock()
    mock_bytes.decode.return_value = ""
    mock_redis.get = AsyncMock(return_value=mock_bytes)

    with pytest.raises(HTTPException) as exc_info:
        await integration.get_link(mock_redis, lesson_id)

    assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
    assert exc_info.value.detail == "URL for this lesson is not found"


def test_mts_link_body_validation() -> None:
    """Test MtsLinkBody validation."""
    lesson_id = uuid.uuid4()
    url = "https://example.com/webinar"

    body = MtsLinkBody(lessonId=lesson_id, url=HttpUrl(url))

    assert body.lesson_id == lesson_id
    assert str(body.url) == url


def test_mts_link_body_invalid_url() -> None:
    """Test MtsLinkBody with invalid URL."""
    lesson_id = uuid.uuid4()

    with pytest.raises(ValueError):
        MtsLinkBody(lessonId=lesson_id, url=HttpUrl("invalid-url"))


@pytest.mark.asyncio
async def test_save_link_timeout() -> None:
    """Test save_link with timeout exception."""
    mock_redis = AsyncMock(spec=Redis)
    lesson_id = uuid.uuid4()
    url = "https://example.com/webinar"

    # Mock timeout during Redis operation
    mock_redis.set = AsyncMock(side_effect=TimeoutError("Redis timeout"))

    with pytest.raises(TimeoutError):
        await integration.save_link(mock_redis, lesson_id, url)


@pytest.mark.asyncio
async def test_get_link_timeout() -> None:
    """Test get_link with timeout exception."""
    mock_redis = AsyncMock(spec=Redis)
    lesson_id = uuid.uuid4()

    # Mock timeout during Redis operation
    mock_redis.get = AsyncMock(side_effect=TimeoutError("Redis timeout"))

    with pytest.raises(TimeoutError):
        await integration.get_link(mock_redis, lesson_id)