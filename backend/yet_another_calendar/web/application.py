from importlib import metadata
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import UJSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from yet_another_calendar.log import configure_logging
from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.router import api_router
from yet_another_calendar.web.lifespan import lifespan_setup

APP_ROOT = Path(__file__).parent.parent



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
    if settings.debug:
        origins = [
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
        ]
        app.add_middleware(
            CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        )


    # Main router for the API.
    app.include_router(router=api_router, prefix="/api")
    # Adds static directory.
    # This directory is used to access swagger files.
    app.mount("/static", StaticFiles(directory=APP_ROOT / "static"), name="static")

    return app
