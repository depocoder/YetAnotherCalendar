"""Common domain models reused across several API endpoints."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Generic, Iterator, TypeVar

from pydantic import BaseModel, Field, conint

type_var = TypeVar("type_var")


@dataclass(slots=True)
class PaginatedSet(Generic[type_var]):
    """Paginated set."""

    items: list[type_var]
    total: int

    def __iter__(self) -> Iterator[type_var]:
        """Get iterator."""
        yield from self.items

    def __len__(self) -> int:
        """Get len items."""
        return len(self.items)


@dataclass(slots=True)
class SetterAction(Generic[type_var]):
    """Describes an action that requires adding and removing objects from a collection."""

    add: list[type_var] = field(default_factory=list)
    remove: list[type_var] = field(default_factory=list)


class SortOrder(Enum):
    """Sort order enum."""

    ASC = "ASC"
    DESC = "DESC"


class PageOptions(BaseModel):
    """
    Common pagination options for all endpoints implementing pagination of results.

    - page, for page number
    - limit, for results per page
    - continuation_id, the last numeric ID that was read
    """

    page: conint(gt=0) = Field(1, description="Page number.")  # type: ignore
    limit: conint(gt=0, le=1000) = Field(  # type: ignore
        100,
        description="Maximum number of results per page.",
    )
    continuation_id: int | None = Field(
        None,
        description="If provided, the ID of the last object that was retrieved.",
    )
    sort_order: SortOrder = SortOrder.ASC


class TimedMixin(BaseModel):
    """Mixin for time model."""

    created_at: datetime
    updated_at: datetime
    etag: str
