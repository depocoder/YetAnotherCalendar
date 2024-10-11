import datetime
import hashlib

from pydantic import BaseModel, Field

from ..modeus import schema as modeus_schema
from ..netology import schema as netology_schema


class BulkResponse(BaseModel):
    netology: netology_schema.SerializedEvents
    modeus: list[modeus_schema.FullEvent]

    def change_timezone(self, timezone: datetime.tzinfo):
        for homework in self.netology.homework:
            if homework.deadline:
                homework.deadline = homework.deadline.astimezone(timezone)
        for webinar in self.netology.webinars:
            webinar.starts_at = webinar.validate_starts_at(webinar.starts_at, timezone)
            webinar.ends_at = webinar.validate_ends_at(webinar.ends_at, timezone)

        for event in self.modeus:
            event.start_time = event.validate_starts_at(event.start_time, timezone)
            event.end_time = event.validate_end_time(event.end_time, timezone)
        return self

class CalendarResponse(BulkResponse):
    cached_at: datetime.datetime = Field(default_factory=datetime.datetime.now, alias="cached_at")

    def get_hash(self) -> str:
        dump = BulkResponse(**self.model_dump(by_alias=True)).model_dump_json(by_alias=True)
        return hashlib.md5(dump.encode()).hexdigest()


class RefreshedCalendarResponse(CalendarResponse):
    changed: bool
