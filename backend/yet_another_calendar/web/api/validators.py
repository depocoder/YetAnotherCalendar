import datetime
from typing import Annotated


def validate_utc_date(value: datetime.datetime | None) -> datetime.datetime | None:
    """
    Convert a datetime object to UTC timezone.

    Args:
        value (Optional[datetime.datetime]): The datetime object to be converted.

    Returns:
        Optional[datetime.datetime]: The datetime object converted to UTC timezone, or None if the input is None.
    """
    if not value:
        return value
    return value.astimezone(datetime.UTC)


OptionalUTCDate = Annotated[datetime.datetime | None, validate_utc_date]
