import hashlib
from typing import Any
from collections.abc import Callable

from starlette.requests import Request
from starlette.responses import Response


def key_builder(
    func: Callable[..., Any],
    namespace: str = "",
    *,
    request: Request | None = None,
    response: Response | None = None,
    args: tuple[Any, ...],
    kwargs: dict[str, Any],
) -> str:
    cache_key = hashlib.md5(
        f"{func.__module__}:{func.__name__}:{args}".encode(),
    ).hexdigest()
    return f"{namespace}:{cache_key}"

