import hashlib
from typing import Any, Awaitable, Callable, Dict, Optional, Tuple, Union

from starlette.requests import Request
from starlette.responses import Response
from typing_extensions import Protocol


def key_builder(
    func: Callable[..., Any],
    namespace: str = "",
    *,
    request: Optional[Request] = None,
    response: Optional[Response] = None,
    args: Tuple[Any, ...],
    kwargs: Dict[str, Any],
) -> str:
    cache_key = hashlib.md5(  # noqa: S324
        f"{func.__module__}:{func.__name__}:{args}".encode()
    ).hexdigest()
    return f"{namespace}:{cache_key}"


_Func = Callable[..., Any]


class KeyBuilder(Protocol):
    def __call__(
        self,
        func: _Func,
        namespace: str = ...,
        *,
        request: Optional[Request] = ...,
        response: Optional[Response] = ...,
        args: Tuple[Any, ...],
        kwargs: Dict[str, Any],
    ) -> Union[Awaitable[str], str]:
        cache_key = hashlib.md5(  # noqa: S324
            f"{func.__module__}:{func.__name__}:{args}".encode()
        ).hexdigest()
        return f"{namespace}:{cache_key}"