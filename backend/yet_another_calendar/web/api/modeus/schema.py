import datetime
import uuid
from typing import Self, Annotated

import jwt
from fastapi import HTTPException
from fastapi import Header
from pydantic import BaseModel, Field, computed_field, model_validator, field_validator
from starlette import status


class Creds(BaseModel):
    """Modeus creds."""

    username: str
    password: str = Field(repr=False)

    @field_validator("username")
    @classmethod
    def validate_time_min(cls, username: str) -> str:
        if "@" not in username and username.count('@') == 1:
            raise ValueError("Email must contain one @.")

        name, mail = username.split("@")
        if mail == "utmn.ru":
            mail = "study.utmn.ru"
        if mail != "study.utmn.ru":
            raise ValueError("Email must contain @study.utmn.ru.")
        return f"{name}@{mail}"


class ModeusTimeBody(BaseModel):
    time_min: datetime.datetime = Field(alias="timeMin", examples=["2024-09-23T00:00:00+00:00"])
    time_max: datetime.datetime = Field(alias="timeMax", examples=["2024-09-29T23:59:59+00:00"])

    @field_validator("time_min")
    @classmethod
    def validate_time_min(cls, time_min: datetime.datetime) -> datetime.datetime:
        if time_min.weekday() != 0:
            raise ValueError("Weekday time_min must be Monday.")
        if time_min.second or time_min.hour or time_min.minute:
            raise ValueError("Time must me 00:00:00.")
        if time_min.tzinfo != datetime.UTC:
            raise ValueError("Time must be UTC.")
        return time_min

    @field_validator("time_max")
    @classmethod
    def validate_time_max(cls, time_max: datetime.datetime) -> datetime.datetime:
        if time_max.weekday() != 6:
            raise ValueError("Weekday time_min must be Sunday.")
        if time_max.hour != 23 or time_max.second != 59 or time_max.minute != 59:
            raise ValueError("Time must me 23:59:59.")
        if time_max.tzinfo != datetime.UTC:
            raise ValueError("Time must be UTC.")
        return time_max


# noinspection PyNestedDecorators
class ModeusEventsBody(ModeusTimeBody):
    """Modeus search events body."""
    size: int = Field(default=50)
    attendee_person_id: list[uuid.UUID] = Field(alias="attendeePersonId")

    @model_validator(mode='after')
    def check_delta_days(self) -> Self:
        """
        Check delta between dates. It must be 7 days.
        """
        delta = self.time_max - self.time_min
        if delta.days != 6:
            raise ValueError("Defence between dates must be 7 days.")
        return self


class FullModeusPersonSearch(BaseModel):
    """Modeus search events body."""
    full_name: str = Field(alias="fullName", examples=["Комаев Азамат Олегович"])
    sort: str = Field(default="+fullName")
    size: int = Field(default=10)
    page: int = Field(default=0)


class Location(BaseModel):
    id: uuid.UUID = Field(alias="eventId")
    custom_location: str | None = Field(alias="customLocation", default=None)

    @computed_field  # type: ignore
    @property
    def is_lxp(self) -> float:
        if not self.custom_location:
            return True
        return self.custom_location == 'LXP'


class Event(BaseModel):
    name: str = Field(alias="name")
    name_short: str | None = Field(alias="nameShort", default=None)
    description: str | None = Field(alias="description")
    start_time: datetime.datetime = Field(alias="start")
    end_time: datetime.datetime = Field(alias="end")
    id: uuid.UUID


class Href(BaseModel):
    href: str

    @computed_field  # type: ignore
    @property
    def id(self) -> uuid.UUID:
        return uuid.UUID(self.href.replace('/', ''))


class EventLinks(BaseModel):
    course_unit_realization: Href | None = Field(alias="course-unit-realization", default=None)
    cycle_realization: Href | None = Field(alias="cycle-realization", default=None)


class EventWithLinks(Event):
    links: EventLinks = Field(alias="_links")


class AttenderLink(BaseModel):
    self: Href
    event: Href
    person: Href


class Attender(BaseModel):
    links: AttenderLink = Field(alias="_links")


class ShortPerson(BaseModel):
    id: uuid.UUID
    full_name: str = Field(alias="fullName")


class Course(BaseModel):
    id: uuid.UUID
    name: str


class CycleRealization(BaseModel):
    id: uuid.UUID
    name: str
    code: str


class CalendarEmbedded(BaseModel):
    events: list[EventWithLinks] = Field(alias="events", default=[])
    locations: list[Location] = Field(alias="event-locations", default=[])
    attendees: list[Attender] = Field(alias="event-attendees", default=[])
    people: list[ShortPerson] = Field(alias="persons", default=[])
    courses: list[Course] = Field(alias="course-unit-realizations", default=[])
    cycle_realizations: list[CycleRealization] = Field(alias="cycle-realizations", default=[])


class FullEvent(Event, Location):
    teacher_full_name: str
    course_name: str
    cycle_realization: CycleRealization


class ModeusCalendar(BaseModel):
    """Modeus calendar response."""

    embedded: CalendarEmbedded = Field(alias="_embedded")

    def serialize_modeus_response(self, skip_lxp: bool = True) -> list[FullEvent]:
        """Serialize calendar api response from modeus."""
        locations = {location.id: location for location in self.embedded.locations}
        teachers = {teacher.id: teacher for teacher in self.embedded.people}
        courses = {course.id: course for course in self.embedded.courses}
        cycle_realizations = {cycle_realization.id: cycle_realization for cycle_realization in
                              self.embedded.cycle_realizations}
        teachers_with_events = {teacher.links.event.id: teacher.links for teacher in self.embedded.attendees}
        full_events = []
        for event in self.embedded.events:
            course_id = event.links.course_unit_realization.id if event.links.course_unit_realization else None
            cycle_id = event.links.cycle_realization.id if event.links.cycle_realization else None
            try:
                cycle_realization = cycle_realizations[cycle_id] if cycle_id else 'unknown'
                course_name = courses[course_id].name if course_id else 'unknown'
                teacher_event = teachers_with_events[event.id]
                teacher = teachers[teacher_event.person.id]
                teacher_full_name = teacher.full_name
            except KeyError:
                cycle_realization = 'unknown'
                course_name = 'unknown'
                teacher_full_name = 'unknown'
            location = locations[event.id]
            if skip_lxp and location.is_lxp:
                continue
            full_events.append(FullEvent(**{
                "teacher_full_name": teacher_full_name, "course_name": course_name,
                "cycle_realization": cycle_realization,
                **event.model_dump(by_alias=True), **location.model_dump(by_alias=True),
            }))
        return full_events


class StudentsSpeciality(BaseModel):
    id: uuid.UUID = Field(alias="personId")
    flow_code: str | None = Field(alias="flowCode")
    learning_start_date: datetime.datetime | None = Field(alias="learningStartDate")
    learning_end_date: datetime.datetime | None = Field(alias="learningEndDate")
    specialty_code: str | None = Field(alias="specialtyCode")
    specialty_name: str | None = Field(alias="specialtyName")
    specialty_profile: str | None = Field(alias="specialtyProfile")

    @field_validator("learning_start_date")
    @classmethod
    def validate_starts_at(cls, learning_start_date: datetime.datetime | None) -> datetime.datetime | None:
        if not learning_start_date:
            return learning_start_date
        return learning_start_date.astimezone(datetime.UTC)

    @field_validator("learning_end_date")
    @classmethod
    def validate_learning_end_date(cls, learning_end_date: datetime.datetime | None) -> datetime.datetime | None:
        if not learning_end_date:
            return learning_end_date
        return learning_end_date.astimezone(datetime.UTC)


class ExtendedPerson(StudentsSpeciality, ShortPerson):
    pass


class PeopleEmbedded(BaseModel):
    persons: list[ShortPerson] = Field(default=[])
    students: list[StudentsSpeciality] = Field(default=[])


class SearchPeople(BaseModel):
    embedded: PeopleEmbedded = Field(alias="_embedded")

    def serialize_modeus_response(self) -> list[ExtendedPerson]:
        """Serialize search people response."""
        speciality_ids = {student.id: student for student in self.embedded.students}
        extended_people = []
        for person in self.embedded.persons:
            try:
                teacher_event = speciality_ids[person.id]
            except KeyError:
                continue
            extended_people.append(ExtendedPerson(**{
                **teacher_event.model_dump(by_alias=True), **person.model_dump(by_alias=True),
            }))
        return extended_people


class DayEventsRequest(BaseModel):
    date: datetime.date
    learning_start_year: list[int] = Field(..., alias="learningStartYear", examples=[[2024]])
    profile_name:        list[str] = Field(..., alias="profileName", examples=[["Разработка IT-продуктов и информационных систем"]])
    specialty_code:      list[str] = Field(..., alias="specialtyCode", examples=[["09.03.02"]])

    def to_search_payload(self) -> dict[str, object]:
        utc = datetime.UTC
        t_min = datetime.datetime.combine(self.date, datetime.time.min, tzinfo=utc)
        t_max = datetime.datetime.combine(self.date, datetime.time.max.replace(microsecond=0), tzinfo=utc)
        return {
            "timeMin": t_min.isoformat(),
            "timeMax": t_max.isoformat(),
            "learningStartYear": self.learning_start_year,
            "profileName": self.profile_name,
            "specialtyCode": self.specialty_code,
        }


def get_person_id(__jwt: str) -> str:
    try:
        decoded_token = jwt.decode(__jwt, options={"verify_signature": False})
        return decoded_token['person_id']
    except jwt.exceptions.DecodeError:
        raise HTTPException(
            detail="Modeus error. Can't decode token", status_code=status.HTTP_400_BAD_REQUEST,
        ) from None

def get_cookies_from_headers(modeus_jwt_token: Annotated[str, Header()]) -> str:
    return get_person_id(modeus_jwt_token)
