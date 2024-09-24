import datetime
import uuid
from typing import Any, Optional

from pydantic import BaseModel, Field, computed_field


class NetologyCreds(BaseModel):
    """Netology creds."""

    username: str
    password: str


class ModeusCreds(BaseModel):
    """Modeus creds."""

    username: str
    password: str


"""
{"size":500,"timeMin":"2024-09-23T00:00:00+03:00","timeMax":"2024-09-29T23:59:59+03:00","attendeePersonId":["d69c87c8-aece-4f39-b6a2-7b467b968211"]}
_"""


class ModeusSearchEvents(BaseModel):
    """Modeus search events body."""

    size : int = 50
    time_min: datetime.datetime = Field(alias="timeMin", default=datetime.datetime.now())
    time_max: datetime.datetime = Field(alias="timeMax", default=datetime.datetime.now() - datetime.timedelta(days=7))
    attendee_person_id: list[str] = Field(alias="attendeePersonId", default="d69c87c8-aece-4f39-b6a2-7b467b968211")

class Location(BaseModel):
    event_id: str = Field(alias="eventId")
    custom_location: str = Field(alias="customLocation")

    @computed_field
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

class Embedded(BaseModel):
    event: list[Event] = Field(alias="events")
    locations: list[Location] = Field(alias="event-locations")

class ModeusCalendar(BaseModel):
    """Modeus calendar response."""

    embedded: Embedded = Field(alias="_embedded")

