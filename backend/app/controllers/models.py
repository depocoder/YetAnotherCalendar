from datetime import datetime

from pydantic import BaseModel, Field


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

    size: int
    time_min: datetime = Field(alias="timeMin")
    time_max: datetime = Field(alias="timeMax")
    attendee_person_id: list[str] = Field(alias="attendeePersonId")
