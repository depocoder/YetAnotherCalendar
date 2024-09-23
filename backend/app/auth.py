"""Auth module."""

from app.settings import Settings
from blacksheep import Application


def configure_authentication(app: Application, settings: Settings) -> None:
    """
    Configure authentication as desired.

    For reference:
    https://www.neoteroi.dev/blacksheep/authentication/
    """
