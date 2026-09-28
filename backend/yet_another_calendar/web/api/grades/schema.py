"""Grades from the Modeus "Мои результаты" page.

Upstream models mirror the students-app responses and are lenient: every
field the page may leave out is optional, and unknown fields are ignored.
The response models are what the calendar shows - no personal data of the
student and no names of the teachers who put the grades.
"""
import datetime
import re
from typing import Any
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field, field_validator

from yet_another_calendar.settings import settings
from ..netology.schema import deadline_from_title, review_status


def _date_part(value: Any) -> Any:
    """Modeus sends dates both as "2025-09-01" and as "2025-09-01T00:00:00"."""
    return value.split("T", 1)[0] if isinstance(value, str) else value


# --- Modeus responses -------------------------------------------------------

class StudentRecord(BaseModel):
    """One study record of a person (persons search, `students`)."""
    id: str
    person_id: str | None = Field(alias="personId", default=None)
    learning_start_date: datetime.date | None = Field(alias="learningStartDate", default=None)
    learning_end_date: datetime.date | None = Field(alias="learningEndDate", default=None)

    _dates = field_validator("learning_start_date", "learning_end_date", mode="before")(_date_part)


class PersonsSearchEmbedded(BaseModel):
    students: list[StudentRecord] = Field(default_factory=list)


class PersonsSearchResponse(BaseModel):
    embedded: PersonsSearchEmbedded = Field(alias="_embedded", default_factory=PersonsSearchEmbedded)

    def pick_student_id(self, person_id: str) -> str | None:
        """The ongoing study record of the person, else the latest one."""
        records = [record for record in self.embedded.students if record.person_id in (None, person_id)]
        if not records:
            return None
        ongoing = [record for record in records if record.learning_end_date is None]
        return max(ongoing or records, key=lambda record: record.learning_start_date or datetime.date.min).id


class AcademicPeriod(BaseModel):
    """A semester (academic period realization, "apr")."""
    id: str
    name: str = ""
    number: int | None = None
    start_date: datetime.date = Field(alias="startDate")
    end_date: datetime.date = Field(alias="endDate")
    curriculum_flow_id: str | None = Field(alias="curriculumFlowId", default=None)
    curriculum_plan_id: str | None = Field(alias="curriculumPlanId", default=None)

    _dates = field_validator("start_date", "end_date", mode="before")(_date_part)


class StudentCard(BaseModel):
    periods: list[AcademicPeriod] = Field(alias="academicPeriodRealizations", default_factory=list)

    def pick_period(self, period_id: str | None, today: datetime.date) -> AcademicPeriod | None:
        """The requested semester, else the current one, else the last one that started, else the first."""
        if period_id is not None:
            return next((period for period in self.periods if period.id == period_id), None)
        if not self.periods:
            return None
        current = [period for period in self.periods if period.start_date <= today <= period.end_date]
        started = [period for period in self.periods if period.start_date <= today]
        if current or started:
            return max(current or started, key=lambda period: period.start_date)
        return min(self.periods, key=lambda period: period.start_date)


class ModeusRating(BaseModel):
    score: float | None = None
    position: int | None = Field(alias="byCurriculumFlow", default=None)
    total: int | None = Field(alias="totalByCurriculumFlow", default=None)


class PeriodRating(ModeusRating):
    period_id: str = Field(alias="aprId")


class RatingsResponse(BaseModel):
    cgpa: ModeusRating | None = Field(alias="cgpaRating", default=None)
    gpa: list[PeriodRating] = Field(alias="gpaRatings", default_factory=list)


class ModeusAttendanceRate(BaseModel):
    present: float = Field(alias="presentRate", default=0)
    absent: float = Field(alias="absentRate", default=0)
    undefined: float = Field(alias="undefinedRate", default=0)


class PeriodReference(BaseModel):
    id: str


class PeriodAttendanceRate(ModeusAttendanceRate):
    period: PeriodReference = Field(alias="academicPeriodRealization")


class ModeusLesson(BaseModel):
    id: str
    name: str = ""
    order: int | None = Field(alias="orderIndex", default=None)
    team: str | None = Field(alias="teamName", default=None)
    type: str | None = Field(alias="lessonType", default=None)
    type_name: str | None = Field(alias="typeName", default=None)
    # The calendar event of the lesson (the id the calendar shows it under);
    # None for lessons without one (self-study, most consultations).
    event_id: str | None = Field(alias="eventId", default=None)
    # Wall-clock time in the event's own time zone, as Modeus shows it.
    starts_at: datetime.datetime | None = Field(alias="eventStartsAtLocal", default=None)


class ModeusCourseUnit(BaseModel):
    """A course unit realization: one subject (module part) of the semester."""
    id: str
    # The subject in the Modeus course catalog.
    course_unit_id: str | None = Field(alias="courseUnitId", default=None)
    name: str = ""
    lessons: list[ModeusLesson] = Field(default_factory=list)


class ModeusAcademicCourse(BaseModel):
    id: str
    name: str = ""
    course_unit_ids: list[str] = Field(alias="courseUnitRealizationIds", default_factory=list)


class ResultsTable(BaseModel):
    academic_courses: list[ModeusAcademicCourse] = Field(alias="academicCourses", default_factory=list)
    course_units: list[ModeusCourseUnit] = Field(alias="courseUnitRealizations", default_factory=list)


class ModeusResult(BaseModel):
    id: str | None = None
    value: str | None = Field(alias="resultValue", default=None)
    updated_at: datetime.datetime | None = Field(alias="updatedTs", default=None)

    @property
    def is_placeholder(self) -> bool:
        """A zero Modeus shows before anything is graded: never stored, so it has no id."""
        if self.id is not None or self.value is None:
            return False
        try:
            return float(self.value) == 0
        except ValueError:
            return False

    @field_validator("value", mode="before")
    @classmethod
    def value_as_text(cls, value: Any) -> Any:
        return str(value) if isinstance(value, int | float) else value


class ControlObject(BaseModel):
    type_code: str | None = Field(alias="typeCode", default=None)
    type_name: str | None = Field(alias="typeName", default=None)
    order: int | None = Field(alias="orderIndex", default=None)
    scale: str | None = Field(alias="mainGradingScaleCode", default=None)


class CourseUnitControlObject(ControlObject):
    course_unit_id: str = Field(alias="courseUnitRealizationId")
    current: ModeusResult | None = Field(alias="resultCurrent", default=None)
    final: ModeusResult | None = Field(alias="resultFinal", default=None)


class LessonControlObject(ControlObject):
    lesson_id: str = Field(alias="lessonId")
    result: ModeusResult | None = None


class LessonAttendance(BaseModel):
    lesson_id: str = Field(alias="lessonId")
    result: str | None = Field(alias="resultId", default=None)


class CourseUnitAttendanceRate(ModeusAttendanceRate):
    course_unit_id: str = Field(alias="courseUnitRealizationId")


class ResultsDetails(BaseModel):
    course_unit_rates: list[CourseUnitAttendanceRate] = Field(
        alias="courseUnitRealizationAttendanceRates", default_factory=list,
    )
    attendances: list[LessonAttendance] = Field(alias="eventPersonAttendances", default_factory=list)
    course_unit_results: list[CourseUnitControlObject] = Field(
        alias="courseUnitRealizationControlObjects", default_factory=list,
    )
    lesson_results: list[LessonControlObject] = Field(alias="lessonControlObjects", default_factory=list)


# --- Our response ------------------------------------------------------------

class Rating(BaseModel):
    score: float | None = None
    position: int | None = None
    total: int | None = None


class AttendanceRate(BaseModel):
    present: float
    absent: float
    undefined: float


class Result(BaseModel):
    """One grade: what it is for ("Итог модуля") and its value ("отл.", "86.00")."""
    name: str
    code: str | None = None
    scale: str | None = None
    value: str
    updated_at: datetime.datetime | None = None


class LessonGrades(BaseModel):
    id: str
    # Links the lesson to its event in the calendar (the Modeus event id).
    event_id: str | None = None
    name: str
    type: str | None = None
    type_name: str | None = None
    team: str | None = None
    starts_at: datetime.datetime | None = None
    # PRESENT, ABSENT... as Modeus marks the attendance, None when not marked.
    attendance: str | None = None
    results: list[Result] = Field(default_factory=list)


class CourseGrades(BaseModel):
    id: str
    name: str
    academic_course: str | None = None
    # The subject's page in the Modeus course catalog.
    catalog_url: str | None = None
    # Calendar events of every lesson of the subject, marked or not: a pair's card finds its subject by them.
    event_ids: list[str] = Field(default_factory=list)
    results: list[Result] = Field(default_factory=list)
    attendance: AttendanceRate | None = None
    # Only the lessons that have a grade or an attendance mark.
    lessons: list[LessonGrades] = Field(default_factory=list)


class Period(BaseModel):
    id: str
    name: str
    number: int | None = None
    start_date: datetime.date
    end_date: datetime.date


class GradesResponse(BaseModel):
    # The student's grades page in Modeus.
    modeus_url: str = settings.modeus_my_results_url
    periods: list[Period] = Field(default_factory=list)
    period_id: str | None = None
    gpa: Rating | None = None
    cgpa: Rating | None = None
    attendance: AttendanceRate | None = None
    courses: list[CourseGrades] = Field(default_factory=list)


# --- Netology -------------------------------------------------------------------
# Netology grades homework only: a review status and a word ("good"), no points.

_SEMESTER_RE = re.compile(r"^\s*(\d+)\s*семестр", re.IGNORECASE)


class NetologyHomework(BaseModel):
    status: str | None = None
    score: str | None = None
    solutions: list[dict[str, Any]] = Field(default_factory=list)


class NetologyLessonTask(BaseModel):
    # "common" homework goes to an expert; "independent" counts as done once sent.
    task_type: str | None = None
    deadline: datetime.datetime | None = None
    homework: NetologyHomework | None = None


class NetologyLessonItem(BaseModel):
    id: int
    type: str
    title: str = ""
    locked: bool | None = None
    path: str | None = None
    passed: bool | None = None
    lesson_task: NetologyLessonTask | None = None


class NetologyAccessLevel(BaseModel):
    current_program_id: int | None = None


class NetologyStudentProgram(BaseModel):
    title: str = ""
    access_levels: list[NetologyAccessLevel] = Field(default_factory=list)
    lesson_items: list[NetologyLessonItem] = Field(default_factory=list)

    @property
    def program_id(self) -> int | None:
        return next((level.current_program_id for level in self.access_levels if level.current_program_id), None)


class NetologyStudentCalendar(BaseModel):
    """All programs of the student (student_learning/calendar): homework statuses of the reviewed tasks only."""
    programs: list[NetologyStudentProgram] = Field(default_factory=list)


class NetologyProgramHomework(BaseModel):
    """Every homework and test of one program, as its "all homework" page lists them."""
    lesson_items: list[NetologyLessonItem] = Field(default_factory=list)


class NetologyFeedback(BaseModel):
    """The latest expert review, without the expert's name."""
    title: str | None = None
    content: str | None = None
    date_time: datetime.datetime | None = None
    is_new: bool | None = None
    homework_status: str | None = None
    homework_url: str | None = None


class NetologyActual(BaseModel):
    expert_feedback: NetologyFeedback | None = None


HOMEWORK_TYPES = ("task", "test", "quiz")
# Statuses see netology.schema.review_status.
DONE_STATUSES = ("accepted", "submitted", "passed")


_MOSCOW = ZoneInfo("Europe/Moscow")


def title_deadline(title: str) -> datetime.datetime | None:
    """The date written in the title, as the end of that day in Moscow - the way Netology sets real deadlines."""
    parsed = deadline_from_title(title)
    if parsed is None:
        return None
    # deadline_from_title reads the date as local midnight: back to the date itself.
    day = parsed.astimezone().date()
    return datetime.datetime.combine(day, datetime.time(23, 59, 59), tzinfo=_MOSCOW)


def homework_status(item: NetologyLessonItem) -> str | None:
    """What became of the homework: None while nothing was sent."""
    task = item.lesson_task or NetologyLessonTask()
    homework = task.homework or NetologyHomework()
    return review_status(item.type, item.passed, task.task_type, homework.status, bool(homework.solutions))


class NetologyTaskGrade(BaseModel):
    id: int
    title: str
    type: str
    task_type: str | None = None
    url: str | None = None
    deadline: datetime.datetime | None = None
    # accepted, rework (an expert's), submitted, review, passed; None while nothing was sent.
    status: str | None = None
    score: str | None = None
    locked: bool | None = None

    @classmethod
    def from_item(cls, item: NetologyLessonItem) -> "NetologyTaskGrade":
        task = item.lesson_task or NetologyLessonTask()
        homework = task.homework or NetologyHomework()
        return cls(
            id=item.id, title=item.title, type=item.type, task_type=task.task_type, locked=item.locked,
            url=urljoin(settings.netology_url, item.path) if item.path else None,
            deadline=task.deadline or title_deadline(item.title),
            status=homework_status(item), score=homework.score,
        )


_PROGRAM_PATH_RE = re.compile(r"^/profile/program/([^/]+)/")


class NetologyProgramGrades(BaseModel):
    title: str
    semester: int | None = None
    # The program's lessons and its "all homework" page (Netology calls it practice),
    # read off its tasks' links; None when no task has one.
    url: str | None = None
    practice_url: str | None = None
    tasks: list[NetologyTaskGrade] = Field(default_factory=list)
    done: int = 0
    # False when only the summary was available: self-study homework is missing then.
    complete: bool = True


class NetologyGradesResponse(BaseModel):
    programs: list[NetologyProgramGrades] = Field(default_factory=list)
    feedback: NetologyFeedback | None = None

    @classmethod
    def build(
            cls,
            calendar: NetologyStudentCalendar,
            homework_by_program: dict[int, NetologyProgramHomework],
            actual: NetologyActual | None,
    ) -> "NetologyGradesResponse":
        """Programs with homework, the latest semester first.

        The program's own homework list is the full one. The summary knows
        the reviewed homework only - self-study tasks come without a status
        there even when sent - so when the list failed to load, the summary
        stands in without them rather than calling them "not sent".
        """
        programs = []
        for program in calendar.programs:
            full = homework_by_program.get(program.program_id) if program.program_id else None
            if full is not None:
                items = [item for item in full.lesson_items if item.type in HOMEWORK_TYPES]
            else:
                items = [
                    item for item in program.lesson_items
                    if item.type in HOMEWORK_TYPES
                    and not ((item.lesson_task or NetologyLessonTask()).task_type == "independent"
                             and homework_status(item) is None)
                ]
            if not items:
                continue
            tasks = [NetologyTaskGrade.from_item(item) for item in items]
            tasks.sort(key=lambda task: (task.deadline is None, task.deadline or datetime.datetime.min.replace(
                tzinfo=datetime.UTC)))
            match = _SEMESTER_RE.match(program.title)
            program_path = next(
                (found.group(0) for item in items if item.path and (found := _PROGRAM_PATH_RE.match(item.path))),
                None,
            )
            programs.append(NetologyProgramGrades(
                title=program.title.strip(), semester=int(match.group(1)) if match else None, tasks=tasks,
                done=sum(1 for task in tasks if task.status in DONE_STATUSES), complete=full is not None,
                url=urljoin(settings.netology_url, f"{program_path}schedule") if program_path else None,
                practice_url=urljoin(settings.netology_url, f"{program_path}execution/all") if program_path else None,
            ))
        programs.sort(key=lambda program: -(program.semester or 0))
        return cls(programs=programs, feedback=actual.expert_feedback if actual else None)
