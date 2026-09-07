"""ICS subscription schemas."""
from pydantic import BaseModel, Field, model_validator
from typing import Self

from ..lms import schema as lms_schema
from ..netology import schema as netology_schema


class SubscriptionCreateRequest(BaseModel):
    """Request to create an ICS subscription.

    Two ways to create one:
    * with credentials (validated against upstream services first), or
    * without them, when the browser holds a remember-me vault cookie -
      then a new ICS grant is attached to the existing vault.
    """

    netology: netology_schema.NetologyCreds | None = None
    lxp: lms_schema.LxpCreds | None = None
    modeus_person_id: str | None = Field(default=None, min_length=8, max_length=64)
    calendar_ids: list[int] = Field(default_factory=list, max_length=20)
    time_zone: str = "Europe/Moscow"

    @model_validator(mode="after")
    def check_creds_complete(self) -> Self:
        if self.has_creds and (self.netology is None or self.lxp is None or not self.modeus_person_id):
            raise ValueError(
                "netology, lxp and modeus_person_id must be provided together",
            )
        return self

    @property
    def has_creds(self) -> bool:
        return self.netology is not None or self.lxp is not None


class SubscriptionCreateResponse(BaseModel):
    """Response with the one-time subscription URL."""

    url: str
