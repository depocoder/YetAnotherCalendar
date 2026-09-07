"""ICS subscription endpoints."""
import re
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from redis.asyncio import ConnectionPool
from starlette import status

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.auth.rate_limiter import rate_limited_dependency
from . import integration, schema
from ...lifespan import get_redis_pool

router = APIRouter()

_SUB_ID_RE = re.compile(r"^[0-9a-f]{32}$")
_SECRET_RE = re.compile(r"^[A-Za-z0-9_-]{20,64}$")


async def validated_path(sub_id: str, secret: str) -> tuple[str, str]:
    """Validate path params manually.

    Deliberately not a Path(pattern=...): a pattern mismatch raises
    RequestValidationError which echoes the received value into logs and the
    response body - and the value here is a client-held secret.
    """
    if not (_SUB_ID_RE.fullmatch(sub_id) and _SECRET_RE.fullmatch(secret)):
        raise HTTPException(detail="Subscription not found", status_code=status.HTTP_404_NOT_FOUND)
    return sub_id, secret


@router.post("/")
async def create_subscription(
        request: schema.SubscriptionCreateRequest,
        redis_pool: Annotated[ConnectionPool, Depends(get_redis_pool)],
        _: Annotated[None, Depends(rate_limited_dependency)],
        yac_vault: Annotated[str | None, Cookie()] = None,
) -> schema.SubscriptionCreateResponse:
    """
    Create an ICS subscription URL.

    With credentials in the body they are verified and stored encrypted in a
    new vault. Without them a remember-me cookie is required: the new
    subscription reuses the already remembered credentials. Either way the
    decryption key is embedded in the returned URL - save it, it is shown
    only once.
    """
    if request.has_creds:
        path = await integration.create_subscription(redis_pool, request)
    else:
        if not yac_vault or "." not in yac_vault:
            raise HTTPException(
                detail="Provide credentials or sign in with remember me first",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )
        vault_id, secret = yac_vault.split(".", 1)
        path = await integration.create_subscription_from_vault(
            redis_pool, vault_id, secret, request.calendar_ids, request.time_zone,
        )
    return schema.SubscriptionCreateResponse(url=f"{settings.app_domain}{path}")


@router.get("/{sub_id}/{secret}/calendar.ics")
async def get_subscription_calendar(
        redis_pool: Annotated[ConnectionPool, Depends(get_redis_pool)],
        path: Annotated[tuple[str, str], Depends(validated_path)],
) -> Response:
    """
    ICS feed for calendar clients (Google/Apple/Outlook).
    """
    sub_id, secret = path
    ics_bytes = await integration.get_subscription_ics(redis_pool, sub_id, secret)
    return Response(
        content=ics_bytes,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": 'inline; filename="calendar.ics"'},
    )


@router.delete("/{sub_id}/{secret}")
async def delete_subscription(
        redis_pool: Annotated[ConnectionPool, Depends(get_redis_pool)],
        path: Annotated[tuple[str, str], Depends(validated_path)],
) -> dict[str, bool]:
    """
    Delete the subscription and its stored artifacts.
    """
    sub_id, secret = path
    await integration.delete_subscription(redis_pool, sub_id, secret)
    return {"deleted": True}
