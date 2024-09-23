"""Template module."""

from datetime import datetime

from app.settings import Settings
from blacksheep.server import Application
from blacksheep.server.rendering.jinja2 import JinjaRenderer
from blacksheep.settings.html import html_settings


def get_copy(settings: Settings) -> str:
    """Get copy."""
    now = datetime.now()
    return "{0} {1}".format(now.year, settings.site.copyright)


def configure_templating(application: Application, settings: Settings) -> None:
    """
    Configures server side rendering for HTML views.

    Raises:
        TypeError: Render must be JinjaRenderer

    """
    renderer = html_settings.renderer
    if not isinstance(renderer, JinjaRenderer):
        raise TypeError("Renderer must be JinjaRenderer")
    helpers = {"_": lambda data: data, "copy": get_copy(settings)}

    env = renderer.env
    env.globals.update(helpers)
