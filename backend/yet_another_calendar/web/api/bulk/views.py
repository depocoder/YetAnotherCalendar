"""
Modeus API implemented using a controller.
"""
from typing import Annotated

from fastapi import APIRouter, Cookie, Header, BackgroundTasks, HTTPException, Response
from fastapi.params import Depends
from starlette.responses import StreamingResponse
from redis.asyncio import ConnectionPool, Redis
from starlette import status

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.auth.utils import verify_tutor_token
from yet_another_calendar.web.api.auth.utils import calendar_person_id
from . import integration, schema
from ..grades import views as grades_views
from ..lms import integration as lms_integration
from ..lms import schema as lms_schema
from ..modeus import schema as modeus_schema
from ..modeus import integration as modeus_integration
from ..netology import schema as netology_schema
from ..vault import integration as vault_integration
from ..vault.views import parse_cookie
from ...lifespan import get_redis_pool

router = APIRouter()


@router.get("/events/")
async def get_calendar(
        body: Annotated[modeus_schema.ModeusTimeBody, Depends(modeus_schema.get_time_from_query)],
        modeus_person_id: Annotated[str, Header()],
        background_tasks: BackgroundTasks,
        redis: Annotated[ConnectionPool, Depends(get_redis_pool)],
        response: Response,
        calendar_id: Annotated[
            int | tuple[int, ...], Depends(netology_schema.get_calendar_ids_from_query),
        ] = settings.netology_default_course_id,
        time_zone: str = "Europe/Moscow",
        cache_only: bool = False,
        lxp_token: Annotated[str | None, Header()] = None,
        lxp_id: Annotated[int | None, Header()] = None,
        netology_session: Annotated[str | None, Header(alias="_netology-on-rails_session")] = None,
        yac_calendar: Annotated[str | None, Cookie()] = None,
        yac_vault: Annotated[str | None, Cookie()] = None,
) -> schema.CalendarResponse:
    """
    Get events from Netology, Modeus and LMS, cached.

    A service that is down does not fail the request: its part comes from
    the cache (or stays empty) and the service is listed in `failures`.
    """
    background_tasks.add_task(integration.save_user_was_there, redis, modeus_person_id)
    if cache_only:
        owner = calendar_person_id(yac_calendar)
        if owner is None and yac_vault:
            vault_id, secret = parse_cookie(yac_vault)
            async with Redis(connection_pool=redis) as redis_client:
                record, grant, _ = await vault_integration.resolve(redis_client, vault_id, secret)
            if grant.kind == "browser":
                owner = record.modeus_person_id
        if owner is None or owner != modeus_person_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Login required to read this calendar")
        response.headers["Cache-Control"] = "private, no-store"
        calendar = await integration.load_cached_calendar(body, calendar_id, modeus_person_id)
        if calendar is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Для этой недели сохраненного расписания нет. Попробуйте войти позже.",
            )
        return calendar.change_timezone(time_zone)
    if lxp_token is None or lxp_id is None or netology_session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login required to load new weeks")
    lms_user = lms_schema.User(token=lxp_token, id=lxp_id)
    cookies = netology_schema.NetologyCookies.model_validate({"_netology-on-rails_session": netology_session})
    calendar = await integration.get_cached_calendar(
        body, calendar_id, modeus_person_id,
        cookies=cookies, lms_user=lms_user,
    )
    return calendar.change_timezone(time_zone)


@router.get("/refresh_events/")
async def refresh_calendar(
        body: Annotated[modeus_schema.ModeusTimeBody, Depends(modeus_schema.get_time_from_query)],
        lms_user: Annotated[lms_schema.User, Depends(lms_schema.get_user)],
        cookies: Annotated[netology_schema.NetologyCookies, Depends(netology_schema.get_cookies_from_headers)],
        donor_token: Annotated[str, Depends(modeus_integration.get_donor_token)],
        modeus_person_id: Annotated[str, Header()],
        calendar_id: Annotated[
            int | tuple[int, ...], Depends(netology_schema.get_calendar_ids_from_query),
        ] = settings.netology_default_course_id,
        time_zone: str = "Europe/Moscow",
) -> schema.RefreshedCalendarResponse:
    """
    Refresh events in redis.
    """
    return await integration.refresh_events(
        body, lms_user, calendar_id, cookies, time_zone, donor_token, modeus_person_id,
    )


@router.get("/export_ics/")
async def export_ics(
        body: Annotated[modeus_schema.ModeusTimeBody, Depends(modeus_schema.get_time_from_query)],
        lms_user: Annotated[lms_schema.User, Depends(lms_schema.get_user)],
        cookies: Annotated[netology_schema.NetologyCookies, Depends(netology_schema.get_cookies_from_headers)],
        donor_token: Annotated[str, Depends(modeus_integration.get_donor_token)],
        modeus_person_id: Annotated[str, Header()],
        calendar_id: Annotated[
            int | tuple[int, ...], Depends(netology_schema.get_calendar_ids_from_query),
        ] = settings.netology_default_course_id,
        time_zone: str = "Europe/Moscow",
        redis_pool: Annotated[ConnectionPool | None, Depends(get_redis_pool)] = None,
        yac_vault: Annotated[str | None, Cookie()] = None,
) -> StreamingResponse:
    """
    Export into .ics format.

    A remembered browser also gets attendance and grades of the past Modeus pairs.
    """
    fallback = await integration.load_cached_calendar(body, calendar_id, modeus_person_id)
    calendar = await integration.get_calendar(
        body, calendar_id, modeus_person_id,
        modeus_jwt_token=donor_token, lms_user=lms_user, cookies=cookies, fallback=fallback,
    )
    calendar_with_timezone = calendar.change_timezone(time_zone)
    lesson_marks = await grades_views.remembered_lesson_marks(
        redis_pool, yac_vault, modeus_person_id,
        {str(event.id): event.start_time for event in calendar_with_timezone.utmn.modeus_events},
    )
    lms_grades = await lms_integration.get_modules_grades(lms_user, calendar_with_timezone.utmn.lms_events)
    return StreamingResponse(integration.export_to_ics(calendar_with_timezone, lesson_marks, lms_grades))


@router.get("/user_metrix/")
async def get_user_metrix(
    redis: Annotated[ConnectionPool, Depends(get_redis_pool)],
    _: Annotated[None, Depends(verify_tutor_token)],
) -> int:
    """
    Get week users metrix
    """
    return await integration.count_keys_by_prefix(redis_pool=redis)
