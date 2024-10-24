import datetime
import hashlib
from typing import Self

from pydantic import BaseModel, Field

from ..modeus import schema as modeus_schema
from ..lms import schema as lms_schema
from ..netology import schema as netology_schema

def now_dt_utc() -> datetime.datetime:
    return datetime.datetime.now(tz=datetime.timezone.utc)

class UtmnResponse(BaseModel):
    modeus_events: list[modeus_schema.FullEvent]
    lms_events: list[lms_schema.ModuleResponse]


class BulkResponse(BaseModel):
    netology: netology_schema.SerializedEvents
    utmn: UtmnResponse

    def change_timezone(self, timezone: datetime.tzinfo) -> Self:
        for homework in self.netology.homework:
            if homework.deadline:
                homework.deadline = homework.deadline.astimezone(timezone)
        for webinar in self.netology.webinars:
            webinar.starts_at = webinar.validate_starts_at(webinar.starts_at, timezone)
            webinar.ends_at = webinar.validate_ends_at(webinar.ends_at, timezone)

        for modeus_event in self.utmn.modeus_events:
            modeus_event.start_time = modeus_event.validate_starts_at(modeus_event.start_time, timezone)
            modeus_event.end_time = modeus_event.validate_end_time(modeus_event.end_time, timezone)

        for lms_event in self.utmn.lms_events:
            lms_event.dt_start = lms_event.dt_start.astimezone(timezone)
            lms_event.dt_end = lms_event.dt_end.astimezone(timezone)
        return self


class CalendarResponse(BulkResponse):
    cached_at: datetime.datetime = Field(default_factory=now_dt_utc, alias="cached_at")

    def get_hash(self) -> str:
        dump = BulkResponse(**self.model_dump(by_alias=True)).model_dump_json(by_alias=True)
        return hashlib.md5(dump.encode()).hexdigest()


class RefreshedCalendarResponse(CalendarResponse):
    changed: bool
