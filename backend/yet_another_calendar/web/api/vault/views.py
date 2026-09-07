"""Remember-me endpoints: the browser side of the credentials vault."""
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from redis.asyncio import ConnectionPool, Redis
from starlette import status

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.auth.rate_limiter import rate_limited_dependency
from . import integration, schema
from ...lifespan import get_redis_pool

router = APIRouter()

COOKIE_NAME = "yac_vault"

_INVALID_COOKIE = HTTPException(
    detail="Remember-me session is invalid", status_code=status.HTTP_401_UNAUTHORIZED,
)


def _parse_cookie(cookie_value: str | None) -> tuple[str, str]:
    if not cookie_value or "." not in cookie_value:
        raise _INVALID_COOKIE
    vault_id, secret = cookie_value.split(".", 1)
    if not vault_id or not secret:
        raise _INVALID_COOKIE
    return vault_id, secret


def set_vault_cookie(response: Response, vault_id: str, secret: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=f"{vault_id}.{secret}",
        max_age=settings.vault_time_live,
        httponly=True,
        secure=not settings.debug,
        samesite="lax",
        path="/api",
    )


def clear_vault_cookie(response: Response) -> None:
    response.delete_cookie(key=COOKIE_NAME, path="/api")


@router.post("/")
async def remember_me(
        request: schema.VaultCreateRequest,
        response: Response,
        redis_pool: Annotated[ConnectionPool, Depends(get_redis_pool)],
        _: Annotated[None, Depends(rate_limited_dependency)],
) -> schema.VaultStatus:
    """
    Store the credentials encrypted and hand this browser an httpOnly grant cookie.

    Credentials are expected to be already verified by the login flow, so no
    extra upstream calls happen here.
    """
    vault_id, secret = await integration.create_vault(
        redis_pool,
        schema.EncryptedCreds(netology=request.netology, lxp=request.lxp),
        modeus_person_id=request.modeus_person_id,
        calendar_ids=request.calendar_ids,
        time_zone=request.time_zone,
        grant_kind="browser",
    )
    set_vault_cookie(response, vault_id, secret)
    return schema.VaultStatus(active=True)


@router.get("/")
async def vault_status(
        redis_pool: Annotated[ConnectionPool, Depends(get_redis_pool)],
        yac_vault: Annotated[str | None, Cookie()] = None,
) -> schema.VaultStatus:
    """
    Whether this browser holds a working remember-me grant.
    """
    if not yac_vault:
        return schema.VaultStatus(active=False)
    try:
        vault_id, secret = _parse_cookie(yac_vault)
        async with Redis(connection_pool=redis_pool) as redis:
            record, _, _ = await integration.resolve(redis, vault_id, secret)
    except HTTPException:
        return schema.VaultStatus(active=False)
    return schema.VaultStatus(active=True, broken=record.broken)


@router.post("/refresh")
async def refresh_session(
        redis_pool: Annotated[ConnectionPool, Depends(get_redis_pool)],
        yac_vault: Annotated[str | None, Cookie()] = None,
) -> schema.RefreshedSession:
    """
    Re-authenticate in upstream services using the remembered credentials.

    Returns fresh tokens for the frontend to store. 401 means the grant is
    gone or the remembered password no longer works.
    """
    vault_id, secret = _parse_cookie(yac_vault)
    async with Redis(connection_pool=redis_pool) as redis:
        record, _, dek = await integration.resolve(redis, vault_id, secret)
        tokens = await integration.get_cached_tokens(redis, vault_id)
        if tokens is None:
            creds = integration.decrypt_creds(dek, record)
            try:
                tokens = await integration.refresh_tokens(redis, vault_id, creds)
            except HTTPException as exception:
                if integration.is_auth_error(exception):
                    await integration.mark_broken(redis, vault_id, record, broken=True)
                raise
        if record.broken:
            await integration.mark_broken(redis, vault_id, record, broken=False)
    return schema.RefreshedSession(
        **tokens.model_dump(),
        modeus_person_id=record.modeus_person_id,
        calendar_ids=record.calendar_ids,
        time_zone=record.time_zone,
    )


@router.delete("/")
async def forget_me(
        response: Response,
        redis_pool: Annotated[ConnectionPool, Depends(get_redis_pool)],
        yac_vault: Annotated[str | None, Cookie()] = None,
) -> schema.VaultStatus:
    """
    Delete this browser's grant (and the vault itself with its last grant).
    """
    if yac_vault:
        try:
            vault_id, secret = _parse_cookie(yac_vault)
            async with Redis(connection_pool=redis_pool) as redis:
                await integration.delete_grant(redis, vault_id, secret)
        except HTTPException:
            pass  # Cookie is stale: still clear it below.
    clear_vault_cookie(response)
    return schema.VaultStatus(active=False)
