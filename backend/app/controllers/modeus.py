"""
Modeus API implemented using a controller.
"""

from typing import Optional

from blacksheep import Response
from blacksheep.server.bindings import FromJson, FromHeader
from blacksheep.server.controllers import Controller, post
from requests import RequestException

from integration import modeus
from integration.exceptions import ModeusError
from . import models
from ..settings import load_settings

settings = load_settings()

class FromAuthorizationHeader(FromHeader[str]):
    name = "bearer-token"


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
    async def get_modeus_events(
        self,
        auth: FromAuthorizationHeader,
        item: FromJson[models.ModeusSearchEvents],
    ) -> Response:
        """
        Get events from Modeus.
        """
        try:
            jwt = auth.value.split()[1]
            return self.json(await modeus.get_events(jwt, item.value))
        except IndexError as exception:
            return self.json(
                {"error": f"cannot parse authorization header {exception}"},
            )
        except (RequestException, ModeusError) as exception:
            return self.json({"error": f"can't authenticate {exception}"}, status=400)

    
    @post("/events_blank/")
    async def get_modeus_events_blank(
        self,
        item: FromJson[models.ModeusSearchEvents],
    ) -> Response:
        """
        Get events from Modeus when no account.
        """
        try:
            jwt_token = (await modeus.login(settings.modeus_username, settings.modeus_password))['token']
        except (RequestException, ModeusError) as exception:
            return self.json({"error": f"can't authenticate {exception}"}, status=400)
        auth = FromAuthorizationHeader(value=f"Bearer {jwt_token}")
        return await self.get_modeus_events(item=item, auth=auth)