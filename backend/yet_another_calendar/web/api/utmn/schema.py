"""UTMN API schema definitions."""

from pydantic import BaseModel


class Teacher(BaseModel):
    """Teacher information from UTMN website."""

    avatar_profile: str
    profile_url: str
