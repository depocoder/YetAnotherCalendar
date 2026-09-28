"""Grades endpoint: served to remembered users only."""
import datetime
from typing import Annotated

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException
from pydantic import ValidationError
from redis.asyncio import ConnectionPool, Redis
from starlette import status

from . import integration, schema
from ..errors import is_auth_error
from ..netology import schema as netology_schema
from ..vault import integration as vault_integration
from ..vault.views import parse_cookie
from ...lifespan import get_redis_pool

router = APIRouter()


async def remembered_lesson_marks(
        redis_pool: ConnectionPool | None,
        yac_vault: str | None,
        person_id: str,
        starts: dict[str, datetime.datetime],
) -> dict[str, schema.LessonGrades]:
    """Lesson marks for an exported calendar of a remembered browser.

    Empty without "remember me", with a stale cookie, or when the remembered
    account is not the person whose calendar is exported.
    """
    if not yac_vault or redis_pool is None or not starts:
        return {}
    try:
        vault_id, secret = parse_cookie(yac_vault)
        async with Redis(connection_pool=redis_pool) as redis:
            record, _, dek = await vault_integration.resolve(redis, vault_id, secret)
            if record.modeus_person_id != person_id:
                return {}

            async def get_token(force: bool) -> str:
                return await vault_integration.get_modeus_token(redis, vault_id, record, dek, force=force)

            return await integration.vault_lesson_marks(get_token, starts)
    except HTTPException:
        return {}


@router.get("/")
async def get_grades(
        redis_pool: Annotated[ConnectionPool, Depends(get_redis_pool)],
        yac_vault: Annotated[str | None, Cookie()] = None,
        period_id: str | None = None,
) -> schema.GradesResponse:
    """
    Grades, ratings and attendance of one semester from Modeus.

    Modeus shows them to the student alone, so they are read with the
    student's own token, and the token needs the remembered password:
    401 means this browser has no "remember me", 403 that Modeus no longer
    accepts the remembered password. The current semester is returned
    unless period_id names another one from `periods`.
    """
    vault_id, secret = parse_cookie(yac_vault)
    async with Redis(connection_pool=redis_pool) as redis:
        record, _, dek = await vault_integration.resolve(redis, vault_id, secret)

        async def get_token(force: bool) -> str:
            try:
                return await vault_integration.get_modeus_token(redis, vault_id, record, dek, force=force)
            except HTTPException as exception:
                if is_auth_error(exception):
                    raise HTTPException(
                        detail="Modeus rejected the remembered credentials",
                        status_code=status.HTTP_403_FORBIDDEN,
                    ) from exception
                raise

        try:
            return await integration.get_grades_with_retry(get_token, period_id)
        except (httpx.HTTPError, ValidationError) as exception:
            raise HTTPException(
                detail="Modeus is unavailable", status_code=status.HTTP_502_BAD_GATEWAY,
            ) from exception


@router.get("/netology/")
async def get_netology_grades(
        cookies: Annotated[netology_schema.NetologyCookies, Depends(netology_schema.get_cookies_from_headers)],
) -> schema.NetologyGradesResponse:
    """
    Homework statuses and scores of every Netology program, and the latest expert review.

    Netology grades homework with a review status and a word, not points.
    401 means the Netology session expired.
    """
    try:
        return await integration.get_netology_grades(cookies)
    except (httpx.HTTPError, ValidationError) as exception:
        raise HTTPException(
            detail="Netology is unavailable", status_code=status.HTTP_502_BAD_GATEWAY,
        ) from exception
