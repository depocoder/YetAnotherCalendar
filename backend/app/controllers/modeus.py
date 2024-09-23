"""
Modeus API implemented using a controller.
"""

from typing import Optional

from blacksheep import Response
from blacksheep.server.bindings import FromJson
from blacksheep.server.controllers import Controller, post
from integration import modeus
from integration.exceptions import ModeusError
from pydantic import BaseModel
from requests import RequestException


class ModeusCreds(BaseModel):
    """Modeus creds."""

    username: str
    password: str


class NetologyController(Controller):
    """Controller for Modeus API."""

    @classmethod
    def route(cls) -> Optional[str]:
        """Get route."""
        return "/api/modeus"

    @classmethod
    def class_name(cls) -> str:
        """Get class name."""
        return "Modeus"

    @post()
    async def get_modeus_cookies(self, item: FromJson[ModeusCreds]) -> Response:
        """
        Auth in Modeus and return cookies.
        """
        try:
            return self.json(
                await modeus.login(item.value.username, item.value.password),
            )
        except (RequestException, ModeusError) as exception:
            return self.json({"error": f"can't authenticate {exception}"}, status=400)
