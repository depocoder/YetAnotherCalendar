"""Grades from Modeus, read with the student's own token.

The requests mirror what the Modeus "Мои результаты" page does: the
student card lists the semesters, the ratings and attendance rates come
for all of them at once, and the results table of one semester comes in
two parts - the course units with their lessons, then the grades for them.
"""
import asyncio
import datetime
from collections.abc import Awaitable, Callable
from typing import Any, TypeVar
from zoneinfo import ZoneInfo

import httpx
import reretry
from fastapi import HTTPException
from httpx import AsyncClient
from loguru import logger
from starlette import status

from yet_another_calendar.settings import settings
from . import schema
from ..modeus.schema import get_person_id
from ..netology import integration as netology_integration
from ..netology import schema as netology_schema

# Semesters change on Tyumen dates.
_MODEUS_TIME_ZONE = ZoneInfo("Asia/Yekaterinburg")
T = TypeVar("T")
# Grades of the course unit as a whole, the most final one first.
_COURSE_RESULT_ORDER = ("COURSE_UNIT_RESULT", "CURRENT_COURSE_UNIT_RESULT")


class ModeusClient:
    """Modeus API calls sharing one connection and one token."""

    def __init__(self, session: AsyncClient) -> None:
        self.session = session

    @reretry.retry(exceptions=httpx.TransportError, tries=settings.retry_tries, delay=settings.retry_delay)
    async def request(self, method: str, url: str, **kwargs: Any) -> Any:
        response = await self.session.request(method, url, **kwargs)
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            raise HTTPException(detail="Modeus token expired!", status_code=status.HTTP_401_UNAUTHORIZED)
        response.raise_for_status()
        return response.json()


def modeus_session(token: str, timeout: int = 15) -> AsyncClient:
    return AsyncClient(
        http2=True,
        base_url=settings.modeus_base_url,
        timeout=timeout,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )


def build_course_grades(
        table: schema.ResultsTable, details: schema.ResultsDetails,
) -> list[schema.CourseGrades]:
    """Put the grades onto the course units and lessons they belong to."""
    academic_course_by_unit = {
        unit_id: course.name for course in table.academic_courses for unit_id in course.course_unit_ids
    }
    rates = {rate.course_unit_id: rate for rate in details.course_unit_rates}
    attendance = {mark.lesson_id: mark.result for mark in details.attendances}
    unit_results: dict[str, list[schema.CourseUnitControlObject]] = {}
    for unit_result in details.course_unit_results:
        unit_results.setdefault(unit_result.course_unit_id, []).append(unit_result)
    lesson_results: dict[str, list[schema.LessonControlObject]] = {}
    for lesson_result in details.lesson_results:
        lesson_results.setdefault(lesson_result.lesson_id, []).append(lesson_result)

    courses = []
    for unit in table.course_units:
        results = []
        ordered = sorted(
            unit_results.get(unit.id, []),
            key=lambda item: (_COURSE_RESULT_ORDER.index(item.type_code)
                              if item.type_code in _COURSE_RESULT_ORDER else len(_COURSE_RESULT_ORDER)),
        )
        for control in ordered:
            result = control.final if control.final and control.final.value else control.current
            if result and result.value and not result.is_placeholder:
                results.append(_result(control, result))
        lessons = []
        for lesson in unit.lessons:
            lesson_grades = [
                _result(control, control.result)
                for control in sorted(lesson_results.get(lesson.id, []), key=lambda item: item.order or 0)
                if control.result and control.result.value
            ]
            if not lesson_grades and not attendance.get(lesson.id):
                continue
            lessons.append(schema.LessonGrades(
                id=lesson.id, event_id=lesson.event_id, name=lesson.name, type=lesson.type, type_name=lesson.type_name,
                team=lesson.team, starts_at=lesson.starts_at, attendance=attendance.get(lesson.id),
                results=lesson_grades,
            ))
        lessons.sort(key=lambda item: (item.starts_at is None, item.starts_at or datetime.datetime.min))
        rate = rates.get(unit.id)
        courses.append(schema.CourseGrades(
            id=unit.id, name=unit.name, academic_course=academic_course_by_unit.get(unit.id),
            results=results, lessons=lessons,
            attendance=schema.AttendanceRate(**rate.model_dump()) if rate else None,
        ))
    return courses


def _result(control: schema.ControlObject, result: schema.ModeusResult) -> schema.Result:
    return schema.Result(
        name=control.type_name or control.type_code or "Оценка", code=control.type_code,
        scale=control.scale, value=result.value or "", updated_at=result.updated_at,
    )


async def _optional(call: Awaitable[T], what: str) -> T | None:
    """Ratings and attendance only decorate the grades: their failure must not hide them.

    ValueError covers both a non-JSON body and an unexpected shape.
    """
    try:
        return await call
    except (httpx.HTTPError, HTTPException, ValueError):
        logger.exception(f"Can't load Modeus {what}, showing grades without it")
        return None


async def _ratings(client: ModeusClient, student_id: str, period_ids: list[str]) -> schema.RatingsResponse:
    return schema.RatingsResponse.model_validate(await client.request(
        "POST", settings.modeus_ratings_part, json={"studentId": student_id, "aprId": period_ids},
    ))


async def _attendance_rates(client: ModeusClient, student_id: str) -> list[schema.PeriodAttendanceRate]:
    rates = await client.request("POST", settings.modeus_attendance_rates_part, json={"studentId": student_id})
    return [schema.PeriodAttendanceRate.model_validate(rate) for rate in rates]


async def get_grades(token: str, period_id: str | None = None) -> schema.GradesResponse:
    """Grades of one semester (the current one unless asked) plus the list of semesters."""
    person_id = get_person_id(token)
    async with modeus_session(token) as session:
        client = ModeusClient(session)
        people = schema.PersonsSearchResponse.model_validate(await client.request(
            "POST", settings.modeus_search_people_part, json={"id": [person_id], "size": 10},
        ))
        student_id = people.pick_student_id(person_id)
        if student_id is None:
            raise HTTPException(detail="Modeus knows no student record of this person",
                                status_code=status.HTTP_404_NOT_FOUND)
        card = schema.StudentCard.model_validate(await client.request(
            "GET", settings.modeus_student_card_part, params={"studentId": student_id},
        ))
        today = datetime.datetime.now(tz=_MODEUS_TIME_ZONE).date()
        period = card.pick_period(period_id, today)
        periods = [
            schema.Period(id=item.id, name=item.name, number=item.number,
                          start_date=item.start_date, end_date=item.end_date)
            for item in sorted(card.periods, key=lambda item: item.start_date)
        ]
        if period is None:
            if period_id is not None:
                raise HTTPException(detail="Unknown semester", status_code=status.HTTP_404_NOT_FOUND)
            return schema.GradesResponse(periods=periods)

        ratings, rates, table_raw = await asyncio.gather(
            _optional(_ratings(client, student_id, [item.id for item in card.periods]), "ratings"),
            _optional(_attendance_rates(client, student_id), "attendance rates"),
            client.request("POST", settings.modeus_results_primary_part, json={
                "personId": person_id,
                "withMidcheckModulesIncluded": False,
                "aprId": period.id,
                "studentId": student_id,
                "curriculumFlowId": period.curriculum_flow_id,
                "curriculumPlanId": period.curriculum_plan_id,
            }),
        )
        table = schema.ResultsTable.model_validate(table_raw)
        details = schema.ResultsDetails()
        if table.course_units:
            details = schema.ResultsDetails.model_validate(await client.request(
                "POST", settings.modeus_results_secondary_part, json={
                    "courseUnitRealizationId": [unit.id for unit in table.course_units],
                    "academicCourseId": [course.id for course in table.academic_courses],
                    "personId": person_id,
                    "studentId": student_id,
                },
            ))

    gpa = cgpa = attendance = None
    if ratings is not None:
        cgpa = schema.Rating(**ratings.cgpa.model_dump()) if ratings.cgpa else None
        period_gpa = next((rating for rating in ratings.gpa if rating.period_id == period.id), None)
        gpa = schema.Rating(**period_gpa.model_dump(exclude={"period_id"})) if period_gpa else None
    if rates is not None:
        period_rate = next((rate for rate in rates if rate.period.id == period.id), None)
        attendance = schema.AttendanceRate(**period_rate.model_dump(exclude={"period"})) if period_rate else None
    return schema.GradesResponse(
        periods=periods, period_id=period.id, gpa=gpa, cgpa=cgpa, attendance=attendance,
        courses=build_course_grades(table, details),
    )


async def get_grades_with_retry(
        get_token: Callable[[bool], Awaitable[str]], period_id: str | None = None,
) -> schema.GradesResponse:
    """Read the grades, re-logging in once when Modeus rejects a cached token."""
    try:
        return await get_grades(await get_token(False), period_id)
    except HTTPException as exception:
        if exception.status_code != status.HTTP_401_UNAUTHORIZED:
            raise
    return await get_grades(await get_token(True), period_id)


async def _netology_actual(cookies: netology_schema.NetologyCookies) -> schema.NetologyActual:
    return schema.NetologyActual.model_validate(await netology_integration.send_request(
        cookies, {"method": "GET", "url": settings.netology_student_actual_part},
    ))


async def _netology_program_homework(
        cookies: netology_schema.NetologyCookies, program_id: int, limit: asyncio.Semaphore,
) -> schema.NetologyProgramHomework:
    async with limit:
        return schema.NetologyProgramHomework.model_validate(await netology_integration.send_request(cookies, {
            "method": "GET",
            "url": settings.netology_program_homework_part.format(program_id=program_id),
            "params": [("q[resource_type_in][]", resource) for resource in settings.netology_homework_resource_types],
        }))


async def get_netology_grades(cookies: netology_schema.NetologyCookies) -> schema.NetologyGradesResponse:
    """Homework of every Netology program with its status and link, plus the latest expert review.

    The summary of all programs (one slow request, the way the profile page
    asks) lists the programs; the homework of each comes from its "all
    homework" page. Every program is asked: the summary leaves out lessons of
    some programs (an introductory course had homework and no lessons there).
    A program whose list fails keeps the summary's reviewed homework.
    """
    calendar_raw, actual = await asyncio.gather(
        netology_integration.send_request(
            cookies, {"method": "GET", "url": settings.netology_student_calendar_part}, timeout=30,
        ),
        _optional(_netology_actual(cookies), "Netology expert feedback"),
    )
    calendar = schema.NetologyStudentCalendar.model_validate(calendar_raw)
    program_ids = list(dict.fromkeys(program.program_id for program in calendar.programs if program.program_id))
    limit = asyncio.Semaphore(5)
    homework = await asyncio.gather(*[
        _optional(_netology_program_homework(cookies, program_id, limit), f"Netology homework of {program_id}")
        for program_id in program_ids
    ])
    homework_by_program = {
        program_id: program_homework
        for program_id, program_homework in zip(program_ids, homework, strict=True) if program_homework is not None
    }
    return schema.NetologyGradesResponse.build(calendar, homework_by_program, actual)
