"""ICS subscription endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Response
from redis.asyncio import ConnectionPool

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.auth.rate_limiter import rate_limited_dependency
from . import integration, schema
from ...lifespan import get_redis_pool

router = APIRouter()

_SUB_ID = Path(pattern=r"^[0-9a-f]{32}$")
_SECRET = Path(pattern=r"^[A-Za-z0-9_-]{20,64}$")


@router.post("/")
async def create_subscription(
        request: schema.SubscriptionCreateRequest,
        redis_pool: Annotated[ConnectionPool, Depends(get_redis_pool)],
        _: Annotated[None, Depends(rate_limited_dependency)],
) -> schema.SubscriptionCreateResponse:
    """
    Create an ICS subscription URL.

    Credentials are stored encrypted; the decryption key is derived from the
    secret embedded in the returned URL, so save it — it is shown only once.
    """
    path = await integration.create_subscription(redis_pool, request)
    return schema.SubscriptionCreateResponse(url=f"{settings.app_domain}{path}")


@router.get("/{sub_id}/{secret}/calendar.ics")
async def get_subscription_calendar(
        redis_pool: Annotated[ConnectionPool, Depends(get_redis_pool)],
        sub_id: Annotated[str, _SUB_ID],
        secret: Annotated[str, _SECRET],
) -> Response:
    """
    ICS feed for calendar clients (Google/Apple/Outlook).
    """
    ics_bytes = await integration.get_subscription_ics(redis_pool, sub_id, secret)
    return Response(
        content=ics_bytes,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": 'inline; filename="calendar.ics"'},
    )


@router.delete("/{sub_id}/{secret}")
async def delete_subscription(
        redis_pool: Annotated[ConnectionPool, Depends(get_redis_pool)],
        sub_id: Annotated[str, _SUB_ID],
        secret: Annotated[str, _SECRET],
) -> dict[str, bool]:
    """
    Delete the subscription and every stored artifact of it.
    """
    await integration.delete_subscription(redis_pool, sub_id, secret)
    return {"deleted": True}
