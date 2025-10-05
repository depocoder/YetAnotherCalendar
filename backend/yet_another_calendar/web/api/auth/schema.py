"""Auth API schema definitions."""
from pydantic import BaseModel, Field


class TutorLoginRequest(BaseModel):
    """Tutor login request."""
    password: str = Field(repr=False)



class TutorLoginResponse(BaseModel):
    """Tutor login response."""
    access_token: str
    token_type: str = "bearer"
