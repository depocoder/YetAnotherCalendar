"""Bound login requests and include their outcomes in public service health."""
import asyncio
import time
from collections.abc import Awaitable
from typing import TypeVar

import httpx
from fastapi import HTTPException
from loguru import logger
from starlette import status

from .. import upstream_health

LABELS = {"netology": "Нетология", "modeus": "Модеус", "lms": "LMS ТюмГУ"}
T = TypeVar("T")


async def authenticate(
        service: upstream_health.ServiceName, call: Awaitable[T], timeout: float = 20,
) -> T:
    started = time.perf_counter()
    category = "ok"
    try:
        async with asyncio.timeout(timeout):
            return await call
    except (TimeoutError, httpx.TransportError, httpx.HTTPStatusError) as exc:
        category = "timeout" if isinstance(exc, TimeoutError) else upstream_health.classify(exc)
        logger.warning(f"{service} authentication is unavailable: {type(exc).__name__}")
        raise HTTPException(
            detail=f"{LABELS[service]} сейчас не отвечает. Попробуйте еще раз через несколько минут.",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        ) from exc
    except Exception as exc:
        category = upstream_health.classify(exc)
        raise
    finally:
        await upstream_health.record([
            upstream_health.Outcome(service, category, round((time.perf_counter() - started) * 1000)),
        ])
