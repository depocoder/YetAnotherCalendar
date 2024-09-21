"""
This module configures the BlackSheep application before it starts.
"""
from blacksheep import Application
from rodi import Container

from app.auth import configure_authentication
from app.docs import configure_docs
from app.errors import configure_error_handlers
from app.services import configure_services
from app.settings import load_settings, Settings
from app.templating import configure_templating


def configure_application(
    services: Container,
    settings: Settings,
) -> Application:
    app = Application(
        services=services, show_error_details=settings.app.show_error_details
    )

    app.serve_files("app/static")
    configure_error_handlers(app)
    configure_authentication(app, settings)
    configure_docs(app, settings)
    configure_templating(app, settings)
    return app


app = configure_application(*configure_services(load_settings()))
