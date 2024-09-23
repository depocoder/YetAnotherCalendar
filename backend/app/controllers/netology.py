"""
Netology API implemented using a controller.
"""

from typing import Optional

from blacksheep import Response
from blacksheep.server.bindings import FromJson
from blacksheep.server.controllers import Controller, post
from integration import netology
from pydantic import BaseModel
from requests import RequestException


class NetologyCreds(BaseModel):
    """Netology creds."""

    username: str
    password: str


class NetologyController(Controller):
    """Controller for Netology API."""

    @classmethod
    def route(cls) -> Optional[str]:
        """Get route."""
        return "/api/netology"

    @classmethod
    def class_name(cls) -> str:
        """Get class name."""
        return "Netology"

    @post()
    async def get_netology_cookies(self, item: FromJson[NetologyCreds]) -> Response:
        """
        Auth in Netology and return cookies.
        """
        try:
            return self.json(
                netology.auth_netology(
                    item.value.username,
                    item.value.password,
                ),
            )
        except RequestException as exception:
            return self.json({"error": f"can't authenticate {exception}"}, status=400)
