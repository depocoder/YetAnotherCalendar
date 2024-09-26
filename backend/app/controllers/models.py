import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, Field, computed_field


class NetologyCreds(BaseModel):
    """Netology creds."""

    username: str
    password: str


class ModeusCreds(BaseModel):
    """Modeus creds."""

    username: str
    password: str


class ModeusEventsBody(BaseModel):
    """Modeus search events body."""
    size: int = Field(examples=[50], default=50)
    time_min: datetime.datetime = Field(alias="timeMin", examples=[datetime.datetime.now()])
    time_max: datetime.datetime = Field(alias="timeMax",
                                        examples=[datetime.datetime.now() - datetime.timedelta(days=7)])
    attendee_person_id: list[str] = Field(alias="attendeePersonId", default="d69c87c8-aece-4f39-b6a2-7b467b968211")


class ModeusPersonSearch(BaseModel):
    """Modeus search events body."""
    full_name: str = Field(alias="fullName")


class FullModeusPersonSearch(ModeusPersonSearch):
    sort: str = Field(default="+fullName")
    size: int = Field(default=10)
    page: int = Field(default=0)


class Location(BaseModel):
    id: uuid.UUID = Field(alias="eventId")
    custom_location: str = Field(alias="customLocation")

    @computed_field  # type: ignore
    @property
    def is_lxp(self) -> float:
        return self.custom_location == 'LXP'


class Event(BaseModel):
    name: str = Field(alias="name")
    name_short: str = Field(alias="nameShort")
    description: Optional[str] = Field(alias="description")
    start_time: datetime.datetime = Field(alias="start")
    end_time: datetime.datetime = Field(alias="end")
    id: uuid.UUID


class Href(BaseModel):
    href: str

    @computed_field  # type: ignore
    @property
    def id(self) -> uuid.UUID:
        return uuid.UUID(self.href.replace('/', ''))


class Link(BaseModel):
    self: Href
    event: Href
    person: Href


class Attender(BaseModel):
    links: Link = Field(alias="_links")


class ShortPerson(BaseModel):
    id: uuid.UUID
    full_name: str = Field(alias="fullName")


class CalendarEmbedded(BaseModel):
    events: list[Event] = Field(alias="events")
    locations: list[Location] = Field(alias="event-locations")
    attendees: list[Attender] = Field(alias="event-attendees")
    people: list[ShortPerson] = Field(alias="persons")


class FullEvent(Event, Location):
    teacher_full_name: str


class ModeusCalendar(BaseModel):
    """Modeus calendar response."""

    embedded: CalendarEmbedded = Field(alias="_embedded")

    def serialize_modeus_response(self) -> list[FullEvent]:
        """Serialize calendar api response from modeus."""
        locations = {location.id: location for location in self.embedded.locations}
        teachers = {teacher.id: teacher for teacher in self.embedded.people}
        teachers_with_events = {teacher.links.event.id: teacher.links for teacher in self.embedded.attendees}
        full_events = []
        for event in self.embedded.events:
            try:
                teacher_event = teachers_with_events[event.id]
                teacher = teachers[teacher_event.person.id]
                teacher_full_name = teacher.full_name
            except KeyError:
                teacher_full_name = 'unknown'
            location = locations[event.id]
            full_events.append(FullEvent(**{
                "teacher_full_name": teacher_full_name,
                **event.model_dump(by_alias=True), **location.model_dump(by_alias=True),
            }))
        return full_events


class StudentsSpeciality(BaseModel):
    id: uuid.UUID = Field(alias="personId")
    flow_code: Optional[str] = Field(alias="flowCode")
    learning_start_date: Optional[datetime.datetime] = Field(alias="learningStartDate")
    learning_end_date: Optional[datetime.datetime] = Field(alias="learningEndDate")
    specialty_code: Optional[str] = Field(alias="specialtyCode")
    specialty_name: Optional[str] = Field(alias="specialtyName")
    specialty_profile: Optional[str] = Field(alias="specialtyProfile")


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
