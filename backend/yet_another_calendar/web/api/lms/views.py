from typing import Annotated

from fastapi import APIRouter, Depends

from . import integration, schema
from ..modeus import schema as modeus_schema

router = APIRouter()


@router.post("/auth")
async def get_netology_cookies(
        creds: schema.LxpCreds,
) -> schema.User:
    """
    Auth in LXP and return token.
    """
    return await integration.auth_lms(creds)


@router.get("/courses")
async def get_courses(
        user: Annotated[schema.User, Depends(schema.get_user)],
) -> list[schema.Course]:
    """
    Get LMS courses for current user.
    """
    return await integration.get_courses(user)


@router.get("/course_info")
async def get_user_info(
        user: Annotated[schema.User, Depends(schema.get_user)],
        course_id: int = 2745,
) -> list[schema.ExtendedCourse]:
    """
    Get LMS course info for current user.
    """
    return await integration.get_extended_course(user, course_id)


@router.get("/events")
async def get_events(
        user: Annotated[schema.User, Depends(schema.get_user)],
        body: modeus_schema.ModeusTimeBody = Depends(modeus_schema.get_time_from_query),
) -> list[schema.ModuleResponse]:
    """
    Get LMS events for current user.
    """
    return await integration.get_filtered_courses(user, body)
