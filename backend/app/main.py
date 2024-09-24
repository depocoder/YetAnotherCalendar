"""
This module configures the BlackSheep application before it starts.
"""

from app.auth import configure_authentication
from app.docs import configure_docs
from app.errors import configure_error_handlers
from app.services import configure_services
from app.settings import Settings, load_settings
from app.templating import configure_templating
from blacksheep import Application
from rodi import Container


def configure_application(
    services: Container,
    settings: Settings,
) -> Application:
    app = Application(
        services=services,
        show_error_details=settings.app.show_error_details,
    )

    configure_error_handlers(app)
    configure_authentication(app, settings)
    configure_docs(app, settings)
    return app


app = configure_application(*configure_services(load_settings()))
