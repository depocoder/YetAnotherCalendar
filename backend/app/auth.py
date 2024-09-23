"""Auth module."""

from blacksheep import Application

from app.settings import Settings


def configure_authentication(app: Application, settings: Settings) -> None:
    """
    Configure authentication as desired.

    For reference:
    https://www.neoteroi.dev/blacksheep/authentication/
    """
