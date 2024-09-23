"""
Application settings handled using Pydantic Settings management.

Pydantic is used both to read app settings from various sources, and to validate their
values.

https://docs.pydantic.dev/latest/usage/settings/
"""

from environs import Env
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

env = Env()


class APIInfo(BaseModel):
    """App Info."""

    title: str = "CalendarIT API"
    version: str = "0.0.1"


class App(BaseModel):
    """App information."""

    show_error_details: bool = env.bool("SHOW_ERROR_DETAILS", False)


class Site(BaseModel):
    """Site information."""

    copyright: str = "Example"


class Settings(BaseSettings):
    """Settings class."""

    # to override info:
    # export app_info='{"title": "x", "version": "0.0.2"}'
    info: APIInfo = APIInfo()

    # to override app:
    # export app_app='{"show_error_details": True}'
    app: App = App()

    site: Site = Site()

    model_config = SettingsConfigDict(env_prefix="APP_")

    modeus_username = env.str("MODEUS_USERNAME")
    modeus_password = env.str("MODEUS_PASSWORD")


def load_settings() -> Settings:
    """Load app settings."""
    env.read_env()
    return Settings()
