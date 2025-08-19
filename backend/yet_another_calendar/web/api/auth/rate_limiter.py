"""Rate limiting utilities for authentication."""
import json
import logging
import time
from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException, Request, status
from redis.asyncio import ConnectionPool, Redis

from yet_another_calendar.settings import settings
from yet_another_calendar.web.lifespan import get_redis_pool

logger = logging.getLogger(__name__)


class LoginRateLimiter:
    """Rate limiter for login attempts."""
    
    async def check_rate_limit(
        self, request: Request, redis_pool: ConnectionPool, login_type: str = "general",
    ) -> None:
        """Check if IP is rate limited."""
        client_ip = self._get_client_ip(request)
        cache_key = f"{login_type}_login_attempts:{client_ip}"
        
        async with Redis(connection_pool=redis_pool) as redis:
            cached_data = await redis.get(cache_key)
            if cached_data is None:
                attempts_data = {"count": 0, "locked_until": 0}
            else:
                attempts_data = json.loads(cached_data.decode())
            
            current_time = time.time()
            
            if attempts_data["locked_until"] > current_time:
                lockout_remaining = int(attempts_data["locked_until"] - current_time)
                logger.warning(f"Rate limited {login_type} login attempt from {client_ip}")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many failed attempts. Try again in {lockout_remaining} seconds.",
                )
            
            if attempts_data["locked_until"] > 0 and current_time > attempts_data["locked_until"]:
                attempts_data = {"count": 0, "locked_until": 0}
                await redis.set(
                    cache_key, 
                    json.dumps(attempts_data), 
                    ex=settings.login_lockout_time,
                )
    
    async def record_failed_attempt(
        self, request: Request, redis_pool: ConnectionPool, login_type: str = "general",
    ) -> None:
        """Record a failed login attempt."""
        client_ip = self._get_client_ip(request)
        cache_key = f"{login_type}_login_attempts:{client_ip}"
        
        async with Redis(connection_pool=redis_pool) as redis:
            cached_data = await redis.get(cache_key)
            if cached_data is None:
                attempts_data = {"count": 0, "locked_until": 0}
            else:
                attempts_data = json.loads(cached_data.decode())
            
            attempts_data["count"] += 1
            current_time = time.time()
            
            logger.warning(f"Failed {login_type} login attempt from {client_ip} (attempt {attempts_data['count']})")
            
            if attempts_data["count"] >= settings.login_max_attempts:
                attempts_data["locked_until"] = current_time + settings.login_lockout_time
                logger.warning(
                    f"IP {client_ip} locked out for {login_type} login for {settings.login_lockout_time} seconds",
                )
            
            await redis.set(
                cache_key, 
                json.dumps(attempts_data), 
                ex=settings.login_lockout_time,
            )
    
    async def record_success(
        self, request: Request, redis_pool: ConnectionPool, login_type: str = "general",
    ) -> None:
        """Clear failed attempts on successful login."""
        client_ip = self._get_client_ip(request)
        cache_key = f"{login_type}_login_attempts:{client_ip}"
        
        async with Redis(connection_pool=redis_pool) as redis:
            await redis.delete(cache_key)
            logger.info(f"Successful {login_type} login from {client_ip}")
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"


async def rate_limited_dependency(
            request: Request,
            redis_pool: ConnectionPool = Depends(get_redis_pool),
        ) -> AsyncGenerator[None, None]:
            login_type = str(request.url)
            # Check rate limit before proceeding function
            rate_limiter = LoginRateLimiter()
            await rate_limiter.check_rate_limit(request, redis_pool, login_type)
            
            try:
                # Execute the original function with its original parameters
                yield
                # Record successful authentication
                await rate_limiter.record_success(request, redis_pool, login_type)
                return
                
            except HTTPException as e:
                # Record failed attempt for authentication errors
                if e.status_code == status.HTTP_401_UNAUTHORIZED:
                    await rate_limiter.record_failed_attempt(request, redis_pool, login_type)
                raise