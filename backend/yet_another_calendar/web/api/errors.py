"""Classification of upstream errors, shared by every integration."""
from fastapi import HTTPException
from starlette import status


def leaf_exceptions(exception: BaseException) -> list[BaseException]:
    """Flatten (nested) exception groups into the exceptions they carry."""
    if isinstance(exception, BaseExceptionGroup):
        leaves: list[BaseException] = []
        for sub_exception in exception.exceptions:
            leaves.extend(leaf_exceptions(sub_exception))
        return leaves
    return [exception]


def is_auth_error(exception: BaseException) -> bool:
    """Whether the (possibly grouped) error means an upstream rejected the credentials."""
    return any(
        isinstance(leaf, HTTPException)
        and leaf.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
        for leaf in leaf_exceptions(exception)
    )
