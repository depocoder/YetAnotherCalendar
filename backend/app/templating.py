"""Template module."""
from datetime import datetime

from blacksheep.server import Application
from blacksheep.settings.html import html_settings

from app.settings import Settings


def get_copy(settings) -> str:
    """Get copy."""
    now = datetime.now()
    return "{0} {1}".format(now.year, settings.site.copyright)


def configure_templating(application: Application, settings: Settings) -> None:
    """Configures server side rendering for HTML views."""
    renderer = html_settings.renderer

    helpers = {"_": lambda data: data, "copy": get_copy(settings)}

    env = renderer.env
    env.globals.update(helpers)
