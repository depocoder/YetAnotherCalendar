import datetime
import json
import typing
from unittest.mock import patch, AsyncMock, MagicMock

import httpx
import pytest
from fastapi import HTTPException
from httpx import AsyncClient

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.modeus import integration, schema
from yet_another_calendar.web.api.modeus.schema import DayEventsRequest
import uuid


def handler(request: httpx.Request) -> httpx.Response:
    match request.url.path:
        case '/schedule-calendar/assets/app.config.json':
            file_path, status_code = ("fixtures/app_config.json", 200)

            if request.headers.get("invalid_app_config"):
                file_path, status_code = ("fixtures/wrong_app_config.json", 500)

            with open(settings.test_parent_path / file_path) as f:
                response_json = json.load(f)
                return httpx.Response(status_code, json=response_json)
        case '/oauth2/authorize':
            if request.headers.get("invalid_authorize"):
                return httpx.Response(400, headers={"Location": ""})  # todo: fix
            return httpx.Response(302, headers={"Location": "https://fs.utmn.ru/adfs/ls?aboba=true"})
        case '/bad-request':
            return httpx.Response(400, json={"ok": False})
        case '/error-tag':
            with open(settings.test_parent_path / "fixtures/auth_form_error_tag.html") as f:
                return httpx.Response(200, text=f.read())
        case '/form-none':
            with open(settings.test_parent_path / "fixtures/auth_form_none.html") as f:
                return httpx.Response(200, text=f.read())
        case '/form-ok':
            with open(settings.test_parent_path / "fixtures/auth_form_ok.html") as f:
                return httpx.Response(200, text=f.read())
        case _:
            return httpx.Response(200, json={"Azamat": 'Lox'})


transport = httpx.MockTransport(handler)


@pytest.mark.asyncio
async def test_get_post_url_invalid_app_config() -> None:
    client = AsyncClient(http2=True,
                         base_url="https://utmn.modeus.org",
                         transport=transport,
                         headers={"invalid_app_config": "1"})

    with pytest.raises(KeyError) as exc_info:
        await integration.get_post_url(client)

    assert str(exc_info.value) == "'clientId'"


@pytest.mark.asyncio
async def test_get_post_url_ok() -> None:
    client = AsyncClient(http2=True, base_url="https://utmn.modeus.org", transport=transport)
    post_url = await integration.get_post_url(client)

    assert str(post_url) == "https://fs.utmn.ru/adfs/ls?aboba=true"


@pytest.mark.asyncio
async def test_get_auth_form_bad_request() -> None:
    client = AsyncClient(
        http2=True,
        base_url="https://utmn.modeus.org",
        transport=transport,
    )

    with patch("yet_another_calendar.web.api.modeus.integration.get_post_url",
               return_value="https://fs.utmn.ru/bad-request"):
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await integration.get_auth_form(client, "ivan", "12345")

    assert exc_info.type is httpx.HTTPStatusError
    assert exc_info.value.response.status_code == 400


@pytest.mark.asyncio
async def test_get_auth_form_with_error_tag() -> None:
    client = AsyncClient(
        http2=True,
        base_url="https://utmn.modeus.org",
        transport=transport,
    )

    with patch("yet_another_calendar.web.api.modeus.integration.get_post_url",
               return_value="https://fs.utmn.ru/error-tag"):
        with pytest.raises(HTTPException) as exc_info:
            await integration.get_auth_form(client, "ivan", "12345")

        assert exc_info.value.detail == "Modeus error. ERROR"
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_auth_form_none() -> None:
    client = AsyncClient(
        http2=True,
        base_url="https://utmn.modeus.org",
        transport=transport,
    )

    with patch("yet_another_calendar.web.api.modeus.integration.get_post_url",
               return_value="https://fs.utmn.ru/form-none"):
        with pytest.raises(HTTPException) as exc_info:
            await integration.get_auth_form(client, "ivan", "12345")

        assert exc_info.value.detail == "Modeus error. Can't get form."
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
@typing.no_type_check
async def test_get_auth_form_ok() -> None:
    client = AsyncClient(
        http2=True,
        base_url="https://utmn.modeus.org",
        transport=transport,
    )

    with patch("yet_another_calendar.web.api.modeus.integration.get_post_url",
               return_value="https://fs.utmn.ru/form-ok"):
        form = await integration.get_auth_form(client, "ivan", "12345")

        assert not form.is_empty_element
        assert form.get("action") == "/submit"
        assert form.find_all("input")[0].get("name") == "username"
        assert form.find_all("input")[1].get("name") == "password"
        assert form.find("button").text == "Login"


def handler_day_events(request: httpx.Request) -> httpx.Response:
    """Handler for day events testing."""
    match request.url.path:
        case '/schedule-calendar-v2/api/calendar/events/search':
            response_data = {
                "_embedded": {
                    "events": [
                        {
                            "id": "123e4567-e89b-12d3-a456-426614174001",
                            "name": "Test Event",
                            "nameShort": "Test",
                            "description": "Test Description",
                            "start": "2024-01-15T10:00:00Z",
                            "end": "2024-01-15T11:30:00Z",
                            "_links": {
                                "course-unit-realization": {
                                    "href": "123e4567-e89b-12d3-a456-426614174002",
                                },
                                "cycle-realization": {
                                    "href": "123e4567-e89b-12d3-a456-426614174003",
                                },
                            },
                        },
                    ],
                    "event-locations": [
                        {
                            "eventId": "123e4567-e89b-12d3-a456-426614174001",
                            "customLocation": "Room 101",
                        },
                    ],
                    "event-attendees": [
                        {
                            "_links": {
                                "self": {"href": "attendee1"},
                                "event": {"href": "123e4567-e89b-12d3-a456-426614174001"},
                                "person": {"href": "123e4567-e89b-12d3-a456-426614174004"},
                            },
                        },
                    ],
                    "persons": [
                        {
                            "id": "123e4567-e89b-12d3-a456-426614174004",
                            "fullName": "Test Teacher",
                        },
                    ],
                    "course-unit-realizations": [
                        {
                            "id": "123e4567-e89b-12d3-a456-426614174002",
                            "name": "Test Course",
                        },
                    ],
                    "cycle-realizations": [
                        {
                            "id": "123e4567-e89b-12d3-a456-426614174003",
                            "name": "Test Cycle",
                            "code": "TC001",
                        },
                    ],
                },
            }
            return httpx.Response(200, json=response_data)
        case _:
            return httpx.Response(200, json={"test": "data"})



@pytest.mark.asyncio
async def test_get_day_events_success() -> None:
    """Test successful day events retrieval."""
    jwt_token = "test.jwt.token"
    payload: dict[str, object] = {
        "timeMin": "2024-01-15T00:00:00Z",
        "timeMax": "2024-01-15T23:59:59Z",
        "learningStartYear": [2024],
        "profileName": ["Разработка IT-продуктов и информационных систем"],
        "specialtyCode": ["09.03.02"],
    }

    with patch("yet_another_calendar.web.api.modeus.integration.get_day_events") as mock_get_day_events:
        mock_get_day_events.return_value = []

        events = await integration.get_day_events(jwt_token, payload)

        assert isinstance(events, list)
        mock_get_day_events.assert_called_once_with(jwt_token, payload)


@pytest.mark.asyncio
async def test_get_day_events_http_error() -> None:
    """Test day events with HTTP error."""
    jwt_token = "test.jwt.token"
    payload: dict[str, object] = {
        "timeMin": "2024-01-15T00:00:00Z",
        "timeMax": "2024-01-15T23:59:59Z",
        "learningStartYear": [2024],
        "profileName": ["Разработка IT-продуктов и информационных систем"],
        "specialtyCode": ["09.03.02"],
    }

    with patch("yet_another_calendar.web.api.modeus.integration.get_day_events") as mock_get_day_events:
        mock_get_day_events.side_effect = httpx.HTTPStatusError(
            "Error", request=httpx.Request("POST", "http://test.com"), response=httpx.Response(500),
        )

        with pytest.raises(httpx.HTTPStatusError):
            await integration.get_day_events(jwt_token, payload)


def test_day_events_request_validation() -> None:
    """Test DayEventsRequest validation."""
    from yet_another_calendar.web.api.modeus.schema import DayEventsRequest
    import datetime

    request = DayEventsRequest(
        date=datetime.date(2024, 1, 15),
        learningStartYear=[2024],
        profileName=["Test Profile"],
        specialtyCode=["09.03.02"],
    )

    payload = request.to_search_payload()

    assert "timeMin" in payload
    assert "timeMax" in payload
    assert payload["learningStartYear"] == [2024]
    assert payload["profileName"] == ["Test Profile"]
    assert payload["specialtyCode"] == ["09.03.02"]


def test_day_events_request_defaults() -> None:
    """Test DayEventsRequest with default values."""
    from yet_another_calendar.web.api.modeus.schema import DayEventsRequest
    import datetime

    request = DayEventsRequest(
        date=datetime.date(2024, 1, 15),
        learningStartYear=[2024],
    )

    assert request.profile_name == ["Разработка IT-продуктов и информационных систем"]
    assert request.specialty_code == ["09.03.02"]


def test_day_events_request_to_search_payload() -> None:
    """Test DayEventsRequest to_search_payload method."""
    from yet_another_calendar.web.api.modeus.schema import DayEventsRequest
    import datetime

    test_date = datetime.date(2024, 1, 15)
    request = DayEventsRequest(
        date=test_date,
        learningStartYear=[2024],
        profileName=["Custom Profile"],
        specialtyCode=["Custom Code"],
    )

    payload = request.to_search_payload()

    assert payload["timeMin"] == "2024-01-15T00:00:00+00:00"
    assert payload["timeMax"] == "2024-01-15T23:59:59+00:00"
    assert payload["learningStartYear"] == [2024]
    assert payload["profileName"] == ["Custom Profile"]
    assert payload["specialtyCode"] == ["Custom Code"]


@pytest.mark.asyncio
async def test_modeus_calendar_serialization() -> None:
    """Test ModeusCalendar serialization without cache."""
    from yet_another_calendar.web.api.modeus.schema import ModeusCalendar

    calendar_data = {
        "_embedded": {
            "events": [
                {
                    "id": "123e4567-e89b-12d3-a456-426614174001",
                    "name": "Test Event",
                    "nameShort": "Test",
                    "description": "Test Description",
                    "start": "2024-01-15T10:00:00Z",
                    "end": "2024-01-15T11:30:00Z",
                    "_links": {
                        "course-unit-realization": {
                            "href": "123e4567-e89b-12d3-a456-426614174002",
                        },
                        "cycle-realization": {
                            "href": "123e4567-e89b-12d3-a456-426614174003",
                        },
                    },
                },
            ],
            "event-locations": [
                {
                    "eventId": "123e4567-e89b-12d3-a456-426614174001",
                    "customLocation": "Room 101",
                },
            ],
            "event-attendees": [
                {
                    "_links": {
                        "self": {"href": "attendee1"},
                        "event": {"href": "123e4567-e89b-12d3-a456-426614174001"},
                        "person": {"href": "123e4567-e89b-12d3-a456-426614174004"},
                    },
                },
            ],
            "persons": [
                {
                    "id": "123e4567-e89b-12d3-a456-426614174004",
                    "fullName": "Test Teacher",
                },
            ],
            "course-unit-realizations": [
                {
                    "id": "123e4567-e89b-12d3-a456-426614174002",
                    "name": "Test Course",
                },
            ],
            "cycle-realizations": [
                {
                    "id": "123e4567-e89b-12d3-a456-426614174003",
                    "name": "Test Cycle",
                    "code": "TC001",
                },
            ],
        },
    }

    calendar = ModeusCalendar.model_validate(calendar_data)
    events = calendar.serialize_modeus_response(skip_lxp=False)

    assert isinstance(events, list)
    assert len(events) == 1
    assert events[0].name == "Test Event"
    assert events[0].course_name == "Test Course"
    assert events[0].teacher_full_name == "Test Teacher"


@pytest.mark.asyncio
async def test_modeus_post_function() -> None:
    """Test post_modeus function directly."""
    from unittest.mock import Mock

    jwt_token = "test.jwt.token"

    body_mock = Mock()
    body_mock.model_dump_json.return_value = '{"test": "data"}'

    with patch("yet_another_calendar.web.api.modeus.integration.AsyncClient") as mock_client:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "success"
        mock_response.raise_for_status = Mock()

        mock_session = Mock()
        mock_session.post = AsyncMock(return_value=mock_response)
        mock_session.headers = {}

        mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_client.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await integration.post_modeus(jwt_token, body_mock, "/test/url")

        assert result == "success"
        mock_session.post.assert_called_once()

        assert mock_session.headers["Authorization"] == f"Bearer {jwt_token}"
        assert mock_session.headers["content-type"] == "application/json"


@pytest.mark.asyncio
async def test_modeus_post_function_unauthorized() -> None:
    """Test post_modeus function with 401 error."""
    from unittest.mock import Mock

    jwt_token = "expired.jwt.token"

    body_mock = Mock()
    body_mock.model_dump_json.return_value = '{"test": "data"}'

    with patch("yet_another_calendar.web.api.modeus.integration.AsyncClient") as mock_client:
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.raise_for_status = Mock()

        mock_session = Mock()
        mock_session.post = AsyncMock(return_value=mock_response)
        mock_session.headers = {}

        mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_client.return_value.__aexit__ = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await integration.post_modeus(jwt_token, body_mock, "/test/url")

        assert exc_info.value.status_code == 401
        assert "Modeus token expired!" in exc_info.value.detail


def test_location_is_lxp_property() -> None:
    """Test Location.is_lxp computed property."""
    from yet_another_calendar.web.api.modeus.schema import Location
    import uuid

    location_lxp = Location(eventId=uuid.uuid4(), customLocation="LXP")
    assert location_lxp.is_lxp == 1.0

    location_none = Location(eventId=uuid.uuid4(), customLocation=None)
    assert location_none.is_lxp

    location_other = Location(eventId=uuid.uuid4(), customLocation="Room 101")
    assert not location_other.is_lxp


def test_href_id_property() -> None:
    """Test Href.id computed property."""
    from yet_another_calendar.web.api.modeus.schema import Href
    import uuid

    test_uuid = uuid.uuid4()
    href = Href(href=str(test_uuid))

    assert href.id == test_uuid


def test_modeus_time_body_validation_errors() -> None:
    from yet_another_calendar.web.api.modeus.schema import ModeusTimeBody
    import datetime

    with pytest.raises(ValueError, match="Time must be UTC"):
        ModeusTimeBody(
            timeMin=datetime.datetime(2024, 1, 15, 0, 0, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=3))),
            timeMax=datetime.datetime(2024, 1, 21, 23, 59, 59, tzinfo=datetime.UTC),
        )

    with pytest.raises(ValueError, match="Time must me 00:00:00"):
        ModeusTimeBody(
            timeMin=datetime.datetime(2024, 1, 15, 12, 30, 0, tzinfo=datetime.UTC),
            timeMax=datetime.datetime(2024, 1, 21, 23, 59, 59, tzinfo=datetime.UTC),
        )

    with pytest.raises(ValueError, match="Weekday time_min must be Monday"):
        ModeusTimeBody(
            timeMin=datetime.datetime(2024, 1, 16, 0, 0, 0, tzinfo=datetime.UTC),
            timeMax=datetime.datetime(2024, 1, 21, 23, 59, 59, tzinfo=datetime.UTC),
        )


def test_extract_token_from_url_edge_cases() -> None:
    from yet_another_calendar.web.api.modeus.integration import _extract_token_from_url

    result = _extract_token_from_url("")
    assert result is None

    result = _extract_token_from_url("no_token_here")
    assert result is None


def test_modeus_calendar_serialization_skip_lxp() -> None:
    from yet_another_calendar.web.api.modeus.schema import ModeusCalendar
    import uuid

    e_id = uuid.uuid4()
    t_id = uuid.uuid4()
    c_id = uuid.uuid4()
    cyc_id = uuid.uuid4()

    calendar_json = {
        "_embedded": {
            "events": [{
                "id": str(e_id),
                "name": "LXP-Lesson",
                "nameShort": "LXP",
                "description": "Должно пропасть",
                "start": "2025-02-03T10:00:00Z",
                "end":   "2025-02-03T11:30:00Z",
                "_links": {
                    "course-unit-realization": {"href": str(c_id)},
                    "cycle-realization":       {"href": str(cyc_id)},
                },
            }],
            "event-locations": [{
                "eventId": str(e_id),
                "customLocation": "LXP",
            }],
            "event-attendees": [{
                "_links": {
                    "self":  {"href": "att1"},
                    "event": {"href": str(e_id)},
                    "person":{"href": str(t_id)},
                },
            }],
            "persons": [{
                "id": str(t_id),
                "fullName": "Доцент X",
            }],
            "course-unit-realizations": [{
                "id": str(c_id),
                "name": "Тестовый курс",
            }],
            "cycle-realizations": [{
                "id": str(cyc_id),
                "name": "Цикл",
                "code": "TC-01",
            }],
        },
    }

    cal = ModeusCalendar.model_validate(calendar_json)
    result = cal.serialize_modeus_response(skip_lxp=True)

    assert result == []


def test_modeus_time_body_valid() -> None:
    from yet_another_calendar.web.api.modeus.schema import ModeusTimeBody
    import datetime

    monday = datetime.datetime(2025, 2, 3, 0, 0, 0, tzinfo=datetime.UTC)
    sunday = datetime.datetime(2025, 2, 9, 23, 59, 59, tzinfo=datetime.UTC)

    body = ModeusTimeBody.model_validate({
        "timeMin": monday.isoformat(),
        "timeMax": sunday.isoformat(),
    })

    assert body.time_min == monday
    assert body.time_max == sunday


def test_creds_valid_utmn_email() -> None:
    from yet_another_calendar.web.api.modeus.schema import Creds

    creds = Creds(username="ivan@utmn.ru", password="secret")
    assert creds.username == "ivan@study.utmn.ru"


def test_build_search_payload_valid() -> None:
    import datetime as dt

    monday = dt.datetime(2025, 2, 3, tzinfo=dt.UTC)

    request = DayEventsRequest(
        date=monday.date(),
        learningStartYear=[2024],
    )
    payload = request.to_search_payload()

    assert payload["timeMin"] == monday.replace(hour=0, minute=0, second=0).isoformat()
    assert payload["timeMax"] == monday.replace(hour=23, minute=59, second=59).isoformat()
    assert payload["learningStartYear"] == [2024]


@pytest.mark.asyncio
async def test_get_post_url_with_none_url() -> None:
    async with AsyncClient(base_url="https://test.modeus.org") as client:
        with patch.object(client, 'get') as mock_get:
            config_response = MagicMock()
            config_response.json.return_value = {
                "wso": {
                    "clientId": "test-client-id",
                    "loginUrl": "https://auth.test.com/oauth2/authorize",
                },
            }

            auth_response = MagicMock()
            auth_response.url = None

            mock_get.side_effect = [config_response, auth_response]

            with pytest.raises(HTTPException) as exc_info:
                await integration.get_post_url(client)

            assert "Can't get post_url" in exc_info.value.detail


def test_extract_token_custom_match_index() -> None:
    url = "test_url#id_token=first.token&other_token=second.token"
    result = integration._extract_token_from_url(url, match_index=1)
    assert result == "first.token"


def test_extract_token_public_wrapper() -> None:
    url = "test_url#id_token=test.jwt.token"
    result = integration.extract_token_from_url(url)
    assert result == "test.jwt.token"


@pytest.mark.asyncio
async def test_get_events_direct_call() -> None:
    mock_jwt = "test.jwt.token"
    mock_body = schema.ModeusEventsBody(
        timeMin=datetime.datetime(2024, 1, 15, 0, 0, 0, tzinfo=datetime.UTC),
        timeMax=datetime.datetime(2024, 1, 21, 23, 59, 59, tzinfo=datetime.UTC),
        attendeePersonId=[uuid.uuid4()],
    )

    mock_response: dict[str, typing.Any] = {
        "_embedded": {
            "events": [],
            "event-locations": [],
            "event-attendees": [],
            "persons": [],
            "course-unit-realizations": [],
            "cycle-realizations": [],
        },
    }

    # Мокаем post_modeus как AsyncMock
    with patch('yet_another_calendar.web.api.modeus.integration.post_modeus', new_callable=AsyncMock) as mock_post:
        mock_post.return_value = json.dumps(mock_response)

        result = await integration.get_events(mock_body, mock_jwt)

        assert isinstance(result, list)
        mock_post.assert_called_once_with(mock_jwt, mock_body, settings.modeus_search_events_part)


@pytest.mark.asyncio
async def test_get_day_events_direct_call() -> None:
    event_id = "550e8400-e29b-41d4-a716-446655440000"
    teacher_id = "550e8400-e29b-41d4-a716-446655440001"
    course_id = "550e8400-e29b-41d4-a716-446655440002"
    cycle_id = "550e8400-e29b-41d4-a716-446655440003"

    mock_response_data = {
        "_embedded": {
            "events": [{
                "id": event_id,
                "name": "Test Event",
                "description": "Test Description",
                "start": "2024-01-15T10:00:00Z",
                "end": "2024-01-15T11:30:00Z",
                "_links": {
                    "course-unit-realization": {"href": course_id},
                    "cycle-realization": {"href": cycle_id},
                },
            }],
            "event-locations": [{
                "eventId": event_id,
                "customLocation": "Room 101",
            }],
            "event-attendees": [{
                "_links": {
                    "self": {"href": "attendee1"},
                    "event": {"href": event_id},
                    "person": {"href": teacher_id},
                },
            }],
            "persons": [{
                "id": teacher_id,
                "fullName": "Test Teacher",
            }],
            "course-unit-realizations": [{
                "id": course_id,
                "name": "Test Course",
            }],
            "cycle-realizations": [{
                "id": cycle_id,
                "name": "Test Cycle",
                "code": "TC001",
            }],
        },
    }

    with patch('yet_another_calendar.web.api.modeus.integration.AsyncClient') as mock_client:
        mock_session = MagicMock()
        mock_response = MagicMock()
        mock_response.text = json.dumps(mock_response_data)
        mock_response.raise_for_status = MagicMock()

        mock_session.post = AsyncMock(return_value=mock_response)
        mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_client.return_value.__aexit__ = AsyncMock()

        from yet_another_calendar.web.api.modeus.schema import ModeusCalendar

        calendar = ModeusCalendar.model_validate(mock_response_data)
        result = calendar.serialize_modeus_response(skip_lxp=False)

        assert isinstance(result, list)
        assert len(result) == 1
        assert result[0].name == "Test Event"


@pytest.mark.asyncio
async def test_get_people_direct_call() -> None:
    mock_jwt = "test.jwt.token"
    mock_body = schema.FullModeusPersonSearch(fullName="Тестов Тест Тестович")

    person_id = str(uuid.uuid4())
    mock_response = {
        "_embedded": {
            "persons": [{
                "id": person_id,
                "fullName": "Тестов Тест Тестович",
            }],
            "students": [{
                "personId": person_id,
                "flowCode": "TEST-001",
                "learningStartDate": "2024-09-01T00:00:00Z",
                "learningEndDate": "2028-06-30T00:00:00Z",
                "specialtyCode": "09.03.02",
                "specialtyName": "Программная инженерия",
                "specialtyProfile": "Разработка программного обеспечения",
            }],
        },
    }

    with patch('yet_another_calendar.web.api.modeus.integration.post_modeus', new_callable=AsyncMock) as mock_post:
        mock_post.return_value = json.dumps(mock_response)

        result = await integration.get_people(mock_jwt, mock_body)

        assert isinstance(result, list)
        mock_post.assert_called_once_with(mock_jwt, mock_body, settings.modeus_search_people_part)


@pytest.mark.asyncio
async def test_post_modeus_unauthorized_error() -> None:
    mock_body = schema.ModeusEventsBody(
        timeMin=datetime.datetime(2024, 1, 15, 0, 0, 0, tzinfo=datetime.UTC),
        timeMax=datetime.datetime(2024, 1, 21, 23, 59, 59, tzinfo=datetime.UTC),
        attendeePersonId=[uuid.uuid4()],
    )

    with patch('yet_another_calendar.web.api.modeus.integration.AsyncClient') as mock_client:
        mock_session = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 401

        mock_session.post = AsyncMock(return_value=mock_response)
        mock_session.headers = {}
        mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_client.return_value.__aexit__ = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await integration.post_modeus("expired.jwt", mock_body, "/test/url")

        assert exc_info.value.status_code == 401
        assert "token expired" in exc_info.value.detail


def test_modeus_calendar_serialization_multiple_events() -> None:
    event_id1 = str(uuid.uuid4())
    event_id2 = str(uuid.uuid4())
    teacher_id = str(uuid.uuid4())
    course_id = str(uuid.uuid4())
    cycle_id = str(uuid.uuid4())

    calendar_data = {
        "_embedded": {
            "events": [
                {
                    "id": event_id1,
                    "name": "Event 1",
                    "description": "Description 1",
                    "start": "2024-01-15T10:00:00Z",
                    "end": "2024-01-15T11:30:00Z",
                    "_links": {
                        "course-unit-realization": {"href": course_id},
                        "cycle-realization": {"href": cycle_id},
                    },
                },
                {
                    "id": event_id2,
                    "name": "Event 2",
                    "description": "Description 2",
                    "start": "2024-01-15T14:00:00Z",
                    "end": "2024-01-15T15:30:00Z",
                    "_links": {
                        "course-unit-realization": {"href": course_id},
                        "cycle-realization": {"href": cycle_id},
                    },
                },
            ],
            "event-locations": [
                {"eventId": event_id1, "customLocation": "Room 101"},
                {"eventId": event_id2, "customLocation": "Room 102"},
            ],
            "event-attendees": [
                {
                    "_links": {
                        "self": {"href": "attendee1"},
                        "event": {"href": event_id1},
                        "person": {"href": teacher_id},
                    },
                },
                {
                    "_links": {
                        "self": {"href": "attendee2"},
                        "event": {"href": event_id2},
                        "person": {"href": teacher_id},
                    },
                },
            ],
            "persons": [{"id": teacher_id, "fullName": "Teacher Name"}],
            "course-unit-realizations": [{"id": course_id, "name": "Course Name"}],
            "cycle-realizations": [{"id": cycle_id, "name": "Cycle Name", "code": "CYC001"}],
        },
    }

    calendar = schema.ModeusCalendar.model_validate(calendar_data)
    events = calendar.serialize_modeus_response(skip_lxp=False)

    assert len(events) == 2
    assert events[0].name == "Event 1"
    assert events[1].name == "Event 2"


def test_get_person_id_from_jwt() -> None:
    import jwt as jwt_lib

    payload = {"person_id": "test-person-123", "exp": 9999999999}
    valid_jwt = jwt_lib.encode(payload, "secret", algorithm="HS256")

    result = schema.get_person_id(valid_jwt)
    assert result == "test-person-123"


def test_get_person_id_invalid_jwt() -> None:
    with pytest.raises(HTTPException) as exc_info:
        schema.get_person_id("invalid.jwt.token")

    assert exc_info.value.status_code == 400
    assert "Can't decode token" in exc_info.value.detail


@pytest.mark.asyncio
async def test_views_get_calendar_simple() -> None:
    from yet_another_calendar.web.api.modeus.views import get_calendar

    mock_body = schema.ModeusTimeBody(
        timeMin=datetime.datetime(2024, 1, 15, 0, 0, 0, tzinfo=datetime.UTC),
        timeMax=datetime.datetime(2024, 1, 21, 23, 59, 59, tzinfo=datetime.UTC),
    )
    mock_jwt = "test.jwt.token"
    mock_person_id = str(uuid.uuid4())

    with patch(
        'yet_another_calendar.web.api.modeus.integration.get_events',
        new_callable=AsyncMock) as mock_get_events:
        mock_get_events.return_value = []

        result = await get_calendar(mock_body, mock_jwt, mock_person_id)

        assert isinstance(result, list)
        mock_get_events.assert_called_once()


@pytest.mark.asyncio
async def test_views_day_events_simple() -> None:
    import datetime
    from yet_another_calendar.web.api.modeus.views import day_events

    mock_request = schema.DayEventsRequest(
        date=datetime.date(2024, 1, 15),
        learningStartYear=[2024],
        profileName=["Test Profile"],
        specialtyCode=["09.03.02"],
    )
    mock_jwt = "test.jwt.token"

    with patch(
        'yet_another_calendar.web.api.modeus.integration.get_day_events',
        new_callable=AsyncMock) as mock_get_day_events:
        mock_get_day_events.return_value = []

        result = await day_events(mock_request, mock_jwt)

        assert isinstance(result, list)
        mock_get_day_events.assert_called_once()


@pytest.mark.asyncio
async def test_views_auth_simple() -> None:
    from yet_another_calendar.web.api.modeus.views import auth

    mock_creds = schema.Creds(
        username="test@study.utmn.ru",
        password="password",
    )

    with patch('yet_another_calendar.web.api.modeus.integration.login', new_callable=AsyncMock) as mock_login:
        mock_login.return_value = "test.jwt.token"

        result = await auth(mock_creds)

        assert result == "test.jwt.token"
        mock_login.assert_called_once_with(mock_creds.username, mock_creds.password)