"""
This module contains definitions of custom binders, used to bind request input
parameters into instances of objects, injected to request handlers.
"""
from blacksheep import FromHeader, Request
from blacksheep.server.bindings import Binder

from domain.common import PageOptions


class IfNoneMatchHeader(FromHeader[str | None]):
    name = "If-None-Match"


class PageOptionsBinder(Binder):
    """
    Binds common pagination options for all endpoints implementing pagination of
    results. Collects and validates optional the following query parameters:

    - page, for page number
    - limit, for results per page
    - continuation_id, the last numeric ID that was read
    """

    handle = PageOptions

    async def get_value(self, request: Request) -> PageOptions:
        pages = request.query.get("page")
        limits = request.query.get("limit")
        continuation_ids = request.query.get("continuation_id")
        if pages is None:
            page = 1
        else:
            page = int(pages[0])
        if limits is None:
            limit = 100
        else:
            limit = int(limits[0])
        continuation_id = None
        if continuation_ids is not None:
            continuation_id = int(continuation_ids[0])
        return PageOptions(page=page, limit=limit, continuation_id=continuation_id)
