"""
This module contains OpenAPI Documentation definition for the API.

It exposes a docs object that can be used to decorate request handlers with additional
information, used to generate OpenAPI documentation.
"""
from blacksheep.server.openapi.ui import SwaggerUIProvider, UIFilesOptions

from app.docs.binders import set_binders_docs
from app.settings import Settings
from blacksheep import Application
from blacksheep.server.openapi.v3 import OpenAPIHandler
from openapidocs.v3 import Info


def configure_docs(app: Application, settings: Settings) -> None:
    docs = OpenAPIHandler(
        info=Info(title=settings.info.title, version=settings.info.version),
        anonymous_access=True,
    )

    # include only endpoints whose path starts with "/api/"
    docs.include = lambda path, _: path.startswith("/api/")

    # CDN is too slow
    docs.ui_providers = [
        SwaggerUIProvider(
            ui_files_options=UIFilesOptions(
                '/static/swagger-ui-bundle.js', '/static/swagger-ui.css',
            ),
        ),
    ]
    set_binders_docs(docs)

    docs.bind_app(app)
