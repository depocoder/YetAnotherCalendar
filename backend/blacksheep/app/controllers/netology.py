"""
Netology API implemented using a controller.
"""

from typing import Optional

from blacksheep import Response, FromQuery
from blacksheep.server.bindings import FromJson
from blacksheep.server.controllers import Controller, post, get
from httpx import HTTPStatusError
from requests import RequestException

from integration import netology
from integration.exceptions import NetologyUnauthorizedError
from . import models
from .models import NetologyCookies, NetologyCookiesHeader


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
    async def get_netology_cookies(
        self,
        item: FromJson[models.NetologyCreds],
    ) -> Response:
        """
        Auth in Netology and return cookies.
        """
        try:
            cookies = await netology.auth_netology(
                item.value.username,
                item.value.password,
            )
            return self.json(
                cookies.model_dump(by_alias=True),
            )
        except RequestException as exception:
            return self.json({"error": f"can't authenticate {exception}"}, status=400)
        except NetologyUnauthorizedError as exception:
            return self.json({"error": f"{exception}"}, status=401)


    @post('/utmn_course/')
    async def get_course(
            self,
            cookies: FromJson[NetologyCookies],
    ) -> Response:
        """
        Auth in Netology and return cookies.
        """
        try:
            course = await netology.get_utmn_course(cookies.value)
            return self.json(
                course,
            )
        except (RequestException, HTTPStatusError) as exception:
            return self.json({"error": f"can't authenticate {exception}"}, status=400)
        except NetologyUnauthorizedError as exception:
            return self.json({"error": f"{exception}"}, status=401)

    @get('/calendar/')
    async def get_calendar(
            self,
            request,
            program_id: FromQuery[int],
            cookies: NetologyCookiesHeader,
    ) -> Response:
        """
        Auth in Netology and return cookies.
        """
        try:
            course = await netology.get_calendar(cookies.value, program_id.value)
            return self.json(
                course,
            )
        except (RequestException, HTTPStatusError) as exception:
            return self.json({"error": f"can't authenticate {exception}"}, status=400)
        except NetologyUnauthorizedError as exception:
            return self.json({"error": f"{exception}"}, status=401)
