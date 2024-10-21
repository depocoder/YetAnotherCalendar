from fastapi import APIRouter

from . import integration, schema
from ..modeus.schema import ModeusTimeBody

router = APIRouter()


@router.post("/auth")
async def get_netology_cookies(
        creds: schema.LxpCreds,
) -> schema.User:
    """
    Auth in LXP and return token.
    """
    return await integration.auth_lms(creds)


@router.post("/courses")
async def get_courses(
        user: schema.User,
) -> list[schema.Course]:
    """
    Get LMS courses for current user.
    """
    return await integration.get_courses(user)


@router.post("/course_info")
async def get_user_info(
        user: schema.User,
        course_id: int = 2745,
) -> list[schema.ExtendedCourse]:
    """
    Get LMS course info for current user.
    """
    return await integration.get_extended_course(user, course_id)


@router.post("/events")
async def get_events(
        user: schema.User,
        body: ModeusTimeBody,
) -> list[schema.ModuleResponse]:
    """
    Get LMS events for current user.
    """
    return await integration.get_filtered_courses(user, body)
