"""Credentials vault schemas.

The vault stores one encrypted credentials blob per user and any number of
"grants" - wrapped copies of the data encryption key. Each grant belongs to
a client-held secret (a browser cookie or an ICS subscription URL), so the
server alone can never decrypt the credentials.
"""
import datetime
from typing import Literal

from pydantic import BaseModel, Field

from ..lms import schema as lms_schema
from ..netology import schema as netology_schema


class EncryptedCreds(BaseModel):
    """Credentials blob before encryption / after decryption."""

    netology: netology_schema.NetologyCreds
    lxp: lms_schema.LxpCreds


class VaultCreateRequest(BaseModel):
    """Request to remember the user's credentials on this device."""

    netology: netology_schema.NetologyCreds
    lxp: lms_schema.LxpCreds
    modeus_person_id: str = Field(min_length=8, max_length=64)
    calendar_ids: list[int] = Field(default_factory=list, max_length=20)
    time_zone: str = "Europe/Moscow"


class Grant(BaseModel):
    """One wrapped copy of the vault data encryption key."""

    kind: Literal["browser", "ics"]
    secret_hash: str
    salt: str
    wrapped_dek: str
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(tz=datetime.UTC),
    )


class VaultRecord(BaseModel):
    """Vault as stored in redis: ciphertext plus non-secret metadata."""

    creds_ciphertext: str
    creds_nonce: str
    modeus_person_id: str
    calendar_ids: list[int] = Field(default_factory=list)
    time_zone: str = "Europe/Moscow"
    broken: bool = False
    grants: dict[str, Grant] = Field(default_factory=dict)
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(tz=datetime.UTC),
    )


class CachedTokens(BaseModel):
    """Short-living upstream tokens cached between refreshes."""

    netology_session: str
    lms_id: int
    lms_token: str


class RefreshedSession(CachedTokens):
    """Fresh tokens plus everything the frontend keeps in localStorage."""

    modeus_person_id: str
    calendar_ids: list[int]
    time_zone: str


class VaultStatus(BaseModel):
    """Whether this browser holds a working remember-me grant."""

    active: bool
    broken: bool = False
