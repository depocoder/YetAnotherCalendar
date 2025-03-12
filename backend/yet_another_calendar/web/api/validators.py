import datetime
from typing import Optional, Annotated


def validate_utc_date(value: Optional[datetime.datetime]) -> Optional[datetime.datetime]:
    """
    Convert a datetime object to UTC timezone.

    Args:
        value (Optional[datetime.datetime]): The datetime object to be converted.

    Returns:
        Optional[datetime.datetime]: The datetime object converted to UTC timezone, or None if the input is None.
    """
    if not value:
        return value
    return value.astimezone(datetime.timezone.utc)


OptionalUTCDate = Annotated[Optional[datetime.datetime], validate_utc_date]
