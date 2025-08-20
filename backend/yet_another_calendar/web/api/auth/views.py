"""Auth API views for tutor authentication."""
from fastapi import APIRouter, HTTPException, status, Depends

from yet_another_calendar.settings import settings

from . import schema
from . import utils
from .rate_limiter import rate_limited_dependency

router = APIRouter()


@router.post("/tutor/login", response_model=schema.TutorLoginResponse)
async def tutor_login(
    login_request: schema.TutorLoginRequest,
    _: None = Depends(rate_limited_dependency),
) -> schema.TutorLoginResponse:
    """Authenticate tutor with password and return JWT token."""
    if not settings.tutor_password_hash:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tutor authentication not configured",
        )
    
    if not utils.verify_password(login_request.password, settings.tutor_password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )
    
    access_token = utils.create_access_token()
    return schema.TutorLoginResponse(access_token=access_token)