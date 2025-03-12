import datetime
from typing import Optional, Annotated


def validate_utc_date(value: Optional[datetime.datetime]) -> Optional[datetime.datetime]:
    if not value:
        return value
    return value.astimezone(datetime.timezone.utc)


OptionalUTCDate = Annotated[Optional[datetime.datetime], validate_utc_date]
