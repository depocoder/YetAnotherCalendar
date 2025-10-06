import json
import pathlib
import typing

import httpx
from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.netology import schema

mock_cookies = schema.NetologyCookies.model_validate({"_netology-on-rails_session": "aboba"})


def _fixture(relative_path: str) -> pathlib.Path:
    """Helper to construct fixture paths."""
    return settings.test_parent_path / relative_path


def get_httpx_response(
        status_code: int,
        body: typing.Any,
        fixture_path: pathlib.Path | None = None,
        headers: dict[str, str] | None = None,
) -> httpx.Response:
    if fixture_path is None:
        return httpx.Response(status_code, json=body, headers=headers)

    with open(fixture_path) as f:
        if ".json" in str(fixture_path):
            response_json = json.load(f)
            return httpx.Response(status_code, json=response_json, headers=headers)

        return httpx.Response(status_code, text=f.read(), headers=headers)

DEFAULT_MOCK_RESPONSE = get_httpx_response(404, {"detail": "Not Found"})

modeus_response_cases = {
    "/schedule-calendar/assets/app.config.json": get_httpx_response(
        200, {}, _fixture("fixtures/app_config.json")
    ),
    "/oauth2/authorize": get_httpx_response(
        302, {}, headers={"Location": "https://fs.utmn.ru/adfs/ls?aboba=true"}
    ),
    "/form-ok": get_httpx_response(200, {}, _fixture("fixtures/auth_form_ok.html")),
    "/ok": get_httpx_response(201, {"ok": True}),
    settings.modeus_search_events_part: get_httpx_response(
        200, {}, _fixture("fixtures/full_events.json")
    ),
    settings.modeus_search_people_part: get_httpx_response(
        200, {}, _fixture("fixtures/people_search_ok.json")
    ),
}

utmn_response_cases = {
    settings.utmn_get_teachers_part.format(page=1): get_httpx_response(
        200, {}, _fixture("fixtures/utmn_teachers_page_1.html")
    ),
    settings.utmn_get_teachers_part.format(page=2): get_httpx_response(
        200, {}, _fixture("fixtures/utmn_teachers_page_2.html")
    ),
    settings.utmn_get_teachers_part.format(page=3): get_httpx_response(
        200, {}, _fixture("fixtures/utmn_empty_page.html")
    ),
}

netology_response_cases = {
    "/backend/api/user/programs/calendar/filters": get_httpx_response(200, {"ok": True}),
    "/backend/api/unauthorized": get_httpx_response(404, {"detail": "Not Found"}),
    settings.netology_get_events_part.format(program_id=45526): get_httpx_response(
        200, {}, _fixture("fixtures/program_45526.json")
    ),
    settings.netology_get_events_part.format(program_id=57604): get_httpx_response(
        200, {}, _fixture("fixtures/program_57604.json")
    ),
    settings.netology_get_programs_part.format(calendar_id=45526): get_httpx_response(
        200, {}, _fixture("fixtures/profession.json")
    ),
    settings.netology_get_programs_part.format(calendar_id=2): get_httpx_response(404, {}),
    settings.netology_sign_in_part: get_httpx_response(201, {"ok": True}),
}

lms_wsfunction_responses = {
    'core_enrol_get_users_courses': get_httpx_response(
        200, {}, _fixture("fixtures/lms/lms_course_info.json")
    ),
    'core_user_get_users_by_field': get_httpx_response(
        200, {}, _fixture("fixtures/lms/lms_user_info.json")
    ),
}

lms_login_responses = {
    settings.lms_login_part: get_httpx_response(200, {"token": "token_12345"}),
    "/lms/send_request_list": get_httpx_response(200, {"token": [1,2,3]}),
}

def _handler(
    request: httpx.Request,
    response_cases: dict[str, httpx.Response],
    lookup_key: str | None = None,
    default_response: httpx.Response | None = None,
    raise_on_missing: bool = False,
) -> httpx.Response:
    """
    Generic handler for creating mock HTTP responses.

    Args:
        request: The httpx.Request object
        response_cases: Dictionary mapping URL keys to httpx.Response objects
        lookup_key: The key to lookup in response_cases (if None, uses request.url.path)
        default_response: Response to return when no case matches (defaults to DEFAULT_MOCK_RESPONSE)
        raise_on_missing: If True, raises ValueError when no case is found and no default is provided

    Returns:
        httpx.Response object
    """
    if lookup_key is None:
        lookup_key = request.url.path

    case = response_cases.get(lookup_key)

    if case is None:
        if raise_on_missing:
            raise ValueError(f"Can't find pattern for url {request.url}")
        return default_response if default_response is not None else DEFAULT_MOCK_RESPONSE

    return case


bad_response_cases = {
    "/backend/api/user/programs/calendar/filters/not-auth": get_httpx_response(
        401, {"text": "Not authorized"}
    ),
    "/backend/api/unknown": get_httpx_response(404, {"detail": "Not Found"}),
    "/backend/api/server_problem": get_httpx_response(500, {}),
    settings.netology_sign_in_part: get_httpx_response(401, {"detail": "Unauthorized"}),
    settings.netology_get_events_part.format(program_id=2): get_httpx_response(404, {}),
    settings.modeus_continue_auth_url: get_httpx_response(400, {"detail": "Bad request"}),
    "/schedule-calendar/assets/app.config.json": get_httpx_response(
        500, {}, _fixture("fixtures/wrong_app_config.json")
    ),
    "/oauth2/authorize": get_httpx_response(400, {}, headers={"Location": ""}),
    "/error-tag": get_httpx_response(200, {}, _fixture("fixtures/auth_form_error_tag.html")),
    "/bad-request": get_httpx_response(400, {"ok": False}),
    "/form-none": get_httpx_response(200, {}, _fixture("fixtures/auth_form_none.html")),
    "/unauthorized": get_httpx_response(401, {"ok": False}),
    settings.modeus_search_events_part: get_httpx_response(401, {"ok": False}),
    settings.modeus_search_people_part: get_httpx_response(
        200, {}, _fixture("fixtures/people_search_empty.json")
    ),
    settings.lms_login_part: get_httpx_response(200, {"error": "Something went wrong"}),
    "/lms/send_request_unknown": get_httpx_response(404, {"detail": "Not Found"}),
    "/lms/send_request_server_error": get_httpx_response(500, {}),
    settings.lms_get_user_part: get_httpx_response(403, {"text": "Forbidden"}),
    settings.utmn_get_teachers_part.format(page=404): get_httpx_response(404, {"detail": "Not Found"}),
    settings.utmn_get_teachers_part.format(page=500): get_httpx_response(500, {"detail": "Server Error"}),
    settings.utmn_get_teachers_part.format(page=1222): get_httpx_response(404, {"detail": "Not Found"}),
}


def _bad_handler(request: httpx.Request) -> httpx.Response:
    return _handler(
        request,
        bad_response_cases,
        default_response=httpx.Response(400, json={"Azamat": 'Lox'})
    )


def _lms_handler(request: httpx.Request, raise_error: bool = True) -> httpx.Response:
    wsfunction = request.url.params.get("wsfunction")
    if wsfunction:
        lookup_key = wsfunction
        response_cases = lms_wsfunction_responses
    else:
        lookup_key = request.url.path
        response_cases = lms_login_responses

    return _handler(request, response_cases, lookup_key=lookup_key, raise_on_missing=raise_error)


def _utmn_handler(request: httpx.Request) -> httpx.Response:
    return _handler(
        request,
        utmn_response_cases,
        lookup_key=request.url.raw_path.decode(),
        default_response=get_httpx_response(200, {}, _fixture("fixtures/utmn_empty_page.html"))
    )


def _netology_handler(request: httpx.Request) -> httpx.Response:
    return _handler(request, netology_response_cases)


def _modeus_handler(request: httpx.Request) -> httpx.Response:
    return _handler(request, modeus_response_cases)


def general_handler(request: httpx.Request) -> httpx.Response:
    """
    General handler that routes requests to appropriate service handlers.
    Combines netology, utmn, lms, and modeus handlers.
    """
    all_response_cases = {
        **netology_response_cases,
        **utmn_response_cases,
        **lms_login_responses,
        **modeus_response_cases,
    }

    wsfunction = request.url.params.get("wsfunction")
    if wsfunction:
        return _handler(request, lms_wsfunction_responses, lookup_key=wsfunction)

    lookup_key = request.url.raw_path.decode()
    if lookup_key in utmn_response_cases:
        return _handler(
            request,
            utmn_response_cases,
            lookup_key=lookup_key,
            default_response=get_httpx_response(200, {}, _fixture("fixtures/utmn_empty_page.html"))
        )

    return _handler(request, all_response_cases)


transport = httpx.MockTransport(general_handler)
bad_request_transport = httpx.MockTransport(_bad_handler)
utmn_transport = httpx.MockTransport(_utmn_handler)
lms_transport = httpx.MockTransport(_lms_handler)
modeus_transport = httpx.MockTransport(_modeus_handler)