from importlib import metadata
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import UJSONResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from httpx import HTTPError
from pydantic import ValidationError
from starlette.responses import Response
from loguru import logger


from yet_another_calendar.log import configure_logging
from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.router import api_router
from yet_another_calendar.web.lifespan import lifespan_setup, init_rollbar

APP_ROOT = Path(__file__).parent.parent


def get_exceptions(exc: ExceptionGroup[Any]) -> list[Any]:
    """Get exceptions from ExceptionGroup."""
    exceptions = list(exc.exceptions)
    try:
        return list(exceptions[0].exceptions)
    except (IndexError, TypeError, AttributeError):
        return exceptions

async def task_group_exception_handler(request: Request, exc: ExceptionGroup[Any]) -> Response:
    exceptions = get_exceptions(exc)
    if exceptions and isinstance(exceptions[0], HTTPException):
        raise exceptions[0]
    if exceptions and isinstance(exceptions[0], ValidationError):
        return await validation_exception_handler(request, exceptions[0])
    if exceptions and isinstance(exceptions[0], HTTPError):
        return await request_error_exception_handler(request, exceptions[0])
    if exceptions:
        any_exception = exceptions[0]
        logger.opt(exception=any_exception).error(f"Unhandled exception: {any_exception}")
        return Response(
            status_code=403,
            content=f"Oops! Something went wrong: {any_exception}",
        )
    raise exc

async def validation_exception_handler(request: Request, exc: ValidationError) -> Response:
    logger.opt(exception=exc).error(f"Unhandled validation exception: {exc}")
    return Response(
        status_code=500,
        content=f"Oops! Api changed: {exc}",
    )

async def request_error_exception_handler(request: Request, exc: HTTPError) -> Response:
    logger.opt(exception=exc).error(f"Unhandled HTTP request exception: {exc}")
    return Response(
        status_code=500,
        content=f"Oops! Api changed: {exc}",
    )


async def request_validation_exception_handler(request: Request, exc: RequestValidationError) -> Response:
    logger.opt(exception=exc).error(f"Validation error: {exc}. errors: {exc.errors()}")
    
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

def get_app() -> FastAPI:
    """
    Get FastAPI application.

    This is the main constructor of an application.

    :return: application.
    """
    app = FastAPI(
        title="yet_another_calendar",
        version=metadata.version("yet_another_calendar"),
        lifespan=lifespan_setup,
        docs_url=None,
        redoc_url=None,
        openapi_url="/api/openapi.json",
        default_response_class=UJSONResponse,
    )
    
    if settings.rollbar_token:
        init_rollbar(app)

    configure_logging()
    
    if settings.debug:
        origins = ["*"]
    else:
        origins = [
            'https://yetanothercalendar.ru/',
        ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_exception_handler(ExceptionGroup, task_group_exception_handler)  # type: ignore
    app.add_exception_handler(ValidationError, validation_exception_handler)  # type: ignore
    app.add_exception_handler(HTTPError, request_error_exception_handler)  # type: ignore
    app.add_exception_handler(RequestValidationError, request_validation_exception_handler)  # type: ignore
    # Main router for the API.
    app.include_router(router=api_router, prefix="/api")
    # Adds static directory.
    # This directory is used to access swagger files.
    app.mount("/static_backend", StaticFiles(directory=APP_ROOT / "static"), name="static")

    return app
