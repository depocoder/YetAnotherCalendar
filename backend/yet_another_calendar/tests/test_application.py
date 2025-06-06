import asyncio
import typing
from asyncio import AbstractEventLoop

import pytest

from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError, BaseModel
from starlette.requests import Request as StarletteRequest
from starlette.datastructures import Headers
from starlette.types import Scope

from yet_another_calendar.web.application import validation_exception_handler, request_error_exception_handler


def asyncio_test_call(func: typing.Any, *args: typing.Any, **kwargs: typing.Any) -> AbstractEventLoop:
    return asyncio.get_event_loop().run_until_complete(func(*args, **kwargs))

class DummyReceive:
    async def __call__(self) -> dict[str, str]:
        return {"type": "http.request"}


@pytest.fixture
def fake_request() -> StarletteRequest:
    scope: Scope = {
        "type": "http",
        "method": "POST",
        "path": "/",
        "headers": Headers({}).raw,
    }
    return StarletteRequest(scope, DummyReceive())


def test_validation_exception_handler(fake_request: dict[str, str]) -> None:
    class FakeModel(BaseModel):
        name: str
        age: int

    with pytest.raises(ValidationError) as exc_info:
        FakeModel(name="John", age="not-an-int")  # type: ignore[arg-type]

    response = asyncio_test_call(validation_exception_handler, fake_request, exc_info.value)
    assert response.status_code == 500                    # type: ignore[attr-defined]
    assert "Oops! Api changed" in response.body.decode()  # type: ignore[attr-defined]


def test_request_validation_exception_handler(fake_request: dict[str, str]) -> None:
    # Create a mock RequestValidationError
    error = RequestValidationError(
        errors=[{
            "loc": ["body", "price"],
            "msg": "value is not a valid float",
            "type": "type_error.float",
        }],
    )

    # Call the async handler
    response = asyncio_test_call(request_error_exception_handler, fake_request, error)

    # Assertions
    assert response.status_code == 500                    # type: ignore[attr-defined]
    assert "Oops! Api changed" in response.body.decode()  # type: ignore[attr-defined]