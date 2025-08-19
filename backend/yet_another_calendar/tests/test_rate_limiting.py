"""Tests for rate limiting functionality."""
import json
from collections.abc import Callable
from unittest.mock import Mock

import pytest
from fastapi import HTTPException, status
from redis.asyncio import ConnectionPool, Redis

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.auth.rate_limiter import (
    LoginRateLimiter,
    rate_limited_dependency,
)


class TestRateLimitedDependency:
    """Tests for the rate_limited_dependency function."""

    @pytest.mark.asyncio
    async def test_rate_limited_dependency_success(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test rate_limited_dependency with successful execution."""
        request = mock_request("192.168.1.1")
        request.url = "http://test/api/auth/login"
        
        # Create a generator and consume it to simulate successful execution
        gen = rate_limited_dependency(request, fake_redis_pool)
        
        # Start the generator
        await gen.__anext__()
        
        # Verify no failed attempts were recorded
        cache_key = "http://test/api/auth/login_login_attempts:192.168.1.1"
        async with Redis(connection_pool=fake_redis_pool) as redis:
            cached_data = await redis.get(cache_key)
            assert cached_data is None

    @pytest.mark.asyncio
    async def test_rate_limited_dependency_auth_failure(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test rate_limited_dependency records failure on 401."""
        request = mock_request("192.168.1.1")
        request.url = "http://test/api/auth/login"
        
        gen = rate_limited_dependency(request, fake_redis_pool)
        
        # Start the generator
        await gen.__anext__()
        
        # Simulate 401 error by throwing to the generator
        with pytest.raises(HTTPException) as exc_info:
            await gen.athrow(HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Auth failed"))
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Verify failed attempt was recorded
        cache_key = "http://test/api/auth/login_login_attempts:192.168.1.1"
        async with Redis(connection_pool=fake_redis_pool) as redis:
            cached_data = await redis.get(cache_key)
            assert cached_data is not None
            data = json.loads(cached_data.decode())
            assert data["count"] == 1

    @pytest.mark.asyncio
    async def test_rate_limited_dependency_non_auth_failure(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test rate_limited_dependency doesn't record failure on non-401 errors."""
        request = mock_request("192.168.1.1")
        request.url = "http://test/api/auth/login"
        
        gen = rate_limited_dependency(request, fake_redis_pool)
        
        # Start the generator
        await gen.__anext__()
        
        # Simulate non-401 error
        with pytest.raises(HTTPException) as exc_info:
            await gen.athrow(HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bad request"))
        
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        
        # Verify no failed attempt was recorded
        cache_key = "http://test/api/auth/login_login_attempts:192.168.1.1"
        async with Redis(connection_pool=fake_redis_pool) as redis:
            cached_data = await redis.get(cache_key)
            assert cached_data is None

    @pytest.mark.asyncio
    async def test_rate_limited_dependency_rate_limit_exceeded(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test rate_limited_dependency blocks when rate limit exceeded."""
        request = mock_request("192.168.1.1")
        request.url = "http://test/api/auth/login"
        
        # Pre-populate Redis with max attempts
        rate_limiter = LoginRateLimiter()
        for _ in range(settings.login_max_attempts):
            await rate_limiter.record_failed_attempt(request, fake_redis_pool, "http://test/api/auth/login")
        
        # Next request should be rate limited
        with pytest.raises(HTTPException) as exc_info:
            gen = rate_limited_dependency(request, fake_redis_pool)
            await gen.__anext__()
        
        assert exc_info.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Too many failed attempts" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_rate_limited_dependency_clears_on_success(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test rate_limited_dependency clears attempts on success."""
        request = mock_request("192.168.1.1")
        request.url = "http://test/api/auth/login"
        
        # Record some failed attempts first
        rate_limiter = LoginRateLimiter()
        await rate_limiter.record_failed_attempt(request, fake_redis_pool, "http://test/api/auth/login")
        await rate_limiter.record_failed_attempt(request, fake_redis_pool, "http://test/api/auth/login")
        
        # Verify attempts exist
        cache_key = "http://test/api/auth/login_login_attempts:192.168.1.1"
        async with Redis(connection_pool=fake_redis_pool) as redis:
            cached_data = await redis.get(cache_key)
            assert cached_data is not None
        
        # Test successful completion by running generator to completion
        gen = rate_limited_dependency(request, fake_redis_pool)
        await gen.__anext__()  # Start generator, should yield
        
        # Normally the generator would complete when the endpoint finishes successfully
        # The success recording happens when the generator finishes normally
        try:
            await gen.__anext__()  # Try to get next value, should trigger StopAsyncIteration
        except StopAsyncIteration:
            pass  # This is expected when generator completes normally
        
        # Verify attempts were cleared
        async with Redis(connection_pool=fake_redis_pool) as redis:
            cached_data = await redis.get(cache_key)
            assert cached_data is None


class TestRateLimitingIntegration:
    """Integration tests for rate limiting with Redis."""

    @pytest.mark.asyncio
    async def test_rate_limiting_across_multiple_ips(self, fake_redis_pool: ConnectionPool) -> None:
        """Test that rate limiting is applied per IP address."""
        rate_limiter = LoginRateLimiter()
        
        # Create requests from different IPs
        request1 = Mock()
        request1.headers = {}
        request1.client = Mock()
        request1.client.host = "192.168.1.1"
        
        request2 = Mock()
        request2.headers = {}
        request2.client = Mock()
        request2.client.host = "192.168.1.2"
        
        # Max out attempts for IP1
        for _ in range(settings.login_max_attempts):
            await rate_limiter.record_failed_attempt(request1, fake_redis_pool, "test")
        
        # IP1 should be rate limited
        with pytest.raises(HTTPException) as exc_info:
            await rate_limiter.check_rate_limit(request1, fake_redis_pool, "test")
        assert exc_info.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        
        # IP2 should not be affected
        await rate_limiter.check_rate_limit(request2, fake_redis_pool, "test")

    @pytest.mark.asyncio
    async def test_rate_limiting_ttl_behavior(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test that rate limiting data expires correctly."""
        rate_limiter = LoginRateLimiter()
        request = mock_request("192.168.1.1")
        
        # Record a failed attempt
        await rate_limiter.record_failed_attempt(request, fake_redis_pool, "test")
        
        # Check TTL is set correctly
        cache_key = "test_login_attempts:192.168.1.1"
        async with Redis(connection_pool=fake_redis_pool) as redis:
            ttl = await redis.ttl(cache_key)
            assert ttl > 0
            assert ttl <= settings.login_lockout_time

    @pytest.mark.asyncio
    async def test_rate_limiting_lockout_calculation(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test lockout time calculation and messaging."""
        rate_limiter = LoginRateLimiter()
        request = mock_request("192.168.1.1")
        
        # Record max attempts
        for _ in range(settings.login_max_attempts):
            await rate_limiter.record_failed_attempt(request, fake_redis_pool, "test")
        
        # Next check should show remaining lockout time
        with pytest.raises(HTTPException) as exc_info:
            await rate_limiter.check_rate_limit(request, fake_redis_pool, "test")
        
        assert exc_info.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        detail = exc_info.value.detail
        assert "Too many failed attempts" in detail
        assert "Try again in" in detail
        assert "seconds" in detail

    @pytest.mark.asyncio
    async def test_rate_limiting_concurrent_requests(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test rate limiting with concurrent requests from same IP."""
        rate_limiter = LoginRateLimiter()
        request = mock_request("192.168.1.1")
        
        # Simulate concurrent failed attempts
        import asyncio
        tasks = []
        for _ in range(settings.login_max_attempts - 1):
            task = asyncio.create_task(
                rate_limiter.record_failed_attempt(request, fake_redis_pool, "test"),
            )
            tasks.append(task)
        
        await asyncio.gather(*tasks)
        
        # Should still be under limit
        await rate_limiter.check_rate_limit(request, fake_redis_pool, "test")
        
        # One more attempt should trigger lockout
        await rate_limiter.record_failed_attempt(request, fake_redis_pool, "test")
        
        with pytest.raises(HTTPException):
            await rate_limiter.check_rate_limit(request, fake_redis_pool, "test")

    @pytest.mark.asyncio
    async def test_rate_limiting_redis_connection_handling(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test that Redis connections are properly managed."""
        rate_limiter = LoginRateLimiter()
        request = mock_request("192.168.1.1")
        
        # Perform multiple operations to test connection handling
        await rate_limiter.record_failed_attempt(request, fake_redis_pool, "test")
        await rate_limiter.check_rate_limit(request, fake_redis_pool, "test")
        await rate_limiter.record_success(request, fake_redis_pool, "test")
        
        # Verify final state
        cache_key = "test_login_attempts:192.168.1.1"
        async with Redis(connection_pool=fake_redis_pool) as redis:
            cached_data = await redis.get(cache_key)
            assert cached_data is None