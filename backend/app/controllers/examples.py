"""
Example API implemented using a controller.
"""

from typing import List, Optional

from blacksheep.server.controllers import Controller, get, post


class ExamplesController(Controller):
    """Example API controller."""

    @classmethod
    def route(cls) -> Optional[str]:
        """Return example route."""
        return "/api/examples"

    @classmethod
    def class_name(cls) -> str:
        """Class name."""
        return "Examples"

    @get()
    async def get_examples(self) -> List[str]:
        """
        Gets a list of examples.
        """
        return [f"example {number}" for number in range(3)]

    @post()
    async def add_example(self, example: str) -> None:
        """
        Adds an example.
        """
