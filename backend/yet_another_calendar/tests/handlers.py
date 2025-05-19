import json
import pathlib

import httpx
from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.netology import schema

mock_cookies = schema.NetologyCookies.model_validate({"_netology-on-rails_session": "aboba"})


def get_httpx_response(
        status_code: int,
        body: dict[str, str | bool],
        fixture_path: pathlib.Path | None = None,
        headers: dict[str, str] | None = None,
) -> httpx.Response:
    if fixture_path is None:
        return httpx.Response(status_code, json=body, headers=headers)

    with open(settings.test_parent_path / fixture_path) as f:
        if ".json" in str(fixture_path):
            response_json = json.load(f)
            return httpx.Response(status_code, json=response_json, headers=headers)

        return httpx.Response(status_code, text=f.read(), headers=headers)

def _bad_handler(request: httpx.Request) -> httpx.Response:
    response_cases = {
        # netology
        "/backend/api/user/programs/calendar/filters/not-auth": get_httpx_response(401,
                                                                                   {"text": "Not authorized"}),
        "/backend/api/unknown": get_httpx_response(404, {"detail": "Not Found"}),
        "/backend/api/server_problem": get_httpx_response(500, {}),
        settings.netology_sign_in_part: get_httpx_response(401, {"detail": "Unauthorized"}),
        settings.netology_get_events_part.format(program_id=2): get_httpx_response(404, {}),
        settings.modeus_continue_auth_url: get_httpx_response(400, {"detail": "Bad request"}),

        # modeus
        "/schedule-calendar/assets/app.config.json": get_httpx_response(500, {},
                                                             settings.test_parent_path /
                                                             "fixtures/wrong_app_config.json"),
        "/oauth2/authorize": get_httpx_response(400, {}, headers={"Location": ""}),
        "/error-tag": get_httpx_response(200, {},
                                         settings.test_parent_path / "fixtures/auth_form_error_tag.html"),
        "/bad-request": get_httpx_response(400, {"ok": False}),
        "/form-none": get_httpx_response(200, {},
                                         settings.test_parent_path / "fixtures/auth_form_none.html"),
        "/unauthorized": get_httpx_response(401, {"ok": False}),
        settings.modeus_search_events_part: get_httpx_response(401, {"ok": False}),
        settings.modeus_search_people_part: get_httpx_response(200, {},
                                                               settings.test_parent_path /
                                                               "fixtures/people_search_empty.json"),
    }

    case = response_cases.get(request.url.path)

    if case is None:
        return httpx.Response(400, json={"Azamat": 'Lox'})

    return case


def _handler(request: httpx.Request) -> httpx.Response:
    response_cases = {
        # netology
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

        # modeus
        "/schedule-calendar/assets/app.config.json": get_httpx_response(200, {},
                                                                        settings.test_parent_path /
                                                                        "fixtures/app_config.json"),
        "/oauth2/authorize": get_httpx_response(302, {},
                                                headers={"Location": "https://fs.utmn.ru/adfs/ls?aboba=true"}),
        "/form-ok": get_httpx_response(200, {},
                                      settings.test_parent_path / "fixtures/auth_form_ok.html"),
        "/ok": get_httpx_response(201, {"ok": True}),
        settings.modeus_search_events_part: get_httpx_response(200, {},
                                                               settings.test_parent_path /
                                                               "fixtures/full_events.json"),
        settings.modeus_search_people_part: get_httpx_response(200, {},
                                                               settings.test_parent_path /
                                                               "fixtures/people_search_ok.json"),
    }

    case = response_cases.get(request.url.path)

    if case is None:
        return httpx.Response(200, json={"Azamat": 'Lox'})

    return case


transport = httpx.MockTransport(_handler)
bad_request_transport = httpx.MockTransport(_bad_handler)