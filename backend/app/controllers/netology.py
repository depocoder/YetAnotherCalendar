"""
Netology API implemented using a controller.
"""

from typing import Optional

from pydantic import BaseModel
from blacksheep.server.controllers import Controller, post
from blacksheep.server.bindings import FromJson
from requests import RequestException

from integration import netology


class NetologyCreds(BaseModel):
    username: str
    password: str


class NetologyController(Controller):
    @classmethod
    def route(cls) -> Optional[str]:
        return "/api/netology"

    @classmethod
    def class_name(cls) -> str:
        return "Netology"

    @post()
    async def get_netology_cookies(self, item: FromJson[NetologyCreds]):
        """
        Auth in Netology and return cookies.
        """
        try:
            return self.json(
                netology.auth_netology(item.value.username, item.value.password)
            )
        except RequestException as e:
            return self.json({"error": f"can't authenticate {e}"}, status=400)
