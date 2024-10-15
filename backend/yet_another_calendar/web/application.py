import logging
from importlib import metadata
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import UJSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from httpx import HTTPError
from pydantic import ValidationError
from starlette.responses import Response

from yet_another_calendar.log import configure_logging
from yet_another_calendar.web.api.router import api_router
from yet_another_calendar.web.lifespan import lifespan_setup

APP_ROOT = Path(__file__).parent.parent
logger = logging.getLogger(__name__)


async def task_group_exception_handler(request: Request, exc: ExceptionGroup[Any]) -> Response:
    exceptions = exc.exceptions
    if exceptions and isinstance(exceptions[0], HTTPException):
        raise exceptions[0]
    if exceptions and isinstance(exceptions[0], ValidationError):
        return await validation_exception_handler(request, exceptions[0])
    if exceptions and isinstance(exceptions[0], HTTPError):
        return await request_error_exception_handler(request, exceptions[0])
    if exceptions:
        any_exception = exceptions[0]
        logger.exception(f"Unhandled exception: {any_exception}")
        return Response(
            status_code=403,
            content=f"Oops! Something went wrong: {any_exception}",
        )
    raise exc


async def validation_exception_handler(request: Request, exc: ValidationError) -> Response:
    logger.exception(f"Unhandled validation exception: {exc}")
    return Response(
        status_code=500,
        content=f"Oops! Api changed: {exc}",
    )


async def request_error_exception_handler(request: Request, exc: HTTPError) -> Response:
    logger.exception(f"Unhandled request exception: {exc}")
    return Response(
        status_code=500,
        content=f"Oops! Api changed: {exc}",
    )


def get_app() -> FastAPI:
    """
    Get FastAPI application.

    This is the main constructor of an application.

    :return: application.
    """
    configure_logging()
    app = FastAPI(
        title="yet_another_calendar",
        version=metadata.version("yet_another_calendar"),
        lifespan=lifespan_setup,
        docs_url=None,
        redoc_url=None,
        openapi_url="/api/openapi.json",
        default_response_class=UJSONResponse,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_exception_handler(ExceptionGroup, task_group_exception_handler)  # type: ignore
    app.add_exception_handler(ValidationError, validation_exception_handler)  # type: ignore
    app.add_exception_handler(HTTPError, request_error_exception_handler)  # type: ignore
    # Main router for the API.
    app.include_router(router=api_router, prefix="/api")
    # Adds static directory.
    # This directory is used to access swagger files.
    app.mount("/static_backend", StaticFiles(directory=APP_ROOT / "static"), name="static")

    return app
