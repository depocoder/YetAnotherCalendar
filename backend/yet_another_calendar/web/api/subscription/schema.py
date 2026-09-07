"""ICS subscription schemas."""
import datetime

from pydantic import BaseModel, Field

from ..lms import schema as lms_schema
from ..netology import schema as netology_schema


class SubscriptionCreateRequest(BaseModel):
    """Request to create an ICS subscription.

    Credentials are validated against upstream services, then stored
    encrypted with a key derived from the subscription URL secret.
    """

    netology: netology_schema.NetologyCreds
    lxp: lms_schema.LxpCreds
    modeus_person_id: str = Field(min_length=8, max_length=64)
    calendar_ids: list[int] = Field(min_length=1, max_length=20)
    time_zone: str = "Europe/Moscow"


class SubscriptionCreateResponse(BaseModel):
    """Response with the one-time subscription URL."""

    url: str


class EncryptedCreds(BaseModel):
    """Credentials blob before encryption / after decryption."""

    netology: netology_schema.NetologyCreds
    lxp: lms_schema.LxpCreds


class SubscriptionMeta(BaseModel):
    """Non-secret subscription metadata stored in redis.

    The credentials themselves are stored only as ciphertext: without the
    secret from the subscription URL (plus the server-side pepper) they
    cannot be decrypted.
    """

    secret_hash: str
    ciphertext: str
    nonce: str
    salt: str
    modeus_person_id: str
    calendar_ids: list[int]
    time_zone: str = "Europe/Moscow"
    broken: bool = False
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(tz=datetime.UTC),
    )


class CachedTokens(BaseModel):
    """Short-living upstream tokens cached between calendar polls."""

    netology_session: str
    lms_id: int
    lms_token: str
