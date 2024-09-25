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


class ModeusSearchEvents(BaseModel):
    """Modeus search events body."""
    size : int =  Field(examples=[50], default=50)
    time_min: datetime.datetime = Field(alias="timeMin", examples=[datetime.datetime.now()])
    time_max: datetime.datetime = Field(alias="timeMax", examples=[datetime.datetime.now() - datetime.timedelta(days=7)])
    attendee_person_id: list[str] = Field(alias="attendeePersonId", default="d69c87c8-aece-4f39-b6a2-7b467b968211")

class Location(BaseModel):
    event_id: uuid.UUID = Field(alias="eventId")
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
    events: list[Event] = Field(alias="events")
    locations: list[Location] = Field(alias="event-locations")

class FullEvent(Event, Location):
    pass

class ModeusCalendar(BaseModel):
    """Modeus calendar response."""

    embedded: Embedded = Field(alias="_embedded")

    def parse_modeus_response(self) -> list[FullEvent]:
        locations = {location.event_id: location for location in self.embedded.locations}
        full_events = []
        for event in self.embedded.events:
            location = locations[event.id]
            full_events.append(FullEvent(**{
                **event.model_dump(by_alias=True), **location.model_dump(by_alias=True)
            }))
        return full_events

