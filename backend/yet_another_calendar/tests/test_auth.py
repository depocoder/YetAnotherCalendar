"""Tests for authentication module."""
import json
import time
from datetime import datetime, timedelta, UTC
from typing import Any
from collections.abc import Callable
from unittest.mock import Mock, patch

import bcrypt
import jwt
import pytest
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from httpx import AsyncClient
from redis.asyncio import ConnectionPool, Redis

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.auth import utils
from yet_another_calendar.web.api.auth.rate_limiter import LoginRateLimiter
from yet_another_calendar.web.api.auth.schema import TutorLoginRequest, TutorLoginResponse


class TestAuthUtils:
    """Tests for authentication utilities."""

    def test_verify_password_correct(self) -> None:
        """Test password verification with correct password."""
        password = "test_password"
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        assert utils.verify_password(password, hashed) is True

    def test_verify_password_incorrect(self) -> None:
        """Test password verification with incorrect password."""
        password = "test_password"
        wrong_password = "wrong_password"
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        assert utils.verify_password(wrong_password, hashed) is False

    def test_create_access_token(self) -> None:
        """Test JWT token creation."""
        token = utils.create_access_token()
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode and verify token content
        payload = jwt.decode(token, settings.tutor_secret_key, algorithms=["HS256"])
        assert payload["sub"] == "tutor"
        assert "exp" in payload
        
        # Verify expiration time is approximately correct
        expected_exp = datetime.now(UTC) + timedelta(seconds=settings.tutor_jwt_time_live)
        actual_exp = datetime.fromtimestamp(payload["exp"], UTC)
        assert abs((expected_exp - actual_exp).total_seconds()) < 60

    def test_verify_tutor_token_valid(self) -> None:
        """Test valid token verification."""
        token = utils.create_access_token()
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        utils.verify_tutor_token(credentials)

    def test_verify_tutor_token_invalid_signature(self) -> None:
        """Test token verification with invalid signature."""
        payload = {"exp": datetime.now(UTC) + timedelta(seconds=3600), "sub": "tutor"}
        token = jwt.encode(payload, "wrong_secret", algorithm="HS256")
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        with pytest.raises(HTTPException) as exc_info:
            utils.verify_tutor_token(credentials)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid authentication credentials" in exc_info.value.detail

    def test_verify_tutor_token_expired(self) -> None:
        """Test token verification with expired token."""
        payload = {"exp": datetime.now(UTC) - timedelta(seconds=1), "sub": "tutor"}
        token = jwt.encode(payload, settings.tutor_secret_key, algorithm="HS256")
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        with pytest.raises(HTTPException) as exc_info:
            utils.verify_tutor_token(credentials)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid authentication credentials" in exc_info.value.detail

    def test_verify_tutor_token_wrong_subject(self) -> None:
        """Test token verification with wrong subject."""
        payload = {"exp": datetime.now(UTC) + timedelta(seconds=3600), "sub": "admin"}
        token = jwt.encode(payload, settings.tutor_secret_key, algorithm="HS256")
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        with pytest.raises(HTTPException) as exc_info:
            utils.verify_tutor_token(credentials)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid authentication credentials" in exc_info.value.detail

    def test_verify_tutor_token_malformed(self) -> None:
        """Test token verification with malformed token."""
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.token.here")
        
        with pytest.raises(HTTPException) as exc_info:
            utils.verify_tutor_token(credentials)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid authentication credentials" in exc_info.value.detail


class TestLoginRateLimiter:
    """Tests for login rate limiter."""

    def test_get_client_ip_from_client(self, mock_request: Callable[[str], Mock]) -> None:
        """Test getting client IP from request.client.host."""
        rate_limiter = LoginRateLimiter()
        request = mock_request("192.168.1.1")
        
        ip = rate_limiter._get_client_ip(request)
        assert ip == "192.168.1.1"

    def test_get_client_ip_from_x_forwarded_for(self, mock_request: Callable[[str], Mock]) -> None:
        """Test getting client IP from X-Forwarded-For header."""
        rate_limiter = LoginRateLimiter()
        request = mock_request("127.0.0.1")
        request.headers = {"X-Forwarded-For": "192.168.1.1, 10.0.0.1"}
        
        ip = rate_limiter._get_client_ip(request)
        assert ip == "192.168.1.1"

    def test_get_client_ip_from_x_real_ip(self, mock_request: Callable[[str], Mock]) -> None:
        """Test getting client IP from X-Real-IP header."""
        rate_limiter = LoginRateLimiter()
        request = mock_request("127.0.0.1")
        request.headers = {"X-Real-IP": "192.168.1.1"}
        
        ip = rate_limiter._get_client_ip(request)
        assert ip == "192.168.1.1"

    def test_get_client_ip_no_client(self) -> None:
        """Test getting client IP when request.client is None."""
        rate_limiter = LoginRateLimiter()
        request = Mock()
        request.headers = {}
        request.client = None
        
        ip = rate_limiter._get_client_ip(request)
        assert ip == "unknown"

    @pytest.mark.asyncio
    async def test_check_rate_limit_no_attempts(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test rate limit check with no previous attempts."""
        rate_limiter = LoginRateLimiter()
        request = mock_request("192.168.1.1")
        
        await rate_limiter.check_rate_limit(request, fake_redis_pool, "test")

    @pytest.mark.asyncio
    async def test_check_rate_limit_within_limit(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test rate limit check with attempts within limit."""
        rate_limiter = LoginRateLimiter()
        request = mock_request("192.168.1.1")
        
        for _ in range(settings.login_max_attempts - 1):
            await rate_limiter.record_failed_attempt(request, fake_redis_pool, "test")
        
        await rate_limiter.check_rate_limit(request, fake_redis_pool, "test")

    @pytest.mark.asyncio
    async def test_check_rate_limit_exceeded(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test rate limit check when limit is exceeded."""
        rate_limiter = LoginRateLimiter()
        request = mock_request("192.168.1.1")
        
        for _ in range(settings.login_max_attempts):
            await rate_limiter.record_failed_attempt(request, fake_redis_pool, "test")
        
        with pytest.raises(HTTPException) as exc_info:
            await rate_limiter.check_rate_limit(request, fake_redis_pool, "test")
        
        assert exc_info.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Too many failed attempts" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_check_rate_limit_expired_lockout(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test rate limit check after lockout period expires."""
        rate_limiter = LoginRateLimiter()
        request = mock_request("192.168.1.1")
        
        cache_key = "test_login_attempts:192.168.1.1"
        expired_lockout_time = time.time() - 1
        attempts_data = {"count": settings.login_max_attempts, "locked_until": expired_lockout_time}
        
        async with Redis(connection_pool=fake_redis_pool) as redis:
            await redis.set(cache_key, json.dumps(attempts_data), ex=settings.login_lockout_time)
        
        await rate_limiter.check_rate_limit(request, fake_redis_pool, "test")
        
        async with Redis(connection_pool=fake_redis_pool) as redis:
            cached_data = await redis.get(cache_key)
            if cached_data:
                data = json.loads(cached_data.decode())
                assert data["count"] == 0
                assert data["locked_until"] == 0

    @pytest.mark.asyncio
    async def test_record_failed_attempt(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test recording a failed login attempt."""
        rate_limiter = LoginRateLimiter()
        request = mock_request("192.168.1.1")
        
        await rate_limiter.record_failed_attempt(request, fake_redis_pool, "test")
        
        cache_key = "test_login_attempts:192.168.1.1"
        async with Redis(connection_pool=fake_redis_pool) as redis:
            cached_data = await redis.get(cache_key)
            assert cached_data is not None
            
            data = json.loads(cached_data.decode())
            assert data["count"] == 1
            assert data["locked_until"] == 0

    @pytest.mark.asyncio
    async def test_record_failed_attempt_triggers_lockout(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test that max failed attempts triggers lockout."""
        rate_limiter = LoginRateLimiter()
        request = mock_request("192.168.1.1")
        
        for i in range(settings.login_max_attempts):
            await rate_limiter.record_failed_attempt(request, fake_redis_pool, "test")
            
            cache_key = "test_login_attempts:192.168.1.1"
            async with Redis(connection_pool=fake_redis_pool) as redis:
                cached_data = await redis.get(cache_key)
                data = json.loads(cached_data.decode())
                assert data["count"] == i + 1
                
                if i + 1 >= settings.login_max_attempts:
                    assert data["locked_until"] > time.time()
                else:
                    assert data["locked_until"] == 0

    @pytest.mark.asyncio
    async def test_record_success(self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock]) -> None:
        """Test recording successful login clears attempts."""
        rate_limiter = LoginRateLimiter()
        request = mock_request("192.168.1.1")
        
        await rate_limiter.record_failed_attempt(request, fake_redis_pool, "test")
        await rate_limiter.record_failed_attempt(request, fake_redis_pool, "test")
        
        cache_key = "test_login_attempts:192.168.1.1"
        async with Redis(connection_pool=fake_redis_pool) as redis:
            cached_data = await redis.get(cache_key)
            assert cached_data is not None
        
        await rate_limiter.record_success(request, fake_redis_pool, "test")
        
        async with Redis(connection_pool=fake_redis_pool) as redis:
            cached_data = await redis.get(cache_key)
            assert cached_data is None

    @pytest.mark.asyncio
    async def test_different_login_types_separate_limits(
        self, fake_redis_pool: ConnectionPool, mock_request: Callable[[str], Mock],
    ) -> None:
        """Test that different login types have separate rate limits."""
        rate_limiter = LoginRateLimiter()
        request = mock_request("192.168.1.1")
        
        for _ in range(settings.login_max_attempts):
            await rate_limiter.record_failed_attempt(request, fake_redis_pool, "type1")
        
        with pytest.raises(HTTPException):
            await rate_limiter.check_rate_limit(request, fake_redis_pool, "type1")
        
        await rate_limiter.check_rate_limit(request, fake_redis_pool, "type2")


class TestAuthViews:
    """Tests for authentication API endpoints."""

    @pytest.mark.asyncio
    @patch('yet_another_calendar.web.api.auth.views.settings.tutor_password_hash', 'hashed_password')
    @patch('yet_another_calendar.web.api.auth.views.utils.verify_password')
    @patch('yet_another_calendar.web.api.auth.views.utils.create_access_token')
    async def test_tutor_login_success(
        self, mock_create_token: Any, mock_verify_password: Any, client: AsyncClient,
    ) -> None:
        """Test successful tutor login."""
        mock_verify_password.return_value = True
        mock_create_token.return_value = "test_token"
        
        response = await client.post("/api/auth/tutor/login", json={"password": "correct_password"})
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["access_token"] == "test_token"
        assert data["token_type"] == "bearer"
        
        mock_verify_password.assert_called_once_with("correct_password", "hashed_password")
        mock_create_token.assert_called_once()

    @pytest.mark.asyncio
    @patch('yet_another_calendar.web.api.auth.views.settings.tutor_password_hash', 'hashed_password')
    @patch('yet_another_calendar.web.api.auth.views.utils.verify_password')
    async def test_tutor_login_wrong_password(self, mock_verify_password: Any, client: AsyncClient) -> None:
        """Test tutor login with wrong password."""
        mock_verify_password.return_value = False
        
        response = await client.post("/api/auth/tutor/login", json={"password": "wrong_password"})
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert data["detail"] == "Invalid password"

    @pytest.mark.asyncio
    @patch('yet_another_calendar.web.api.auth.views.settings.tutor_password_hash', '')
    async def test_tutor_login_not_configured(self, client: AsyncClient) -> None:
        """Test tutor login when not configured."""
        response = await client.post("/api/auth/tutor/login", json={"password": "any_password"})
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        data = response.json()
        assert data["detail"] == "Tutor authentication not configured"

    @pytest.mark.asyncio
    async def test_tutor_login_validation_error(self, client: AsyncClient) -> None:
        """Test tutor login with validation errors."""
        response = await client.post("/api/auth/tutor/login", json={})
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_details = response.json()["detail"]
        assert len(error_details) == 1
        assert error_details[0]["loc"] == ["body", "password"]
        assert "Field required" in error_details[0]["msg"]

    @pytest.mark.asyncio
    @patch('yet_another_calendar.web.api.auth.views.settings.tutor_password_hash', 'hashed_password')
    @patch('yet_another_calendar.web.api.auth.views.utils.verify_password')
    async def test_tutor_login_rate_limiting_integration(
        self, mock_verify_password: Any, client: AsyncClient, fake_redis_pool: ConnectionPool,
    ) -> None:
        """Test that rate limiting is applied to login endpoint."""
        mock_verify_password.return_value = False
        
        for i in range(settings.login_max_attempts):
            response = await client.post("/api/auth/tutor/login", json={"password": "wrong_password"})
            
            if i < settings.login_max_attempts - 1:
                assert response.status_code == status.HTTP_401_UNAUTHORIZED
            else:
                assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        response = await client.post("/api/auth/tutor/login", json={"password": "wrong_password"})
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Too many failed attempts" in response.json()["detail"]


class TestAuthSchemas:
    """Tests for authentication schemas."""

    def test_tutor_login_request_repr_false(self) -> None:
        """Test that password field has repr=False."""
        request = TutorLoginRequest(password="secret")
        
        repr_str = repr(request)
        assert "secret" not in repr_str

    def test_tutor_login_response_default_token_type(self) -> None:
        """Test default token type in response."""
        response = TutorLoginResponse(access_token="test_token")
        
        assert response.access_token == "test_token"
        assert response.token_type == "bearer"

    def test_tutor_login_response_custom_token_type(self) -> None:
        """Test custom token type in response."""
        response = TutorLoginResponse(access_token="test_token", token_type="custom")
        
        assert response.access_token == "test_token"
        assert response.token_type == "custom"