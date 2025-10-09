import datetime
import re
from typing import Annotated, Any
from urllib.parse import urljoin

from fastapi import Header
from pydantic import BaseModel, Field, computed_field, model_validator, ConfigDict
from loguru import logger

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.modeus.schema import ModeusTimeBody
from yet_another_calendar.web.api.validators import OptionalUTCDate

_DATE_PATTERN = r"(?<!\d)(\d{2})\D+(\d{2})\D+(?:\d{2})?(\d{2})(?!\d)"

class NetologyCreds(BaseModel):
    """Netology creds."""

    username: str
    password: str = Field(repr=False)


class NetologyCookies(BaseModel):
    rails_session: str = Field(alias="_netology-on-rails_session")


async def get_cookies_from_headers(
        rails_session: Annotated[str, Header(alias="_netology-on-rails_session")],
) -> NetologyCookies:
    return NetologyCookies.model_validate({
        "_netology-on-rails_session": rails_session,
    })


class NetologyProgramId(BaseModel):
    """Netology program id."""
    id: int
    title: str
    url_code: str = Field(alias="urlcode")
    type: str


class CoursesResponse(BaseModel):
    """Program id."""
    programs: list[NetologyProgramId]

    def get_utmn_program(self) -> NetologyProgramId | None:
        for program in self.programs:
            if settings.netology_course_name in program.title:
                return program


class BaseLesson(BaseModel):
    id: int
    lesson_id: int
    type: str
    title: str
    block_title: str


class LessonWebinar(BaseLesson):
    starts_at: datetime.datetime | None = Field(default=None)
    ends_at: datetime.datetime | None = Field(default=None)
    status: str | None = Field(default=None)
    experts: list[dict[str, Any]] | None = Field(default=None)
    video_url: str | None = None
    webinar_url: str | None = None

    def is_suitable_time(self, time_min: datetime.datetime, time_max: datetime.datetime) -> bool:
        """Check if lesson have suitable time"""
        if not self.starts_at or time_min > self.starts_at:
            return False
        if not self.ends_at or self.ends_at > time_max:
            return False
        return True


# noinspection PyNestedDecorators
class LessonTask(BaseLesson):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    path: str
    deadline: datetime.datetime | None = Field(default=None)
    passed: bool = Field()

    @computed_field  # type: ignore
    @property
    def url(self) -> str:
        return urljoin(settings.netology_url, self.path)

    @model_validator(mode='before')
    @classmethod
    def deadline_validation(cls, data: Any) -> Any:
        """
        Extracts and normalizes a deadline date from the 'title' field if present.

        The method looks for dates in the format 'DD.MM.YY', ensures that '00' values are replaced with '01',
        and converts the resulting date into a timezone-aware UTC datetime object.

        Args:
            data (Any): Input data, expected to be a dictionary with a 'title' field.

        Returns:
            Any: The modified data dictionary including a 'deadline' field if extraction is successful.
        """
        if not isinstance(data, dict):
            return data
        title = str(data.get('title', ''))
        match = re.search(_DATE_PATTERN, title)
        if not match:
            return data
        try:
            day, month, year = match.groups()
            day = "01" if day == "00" else day
            month = "01" if month == "00" else month
            normalized_date = f"{day}.{month}.{year}"
            data['deadline'] = datetime.datetime.strptime(normalized_date, "%d.%m.%y").astimezone(datetime.UTC)
        except (OverflowError, ValueError) as e:
            logger.exception(f"Error in deadline validation: {data}. Exception: {e}")
        return data

    def is_suitable_time(self, time_min: datetime.datetime, time_max: datetime.datetime) -> bool:
        """Check if lesson has suitable time"""
        if self.deadline and time_max >= self.deadline >= time_min:
            return True
        return False


class NetologyProgram(BaseModel):
    lesson_items: list[dict[str, Any]]


class CalendarResponse(BaseModel):
    lessons: list[NetologyProgram]
    block_title: str = Field(alias="title")

    @staticmethod
    def filter_lessons(
            block_title: str,
            program: NetologyProgram, time_min: datetime.datetime, time_max: datetime.datetime,
    ) -> tuple[list[LessonTask], list[LessonWebinar]]:
        """Filter lessons by time and status."""
        homework_events, webinars = [], []
        for lesson in program.lesson_items:
            if lesson['type'] in ["task", "test", "quiz"]:
                homework = LessonTask(**lesson, block_title=block_title)
                if homework.is_suitable_time(time_min, time_max):
                    homework_events.append(homework)
                    continue
            if lesson['type'] == "webinar":
                webinar = LessonWebinar(**lesson, block_title=block_title)
                if webinar.is_suitable_time(time_min, time_max):
                    webinars.append(webinar)
                    continue
        return homework_events, webinars

    def get_serialized_lessons(self, body: ModeusTimeBody) -> tuple[list[Any], list[Any]]:
        filtered_webinars = []
        filtered_homework = []
        time_min = body.time_min
        time_max = body.time_max
        for lesson in self.lessons:
            homework_events, webinars_events = self.filter_lessons(self.block_title, lesson, time_min, time_max)
            filtered_homework.extend(homework_events)
            filtered_webinars.extend(webinars_events)
        return filtered_homework, filtered_webinars


class ExtendedLesson(LessonWebinar):
    passed: bool
    experts: list[dict[str, Any]] | None = Field(default=None)


class ExtendedLessonResponse(BaseModel):
    lesson_items: list[ExtendedLesson]

    def exclude_attachment(self) -> list[ExtendedLesson]:
        excluded_lessons = []
        for lesson in self.lesson_items:
            if lesson.type != 'attachment':
                excluded_lessons.append(lesson)
        return excluded_lessons


class DetailedProgram(BaseModel):
    id: int
    name: str
    start_date: OptionalUTCDate = Field(default=None)
    finish_date: OptionalUTCDate = Field(default=None)


class Program(BaseModel):
    detailed_program: DetailedProgram = Field(alias='program')


class ProfessionResponse(BaseModel):
    """Professions modules info from Netology."""
    profession_modules: list[Program]

    def get_lesson_ids(self) -> set[int]:
        program_ids = set()
        for program in self.profession_modules:
            program_ids.add(program.detailed_program.id)
        return program_ids


class SerializedEvents(BaseModel):
    """Structure for displaying frontend."""
    homework: list[LessonTask]
    webinars: list[LessonWebinar]
