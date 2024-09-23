"""
Modeus API implemented using a controller.
"""


from datetime import datetime
from typing import Optional

from blacksheep import Response
from blacksheep.server.bindings import FromJson, FromHeader
from blacksheep.server.controllers import Controller, post
from requests import RequestException

from integration import modeus
from integration.exceptions import ModeusError
from . import models


class FromAuthorizationHeader(FromHeader[str]):
    name = "Authorization"


class ModeusController(Controller):
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
    async def get_modeus_cookies(self, item: FromJson[models.ModeusCreds]) -> Response:
        """
        Auth in Modeus and return cookies.
        """
        try:
            return self.json(
                await modeus.login(item.value.username, item.value.password),
            )
        except (RequestException, ModeusError) as exception:
            return self.json({"error": f"can't authenticate {exception}"}, status=400)

    @post("/events/")
    async def get_modeus_events(self, auth: FromAuthorizationHeader, item: FromJson[models.ModeusSearchEvents]) -> Response:
        """
        Get events from Modeus.
        """
        try:
            jwt = auth.value.split()[1]
            return self.json(
                await modeus.get_events(jwt, item.value)
            )
        except IndexError as exception:
            return self.json({"error": "cannot parse authorization header"})
        except (RequestException, ModeusError) as exception:
            return self.json({"error": f"can't authenticate {exception}"}, status=400)

