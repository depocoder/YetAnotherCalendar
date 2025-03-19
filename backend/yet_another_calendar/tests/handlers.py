import json

import httpx

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.netology import schema

mock_cookies = schema.NetologyCookies.model_validate({"_netology-on-rails_session": "aboba"})


def get_httpx_response(status_code: int, body: dict, fixture_path: str | None = None) -> httpx.Response:
    if fixture_path is None:
        return httpx.Response(status_code, json=body)

    with open(settings.test_parent_path / fixture_path) as f:
        response_json = json.load(f)
        return httpx.Response(status_code, json=response_json)


def _bad_handler(request: httpx.Request) -> httpx.Response:  # noqa: PLR0911
    response_cases = {
        "/backend/api/user/programs/calendar/filters/not-auth": get_httpx_response(401,
                                                                                   {"text": "Not authorized"}),
        "/backend/api/unknown": get_httpx_response(404, {"detail": "Not Found"}),
        "/backend/api/server_problem": get_httpx_response(500, {}),
        settings.netology_sign_in_part: get_httpx_response(401, {"detail": "Unauthorized"}),
        settings.netology_get_events_part.format(program_id=2): get_httpx_response(404, {})
    }

    case = response_cases.get(request.url.path)

    if case is None:
        return httpx.Response(400, json={"Azamat": 'Lox'})

    return case


def _handler(request: httpx.Request) -> httpx.Response:  # noqa: PLR0911
    response_cases = {
        "/backend/api/user/programs/calendar/filters": get_httpx_response(200, {"ok": True}),
        "/backend/api/unauthorized": get_httpx_response(404, {"detail": "Not Found"}),
        settings.netology_get_events_part.format(program_id=45526): get_httpx_response(200, {},
                                                                        settings.test_parent_path /
                                                                        'fixtures/program_45526.json'),
        settings.netology_get_events_part.format(program_id=57604): get_httpx_response(200, {},
                                                                        settings.test_parent_path /
                                                                        'fixtures/program_57604.json'),
        settings.netology_get_programs_part.format(calendar_id=45526): get_httpx_response(200, {},
                                                                           settings.test_parent_path /
                                                                           'fixtures/profession.json'),
        settings.netology_get_programs_part.format(calendar_id=2): get_httpx_response(404, {}),

        settings.netology_sign_in_part: get_httpx_response(201, {"ok": True}),
    }

    case = response_cases.get(request.url.path)

    if case is None:
        return httpx.Response(200, json={"Azamat": 'Lox'})

    return case


transport = httpx.MockTransport(_handler)
bad_request_transport = httpx.MockTransport(_bad_handler)