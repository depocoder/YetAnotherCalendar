import datetime
import typing
from copy import deepcopy

from icalendar.prop import vText
from starlette.responses import StreamingResponse

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.bulk.integration import create_ics_event, export_to_ics
from yet_another_calendar.web.api.bulk.schema import BulkResponse, CalendarResponse


def test_create_ics_event_start_after_end() -> None:
    start = datetime.datetime(2025, 6, 5, 16, 0)
    end = datetime.datetime(2025, 6, 5, 15, 0)  # ends before start
    lesson_id = "lesson-002"
    title = "Invalid Event"

    # If your function does not handle this, you can just test the incorrect data is passed
    event = create_ics_event(title, start, end, lesson_id)

    # Assert that dtstart is still after dtend (indicating incorrect input)
    assert event['DTSTART'].dt > event['DTEND'].dt


def test_create_ics_event_none_description_url() -> None:
    start = datetime.datetime(2025, 6, 5, 14, 0)
    end = datetime.datetime(2025, 6, 5, 15, 0)
    event = create_ics_event("Title", start, end, "lesson-005", description=None, url=None)
    assert event['DESCRIPTION'] == vText(b'None')
    assert event['LOCATION'] == vText(b'unknown location')


def test_create_ics_event_ok() -> None:
    start = datetime.datetime(2025, 6, 5, 14, 0)
    end = datetime.datetime(2025, 6, 5, 15, 0)
    lesson_id = "lesson-001"
    title = "Math Lecture"
    description = "Algebra and Linear Equations"
    url = "https://example.com/classroom"

    event = create_ics_event(title, start, end, lesson_id, description, url)

    assert event['SUMMARY'] == title
    assert event['LOCATION'] == url
    assert event['DTSTART'].dt == start
    assert event['DTEND'].dt == end
    assert event['UID'] == lesson_id
    assert event['DESCRIPTION'] == description
    # dtstamp should be close to now (within 5 seconds)
    dtstamp = event['DTSTAMP'].dt
    now_aware = datetime.datetime.now(dtstamp.tzinfo)
    assert (now_aware - dtstamp).total_seconds() < 5


@typing.no_type_check
def test_bulk_change_tz() -> None:
    with open(settings.test_parent_path / "fixtures/bulk_fixture.json") as f:
        content = f.read()
    bulk = BulkResponse.model_validate_json(content)
    new_bulk = deepcopy(bulk)
    new_bulk.change_timezone('America/los_angeles')

    assert (bulk.netology.webinars[0].starts_at.hour - new_bulk.netology.webinars[0].starts_at.hour) == 10
    assert (bulk.utmn.modeus_events[0].start_time.hour - new_bulk.utmn.modeus_events[0].start_time.hour) == 10


@typing.no_type_check
def test_calendar_response_get_hash() -> None:
    with open(settings.test_parent_path / "fixtures/bulk_fixture.json") as f:
        content = f.read()
    calendar_response = CalendarResponse.model_validate_json(content)
    # assert calendar_response.get_hash() == "ea6326e66b5e1bacfaa5042b0e4421c2"
    assert len(calendar_response.get_hash()) == 32


async def test_export_to_ics() -> None:
    with open(settings.test_parent_path / "fixtures/bulk_fixture.json") as f:
        content = f.read()

    time_zone = "Europe/Moscow"
    calendar = CalendarResponse.model_validate_json(content).change_timezone(time_zone)
    isc_calendar = StreamingResponse(export_to_ics(calendar))

    assert isc_calendar


    async for resp in isc_calendar.body_iterator:
        assert "BEGIN:VCALENDAR" in str(resp)
        assert "VERSION:2.0" in str(resp)
        assert "TZID=Europe/Moscow" in str(resp)
        assert "SUMMARY:Netology: 2" in str(resp)
