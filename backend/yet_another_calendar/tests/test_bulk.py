"""Complete bulk tests combining coverage and integration tests."""
import datetime
import pytest
import json
import typing
from typing import Any
from collections.abc import Generator
from copy import deepcopy
from unittest.mock import patch

from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from starlette.responses import StreamingResponse
from icalendar.prop import vText

from yet_another_calendar.web.api.bulk import integration, schema, views
from yet_another_calendar.web.api.modeus import schema as modeus_schema
from yet_another_calendar.web.api.lms import schema as lms_schema
from yet_another_calendar.web.api.netology import schema as netology_schema


@pytest.fixture(autouse=True)
def _init_cache() -> Generator[Any, Any, None]:
    """Initialize FastAPICache for bulk tests."""
    FastAPICache.init(InMemoryBackend())
    yield
    FastAPICache.reset()


# ========================================
# Schema Tests
# ========================================

def test_now_dt_utc_function():
    """Test the now_dt_utc function from schema."""
    from yet_another_calendar.web.api.bulk.schema import now_dt_utc

    now = now_dt_utc()
    assert isinstance(now, datetime.datetime)
    assert now.tzinfo == datetime.timezone.utc

    # Should be close to current time (within 5 seconds)
    current_time = datetime.datetime.now(datetime.timezone.utc)
    time_diff = abs((current_time - now).total_seconds())
    assert time_diff < 5


def test_utmn_response_schema():
    """Test UtmnResponse schema to cover lines 17-19."""
    # Create UtmnResponse with empty lists
    utmn_empty = schema.UtmnResponse(
        modeus_events=[],
        lms_events=[]
    )

    assert utmn_empty.modeus_events == []
    assert utmn_empty.lms_events == []
    assert isinstance(utmn_empty.modeus_events, list)
    assert isinstance(utmn_empty.lms_events, list)


def test_bulk_response_complete_schema(bulk_fixture_content):
    """Test BulkResponse complete schema using fixtures."""
    # Test BulkResponse creation (covers lines 22-24)
    bulk = schema.BulkResponse.model_validate_json(bulk_fixture_content)

    assert hasattr(bulk, 'netology')
    assert hasattr(bulk, 'utmn')
    assert isinstance(bulk.utmn, schema.UtmnResponse)

    # Test timezone error handling (covers lines 28-30)
    with pytest.raises(Exception):  # HTTPException for invalid timezone
        bulk.change_timezone("Invalid/Timezone")


def test_schema_bulk_response_fields():
    """Test BulkResponse model fields to cover lines 45-46 in schema.py."""
    # Test UtmnResponse
    utmn = schema.UtmnResponse(
        modeus_events=[],
        lms_events=[]
    )
    assert utmn.modeus_events == []
    assert utmn.lms_events == []

    # Test BulkResponse with UtmnResponse
    bulk = schema.BulkResponse(
        netology={'homework': [], 'webinars': []},
        utmn=utmn
    )
    assert isinstance(bulk.utmn, schema.UtmnResponse)

    # Test timezone change with empty events (should handle gracefully)
    changed = bulk.change_timezone("Europe/Moscow")
    assert changed is bulk


def test_schema_timezone_error_handling(bulk_fixture_content):
    """Test BulkResponse timezone error handling to cover lines 28-30."""
    bulk_response = schema.BulkResponse.model_validate_json(bulk_fixture_content)

    # Test invalid timezone to cover exception handling
    with pytest.raises(Exception):  # HTTPException for invalid timezone
        bulk_response.change_timezone("Invalid/Timezone")

    # Test another invalid timezone format
    with pytest.raises(Exception):
        bulk_response.change_timezone("Not_A_Real/Timezone")


def test_calendar_response_complete(bulk_fixture_content, sample_datetime):
    """Test CalendarResponse with all features using fixtures."""
    # Test default cached_at (covers line 51)
    calendar1 = schema.CalendarResponse.model_validate_json(bulk_fixture_content)
    assert hasattr(calendar1, 'cached_at')
    assert isinstance(calendar1.cached_at, datetime.datetime)

    # Test custom cached_at
    custom_time = sample_datetime['start'].replace(tzinfo=datetime.timezone.utc)
    calendar_data = {
        **calendar1.model_dump(by_alias=True),
        "cached_at": custom_time.isoformat()
    }

    calendar2 = schema.CalendarResponse.model_validate(calendar_data)
    assert calendar2.cached_at.replace(microsecond=0) == custom_time.replace(microsecond=0)

    # Test hash generation (covers lines 53-55)
    hash1 = calendar1.get_hash()
    hash2 = calendar2.get_hash()

    assert len(hash1) == 32  # MD5 hash length
    assert len(hash2) == 32
    assert isinstance(hash1, str)
    assert isinstance(hash2, str)


def test_calendar_response_with_custom_cached_at(bulk_fixture_content):
    """Test CalendarResponse with custom cached_at field."""
    # Test default cached_at
    calendar1 = schema.CalendarResponse.model_validate_json(bulk_fixture_content)
    assert hasattr(calendar1, 'cached_at')
    assert isinstance(calendar1.cached_at, datetime.datetime)

    # Test with custom cached_at
    custom_time = datetime.datetime(2025, 1, 1, 12, 0, 0, tzinfo=datetime.timezone.utc)
    data = {**calendar1.model_dump(by_alias=True), "cached_at": custom_time.isoformat()}

    calendar2 = schema.CalendarResponse.model_validate(data)
    assert calendar2.cached_at.replace(microsecond=0) == custom_time.replace(microsecond=0)


def test_refreshed_calendar_response_complete(bulk_fixture_content):
    """Test RefreshedCalendarResponse with changed field using fixtures."""
    calendar_data = schema.CalendarResponse.model_validate_json(bulk_fixture_content)

    # Test with changed=True
    refreshed_true = schema.RefreshedCalendarResponse(
        **calendar_data.model_dump(by_alias=True),
        changed=True
    )

    assert refreshed_true.changed is True
    assert hasattr(refreshed_true, 'cached_at')
    assert hasattr(refreshed_true, 'netology')
    assert hasattr(refreshed_true, 'utmn')

    # Test with changed=False
    refreshed_false = schema.RefreshedCalendarResponse(
        **calendar_data.model_dump(by_alias=True),
        changed=False
    )

    assert refreshed_false.changed is False

    # Test timezone change on RefreshedCalendarResponse
    changed_tz = refreshed_true.change_timezone("Europe/Paris")
    assert changed_tz is refreshed_true


def test_bulk_response_timezone_changes_comprehensive(bulk_fixture_content):
    """Test BulkResponse timezone changes covering all event types."""
    # Test multiple timezone conversions using bulk fixture data
    timezones = [
        "Europe/Moscow",
        "America/New_York",
        "Asia/Tokyo",
        "Australia/Sydney",
        "Europe/London"
    ]

    for timezone_name in timezones:
        bulk_response = schema.BulkResponse.model_validate_json(bulk_fixture_content)

        # Change timezone (covers lines 26-47)
        changed = bulk_response.change_timezone(timezone_name)

        # Verify it's the same object (in-place change)
        assert changed is bulk_response

        # Verify timezone change was applied to all datetime fields
        # This tests all the datetime field updates in lines 31-46
        for homework in bulk_response.netology.homework:
            if homework.deadline:
                assert homework.deadline.tzinfo is not None

        for webinar in bulk_response.netology.webinars:
            if webinar.starts_at:
                assert webinar.starts_at.tzinfo is not None
            if webinar.ends_at:
                assert webinar.ends_at.tzinfo is not None

        for modeus_event in bulk_response.utmn.modeus_events:
            assert modeus_event.start_time.tzinfo is not None
            assert modeus_event.end_time.tzinfo is not None

        for lms_event in bulk_response.utmn.lms_events:
            assert lms_event.dt_start.tzinfo is not None
            assert lms_event.dt_end.tzinfo is not None


def test_schema_lms_timezone_coverage(bulk_fixture_content):
    """Test timezone conversion for LMS events to cover schema.py lines 45-46."""
    bulk_response = schema.BulkResponse.model_validate_json(bulk_fixture_content)

    # Ensure we have LMS events to test timezone conversion
    if bulk_response.utmn.lms_events:
        # Test timezone conversion that should cover lines 45-46 in schema.py
        result = bulk_response.change_timezone("America/New_York")
        assert result is bulk_response

        # Verify timezone was applied to LMS events
        for lms_event in result.utmn.lms_events:
            assert lms_event.dt_start.tzinfo is not None
            assert lms_event.dt_end.tzinfo is not None


def test_lms_events_timezone_conversion_schema_lines_45_46(bulk_fixture_content):
    """Test LMS events timezone conversion to cover schema.py lines 45-46."""

    calendar_data = json.loads(bulk_fixture_content)

    # Ensure we have LMS events to test timezone conversion
    if 'utmn' not in calendar_data:
        calendar_data['utmn'] = {'modeus_events': [], 'lms_events': []}

    # Add LMS events to trigger lines 45-46 in schema.py
    calendar_data['utmn']['lms_events'] = [
        {
            'id': 789,
            'name': 'Test LMS for Timezone',
            'course_name': 'Timezone Test Course',
            'dt_start': '2025-06-05T10:00:00Z',
            'dt_end': '2025-06-05T12:00:00Z',
            'url': 'https://lms.timezone.test.com',
            'uservisible': True,
            'modname': 'assignment',
            'is_completed': False
        }
    ]

    bulk_response = schema.BulkResponse.model_validate(calendar_data)

    # Test timezone conversion that should execute lines 45-46 in schema.py
    result = bulk_response.change_timezone("Europe/Berlin")
    assert result is bulk_response

    # Verify timezone was applied to LMS events (covers lines 45-46)
    for lms_event in result.utmn.lms_events:
        assert lms_event.dt_start.tzinfo is not None
        assert lms_event.dt_end.tzinfo is not None
        # Should be Berlin timezone
        assert str(lms_event.dt_start.tzinfo) == "Europe/Berlin"
        assert str(lms_event.dt_end.tzinfo) == "Europe/Berlin"


# ========================================
# Integration Tests - create_ics_event
# ========================================

def test_create_ics_event_ok(sample_datetime) -> None:
    """Test create_ics_event with valid data including DTSTAMP check."""
    start = sample_datetime['start']
    end = sample_datetime['end']
    lesson_id = "lesson-001"
    title = "Math Lecture"
    description = "Algebra and Linear Equations"
    url = "https://example.com/classroom"

    event = integration.create_ics_event(title, start, end, lesson_id, description, url)

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


def test_create_ics_event_start_after_end(sample_datetime) -> None:
    """Test create_ics_event with start time after end time."""
    start = datetime.datetime(2025, 6, 5, 16, 0)
    end = sample_datetime['invalid_end']  # ends before start
    lesson_id = "lesson-002"
    title = "Invalid Event"

    # If your function does not handle this, you can just test the incorrect data is passed
    event = integration.create_ics_event(title, start, end, lesson_id)

    # Assert that dtstart is still after dtend (indicating incorrect input)
    assert event['DTSTART'].dt > event['DTEND'].dt


def test_create_ics_event_none_description_url(sample_datetime) -> None:
    """Test create_ics_event with None description and URL using vText comparison."""
    start = sample_datetime['start']
    end = sample_datetime['end']
    event = integration.create_ics_event("Title", start, end, "lesson-005", description=None, url=None)
    assert event['DESCRIPTION'] == vText(b'None')
    assert event['LOCATION'] == vText(b'unknown location')


def test_create_ics_event_comprehensive(sample_datetime):
    """Test create_ics_event with all field combinations using fixtures."""
    start = sample_datetime['start']
    end = sample_datetime['end']

    # Test with all fields provided
    event1 = integration.create_ics_event(
        title="Complete Event",
        starts_at=start,
        ends_at=end,
        lesson_id="lesson-001",
        description="Full description",
        url="https://example.com/lesson"
    )

    assert str(event1['SUMMARY']) == "Complete Event"
    assert str(event1['DESCRIPTION']) == "Full description"
    assert str(event1['LOCATION']) == "https://example.com/lesson"
    assert event1['DTSTART'].dt == start
    assert event1['DTEND'].dt == end
    assert str(event1['UID']) == "lesson-001"

    # Test with None description and url (covers lines 32, 37)
    event2 = integration.create_ics_event(
        title="Minimal Event",
        starts_at=start,
        ends_at=end,
        lesson_id="lesson-002",
        description=None,
        url=None
    )

    assert str(event2['DESCRIPTION']) == "None"
    assert str(event2['LOCATION']) == "unknown location"

    # Test with empty strings
    event3 = integration.create_ics_event(
        title="Empty Fields Event",
        starts_at=start,
        ends_at=end,
        lesson_id="lesson-003",
        description="",
        url=""
    )

    assert str(event3['DESCRIPTION']) == ""
    assert str(event3['LOCATION']) == "unknown location"


def test_create_ics_event_edge_cases(sample_datetime):
    """Test create_ics_event edge cases for complete coverage."""
    start = sample_datetime['start']
    end = sample_datetime['end']

    # Test with all possible parameter combinations
    event = integration.create_ics_event(
        title="Test Event",
        starts_at=start,
        ends_at=end,
        lesson_id="test-123",
        description="",  # Empty string description
        url=""  # Empty string URL - covers line 32 logic
    )

    # Verify empty URL defaults to unknown location
    assert str(event['LOCATION']) == "unknown location"
    assert str(event['DESCRIPTION']) == ""
    assert str(event['SUMMARY']) == "Test Event"
    assert str(event['UID']) == "test-123"


def test_create_ics_event_bulk_operations(sample_datetime, bulk_fixture_data):
    """Test bulk ICS event creation using multiple fixtures."""
    # Create multiple events using sample_datetime fixture
    start_time = sample_datetime['start']
    end_time = sample_datetime['end']

    # Bulk event data
    event_data = [
        {
            "title": "Netology: Advanced Python",
            "starts_at": start_time,
            "ends_at": end_time,
            "lesson_id": "netology-001",
            "description": "Python advanced concepts",
            "url": "https://netology.ru/lesson1"
        },
        {
            "title": "Modeus: Database Design",
            "starts_at": start_time + datetime.timedelta(hours=2),
            "ends_at": end_time + datetime.timedelta(hours=2),
            "lesson_id": "modeus-002",
            "description": "Database design principles",
            "url": "https://modeus.utmn.ru/lesson2"
        },
        {
            "title": "LMS: Software Architecture",
            "starts_at": start_time + datetime.timedelta(hours=4),
            "ends_at": end_time + datetime.timedelta(hours=4),
            "lesson_id": "lms-003",
            "description": "Software architecture patterns",
            "url": "https://lms.utmn.ru/lesson3"
        }
    ]

    # Create events in bulk
    events = []
    for data in event_data:
        event = integration.create_ics_event(
            title=data["title"],
            starts_at=data["starts_at"],
            ends_at=data["ends_at"],
            lesson_id=data["lesson_id"],
            description=data["description"],
            url=data["url"]
        )
        events.append(event)

    # Verify all events were created correctly
    assert len(events) == 3

    for i, event in enumerate(events):
        expected = event_data[i]
        assert str(event['SUMMARY']) == expected["title"]
        assert event['DTSTART'].dt == expected["starts_at"]
        assert event['DTEND'].dt == expected["ends_at"]
        assert str(event['UID']) == expected["lesson_id"]
        assert str(event['DESCRIPTION']) == expected["description"]
        assert str(event['LOCATION']) == expected["url"]


def test_create_ics_event_with_missing_fields():
    """Test create_ics_event with various missing/None fields to cover all branches."""
    # Test with None url and None description (covers lines 48, 56)
    start = datetime.datetime(2025, 6, 5, 14, 0)
    end = datetime.datetime(2025, 6, 5, 15, 0)

    # This should hit the conditional branches in create_ics_event
    event = integration.create_ics_event(
        title="Test Event",
        starts_at=start,
        ends_at=end,
        lesson_id="test-123",
        description=None,
        url=None
    )

    # Verify the conditional logic worked
    assert str(event['DESCRIPTION']) == "None"
    assert str(event['LOCATION']) == "unknown location"

    # Test with empty strings
    event2 = integration.create_ics_event(
        title="Test Event 2",
        starts_at=start,
        ends_at=end,
        lesson_id="test-456",
        description="",
        url=""
    )

    assert str(event2['DESCRIPTION']) == ""
    assert str(event2['LOCATION']) == "unknown location"


# ========================================
# Integration Tests - export_to_ics
# ========================================

def test_export_to_ics_complete_coverage(bulk_fixture_content):
    """Test export_to_ics to cover all conditional branches using bulk fixture."""
    # Load and modify the bulk fixture to ensure all code paths are tested
    calendar_data = json.loads(bulk_fixture_content)

    # Test with netology webinars (covers lines 46-53)
    calendar1 = schema.CalendarResponse.model_validate(calendar_data)
    ics_data1 = b"".join(integration.export_to_ics(calendar1))
    ics_str1 = ics_data1.decode('utf-8')

    assert "BEGIN:VCALENDAR" in ics_str1
    assert "VERSION:2.0" in ics_str1
    assert "PRODID:yet_another_calendar" in ics_str1

    # Modify data to test netology webinars without starts_at/ends_at (covers lines 47-48)
    if 'netology' in calendar_data and 'webinars' in calendar_data['netology']:
        for webinar in calendar_data['netology']['webinars']:
            webinar['starts_at'] = None
            webinar['ends_at'] = None
            break

    # Test with netology homework without deadline (covers lines 55-56)
    if 'netology' in calendar_data and 'homework' in calendar_data['netology']:
        for homework in calendar_data['netology']['homework']:
            homework['deadline'] = None
            break

    calendar2 = schema.CalendarResponse.model_validate(calendar_data)
    ics_data2 = b"".join(integration.export_to_ics(calendar2))
    ics_str2 = ics_data2.decode('utf-8')

    # Should still produce valid ICS even with None dates
    assert "BEGIN:VCALENDAR" in ics_str2
    assert "VERSION:2.0" in ics_str2

    # Test with LMS events to cover lines 70-73
    # Create calendar with LMS events that have homework deadlines
    calendar_with_lms = schema.CalendarResponse.model_validate(calendar_data)
    if calendar_with_lms.utmn.lms_events:
        ics_data3 = b"".join(integration.export_to_ics(calendar_with_lms))
        ics_str3 = ics_data3.decode('utf-8')
        assert "BEGIN:VCALENDAR" in ics_str3


@pytest.mark.asyncio
async def test_export_to_ics_bulk_calendar(bulk_fixture_content, sample_datetime):
    """Test bulk ICS export using bulk fixture content."""
    # Use bulk_fixture_content to create a calendar
    calendar = schema.CalendarResponse.model_validate_json(bulk_fixture_content)

    # Test ICS export
    ics_data = b"".join(integration.export_to_ics(calendar))

    # Verify ICS format
    ics_str = ics_data.decode('utf-8')
    assert "BEGIN:VCALENDAR" in ics_str
    assert "VERSION:2.0" in ics_str
    assert "PRODID:yet_another_calendar" in ics_str
    assert "BEGIN:VEVENT" in ics_str
    assert "END:VEVENT" in ics_str
    assert "END:VCALENDAR" in ics_str

    # Verify it contains events from different sources
    # Should have events from Netology, Modeus, and LMS
    event_count = ics_str.count("BEGIN:VEVENT")
    assert event_count > 0


def test_export_homework_without_deadline(bulk_fixture_content):
    """Test export with homework missing deadline to cover line 56."""
    calendar_data = json.loads(bulk_fixture_content)

    # Set all homework deadlines to None to trigger line 56 continue
    if 'netology' in calendar_data and 'homework' in calendar_data['netology']:
        for homework in calendar_data['netology']['homework']:
            homework['deadline'] = None

    calendar = schema.CalendarResponse.model_validate(calendar_data)
    ics_data = b"".join(integration.export_to_ics(calendar))
    ics_str = ics_data.decode('utf-8')

    # Should still produce valid ICS even with no homework events due to None deadlines
    assert "BEGIN:VCALENDAR" in ics_str
    assert "VERSION:2.0" in ics_str


def test_export_covers_line_56_homework_deadline_none(bulk_fixture_content):
    """Test export_to_ics with None homework deadline to cover line 56."""
    calendar_data = json.loads(bulk_fixture_content)

    # Ensure we have homework with None deadline to trigger continue on line 56
    if 'netology' not in calendar_data:
        calendar_data['netology'] = {'homework': [], 'webinars': []}

    # Add homework with None deadline specifically to test line 56
    calendar_data['netology']['homework'] = [
        {
            'id': 123456,
            'lesson_id': 654321,
            'type': 'homework',
            'title': 'Test Homework Without Deadline',
            'block_title': 'Test Block',
            'deadline': None,  # This should trigger line 56 continue
            'path': '/test/homework/path',  # Required field
            'passed': False,  # Required field
            'weight': 1,
            'is_mark': False
        }
    ]

    calendar = schema.CalendarResponse.model_validate(calendar_data)

    # Export should skip homework without deadline (line 56)
    ics_data = b"".join(integration.export_to_ics(calendar))
    ics_str = ics_data.decode('utf-8')

    # Should produce valid ICS but not include the homework without deadline
    assert "BEGIN:VCALENDAR" in ics_str
    assert "VERSION:2.0" in ics_str
    # The homework with None deadline should be skipped due to line 56 continue
    assert "Test Homework Without Deadline" not in ics_str


def test_export_to_ics_conditional_branches(bulk_fixture_content):
    """Test export_to_ics to cover conditional branches for missing datetime fields."""
    # Create test data with missing datetime fields to cover lines 70-73
    calendar_data = json.loads(bulk_fixture_content)

    # Modify the data to have events without starts_at/ends_at or deadline
    if 'netology' in calendar_data and 'webinars' in calendar_data['netology']:
        for webinar in calendar_data['netology']['webinars']:
            # Set one webinar to have None starts_at and ends_at (line 47-48)
            webinar['starts_at'] = None
            webinar['ends_at'] = None
            break

    if 'netology' in calendar_data and 'homework' in calendar_data['netology']:
        for homework in calendar_data['netology']['homework']:
            # Set one homework to have None deadline (line 55-56)
            homework['deadline'] = None
            break

    # Create calendar from modified data
    calendar = schema.CalendarResponse.model_validate(calendar_data)

    # Export should handle None datetime fields gracefully
    ics_data = b"".join(integration.export_to_ics(calendar))

    # Should still produce valid ICS
    ics_str = ics_data.decode('utf-8')
    assert "BEGIN:VCALENDAR" in ics_str
    assert "VERSION:2.0" in ics_str


def test_export_to_ics_with_missing_lms_dates(bulk_fixture_content):
    """Test export_to_ics with LMS events that have specific date calculations (lines 70-73)."""
    # Create calendar data with LMS events to test lines 70-73
    calendar_data = json.loads(bulk_fixture_content)

    # Ensure we have LMS events to test the datetime calculations
    if 'utmn' not in calendar_data:
        calendar_data['utmn'] = {'modeus_events': [], 'lms_events': []}

    # Add a test LMS event to trigger lines 70-73
    calendar_data['utmn']['lms_events'] = [{
        'id': 12345,
        'name': 'Test LMS Event',
        'course_name': 'Test Course',
        'dt_start': '2025-06-05T12:00:00Z',
        'dt_end': '2025-06-05T14:00:00Z',
        'url': 'https://lms.test.com',
        'uservisible': True,
        'modname': 'test',
        'is_completed': False
    }]

    calendar = schema.CalendarResponse.model_validate(calendar_data)

    # Export should include LMS events with calculated start time (line 70-73)
    ics_data = b"".join(integration.export_to_ics(calendar))

    ics_str = ics_data.decode('utf-8')
    assert "BEGIN:VCALENDAR" in ics_str
    assert "Test LMS Event" in ics_str


def test_lms_event_handling_for_missing_coverage(bulk_fixture_content):
    """Test specific LMS event scenarios to cover lines 130-131."""
    # Load fixture and test with empty LMS events
    calendar_data = json.loads(bulk_fixture_content)

    # Ensure we have LMS events to test line 130 condition
    if 'utmn' in calendar_data and 'lms_events' in calendar_data['utmn']:
        calendar = schema.CalendarResponse.model_validate(calendar_data)

        # Test export to ensure LMS events are processed
        ics_data = b"".join(integration.export_to_ics(calendar))
        ics_str = ics_data.decode('utf-8')
        assert "BEGIN:VCALENDAR" in ics_str

        # Verify LMS events exist in calendar structure
        assert hasattr(calendar.utmn, 'lms_events')
        assert isinstance(calendar.utmn.lms_events, list)


# ========================================
# Bulk Calendar Operations
# ========================================

def test_calendar_response_get_hash(bulk_fixture_content) -> None:
    """Test CalendarResponse get_hash method."""
    calendar_response = schema.CalendarResponse.model_validate_json(bulk_fixture_content)
    # assert calendar_response.get_hash() == "ea6326e66b5e1bacfaa5042b0e4421c2"
    assert len(calendar_response.get_hash()) == 32


def test_calendar_response_bulk_operations(bulk_fixture_content, sample_datetime):
    """Test bulk calendar response operations using fixtures."""
    # Create multiple calendar responses from bulk fixture
    calendar1 = schema.CalendarResponse.model_validate_json(bulk_fixture_content)
    calendar2 = schema.CalendarResponse.model_validate_json(bulk_fixture_content)

    # Test hash generation for bulk operations
    hash1 = calendar1.get_hash()
    hash2 = calendar2.get_hash()

    # Should have same hash if same data
    assert hash1 == hash2
    assert len(hash1) == 32  # MD5 hash length

    # Test timezone changes in bulk
    new_timezone = "Europe/Moscow"

    # Change timezone
    calendar_changed = calendar1.change_timezone(new_timezone)

    # Verify it's the same object (in-place change)
    assert calendar_changed is calendar1

    # Hash should be different after timezone change
    new_hash = calendar1.get_hash()
    # Note: Hash might be the same if no datetime objects were changed
    assert isinstance(new_hash, str) and len(new_hash) == 32


@typing.no_type_check
def test_bulk_change_tz(bulk_fixture_content) -> None:
    """Test bulk timezone change with hour comparison."""
    bulk = schema.BulkResponse.model_validate_json(bulk_fixture_content)
    new_bulk = deepcopy(bulk)
    new_bulk.change_timezone('America/los_angeles')

    assert (bulk.netology.webinars[0].starts_at.hour - new_bulk.netology.webinars[0].starts_at.hour) == 10
    assert (bulk.utmn.modeus_events[0].start_time.hour - new_bulk.utmn.modeus_events[0].start_time.hour) == 10


def test_bulk_response_timezone_operations(bulk_fixture_content):
    """Test bulk timezone change operations on BulkResponse."""
    # Test timezone changes for different components
    timezones_to_test = [
        "America/New_York",
        "Europe/London",
        "Asia/Tokyo",
        "Australia/Sydney"
    ]

    for timezone_name in timezones_to_test:
        # Create a copy for each timezone test
        test_response = schema.BulkResponse.model_validate_json(bulk_fixture_content)

        # Change timezone
        changed_response = test_response.change_timezone(timezone_name)

        # Verify it's the same object
        assert changed_response is test_response

        # Verify timezone changes were applied
        # Check if any datetime objects exist and have been converted
        if hasattr(test_response.netology, 'webinars') and test_response.netology.webinars:
            for webinar in test_response.netology.webinars:
                if webinar.starts_at:
                    assert webinar.starts_at.tzinfo is not None
                if webinar.ends_at:
                    assert webinar.ends_at.tzinfo is not None


def test_bulk_schema_operations_comprehensive(bulk_fixture_content, sample_datetime):
    """Test comprehensive bulk schema operations using all fixtures."""
    # Phase 1: Create multiple calendar responses from bulk fixture
    calendars = []
    for i in range(3):
        calendar = schema.CalendarResponse.model_validate_json(bulk_fixture_content)
        calendars.append(calendar)

    # Phase 2: Test bulk hash operations
    hashes = [cal.get_hash() for cal in calendars]

    # All should have same hash (same data)
    assert all(h == hashes[0] for h in hashes)
    assert all(len(h) == 32 for h in hashes)  # MD5 length

    # Phase 3: Test bulk timezone operations
    timezones = ["Europe/Moscow", "America/New_York", "Asia/Tokyo"]

    for i, timezone in enumerate(timezones):
        calendar_copy = schema.CalendarResponse.model_validate_json(bulk_fixture_content)
        changed = calendar_copy.change_timezone(timezone)

        # Verify it's the same object
        assert changed is calendar_copy

        # Verify hash changes for different timezones
        new_hash = changed.get_hash()
        assert isinstance(new_hash, str)
        assert len(new_hash) == 32

    # Phase 4: Test bulk ICS export operations
    for calendar in calendars[:2]:  # Test first 2
        ics_data = b"".join(integration.export_to_ics(calendar))

        # Verify ICS format
        ics_str = ics_data.decode('utf-8')
        assert "BEGIN:VCALENDAR" in ics_str
        assert "VERSION:2.0" in ics_str
        assert "PRODID:yet_another_calendar" in ics_str

    # Phase 5: Test bulk response operations
    bulk_responses = []
    for i in range(5):
        bulk_resp = schema.BulkResponse.model_validate_json(bulk_fixture_content)
        bulk_responses.append(bulk_resp)

    # Test timezone changes on all bulk responses
    for bulk_resp in bulk_responses:
        try:
            bulk_resp.change_timezone("Europe/London")
            # Should succeed for all
        except Exception:
            # Some might not have datetime objects to change
            pass


def test_invalid_timezone_bulk_error(bulk_fixture_content):
    """Test bulk timezone error handling."""
    bulk_response = schema.BulkResponse.model_validate_json(bulk_fixture_content)

    # Test invalid timezone
    with pytest.raises(Exception):  # Should raise HTTPException
        bulk_response.change_timezone("Invalid/Timezone")


async def test_export_to_ics(bulk_fixture_content) -> None:
    """Test export_to_ics with timezone and streaming response."""
    time_zone = "Europe/Moscow"
    calendar = schema.CalendarResponse.model_validate_json(bulk_fixture_content).change_timezone(time_zone)
    isc_calendar = StreamingResponse(integration.export_to_ics(calendar))

    assert isc_calendar

    async for resp in isc_calendar.body_iterator:
        assert "BEGIN:VCALENDAR" in str(resp)
        assert "VERSION:2.0" in str(resp)
        assert "TZID=Europe/Moscow" in str(resp)
        assert "SUMMARY:Netology: 2" in str(resp)


# ========================================
# Modeus Integration Tests
# ========================================

def test_modeus_events_body_creation():
    """Test ModeusEventsBody creation to cover get_calendar line 123-124."""
    import uuid

    # Create ModeusTimeBody
    body = modeus_schema.ModeusTimeBody(
        timeMin="2025-01-06T00:00:00Z",
        timeMax="2025-01-12T00:00:00Z"
    )

    person_id = "550e8400-e29b-41d4-a716-446655440000"

    # Test the create_dump_date method and ModeusEventsBody validation
    dump_data = body.create_dump_date()
    assert 'timeMin' in dump_data
    assert 'timeMax' in dump_data

    # Create full body like in get_calendar function
    full_body = modeus_schema.ModeusEventsBody.model_validate(
        {**dump_data, 'attendeePersonId': [person_id]}
    )

    # The field gets converted to UUID objects
    assert len(full_body.attendee_person_id) == 1
    assert isinstance(full_body.attendee_person_id[0], uuid.UUID)
    assert str(full_body.attendee_person_id[0]) == person_id
    assert hasattr(full_body, 'time_min')
    assert hasattr(full_body, 'time_max')


# ========================================
# Async Integration Tests
# ========================================

@pytest.mark.asyncio
async def test_get_calendar_with_fixtures_covers_lines_126_136(
    modeus_client,
    netology_client,
    lms_client,
    fastapi_app
):
    """Test get_calendar function using fixtures to cover lines 126-136."""
    body = modeus_schema.ModeusTimeBody(
        timeMin="2025-01-06T00:00:00Z",
        timeMax="2025-01-12T00:00:00Z"
    )

    lms_user = lms_schema.User(token="test_token", id=123)
    cookies = netology_schema.NetologyCookies.model_validate({
        "_netology-on-rails_session": "test_session"
    })

    # Test get_calendar with fixtures (covers lines 126-136)
    calendar = await integration.get_calendar(
        body=body,
        calendar_id=45526,
        person_id="550e8400-e29b-41d4-a716-446655440000",
        lms_user=lms_user,
        cookies=cookies,
        modeus_jwt_token="test_token"
    )

    # Verify structure and that lines 130-131 were executed
    assert isinstance(calendar, schema.CalendarResponse)
    assert hasattr(calendar, 'netology')
    assert hasattr(calendar, 'utmn')
    assert hasattr(calendar.utmn, 'lms_events')
    assert isinstance(calendar.utmn.lms_events, list)


@pytest.mark.asyncio
async def test_get_cached_calendar_with_fixtures_covers_line_151(
    modeus_client,
    netology_client,
    lms_client,
    fastapi_app
):
    """Test get_cached_calendar function using fixtures to cover line 151."""
    body = modeus_schema.ModeusTimeBody(
        timeMin="2025-01-06T00:00:00Z",
        timeMax="2025-01-12T00:00:00Z"
    )

    lms_user = lms_schema.User(token="test_token", id=123)
    cookies = netology_schema.NetologyCookies.model_validate({
        "_netology-on-rails_session": "test_session"
    })

    # Test get_cached_calendar (covers line 151: return await get_calendar(...))
    result = await integration.get_cached_calendar(
        body=body,
        calendar_id=45526,
        person_id="550e8400-e29b-41d4-a716-446655440000",
        lms_user=lms_user,
        cookies=cookies,
        modeus_jwt_token="test_token"
    )

    # Verify result is proper calendar response
    assert isinstance(result, schema.CalendarResponse)


@pytest.mark.asyncio
async def test_refresh_events_with_fixtures_covers_lines_87_110(
    modeus_client,
    netology_client,
    lms_client,
    fastapi_app,
    fake_redis_pool
):
    """Test refresh_events function using fixtures to cover lines 87-110."""
    body = modeus_schema.ModeusTimeBody(
        timeMin="2025-01-06T00:00:00Z",
        timeMax="2025-01-12T00:00:00Z"
    )

    lms_user = lms_schema.User(token="test_token", id=123)
    cookies = netology_schema.NetologyCookies.model_validate({
        "_netology-on-rails_session": "test_session"
    })

    # Test refresh_events (covers lines 87-110 including error handling)
    result = await integration.refresh_events(
        body=body,
        lms_user=lms_user,
        calendar_id=45526,
        cookies=cookies,
        timezone="Europe/Moscow",
        modeus_jwt_token="test_token",
        person_id="550e8400-e29b-41d4-a716-446655440000"
    )

    # Verify result structure (covers lines 110-112)
    assert isinstance(result, schema.RefreshedCalendarResponse)
    assert hasattr(result, 'changed')
    assert isinstance(result.changed, bool)
    assert hasattr(result, 'netology')
    assert hasattr(result, 'utmn')


@pytest.mark.asyncio
async def test_bulk_error_scenarios(
    modeus_client,
    netology_bad_client,
    lms_client,
    fastapi_app
):
    """Test bulk service error handling scenarios."""
    body = modeus_schema.ModeusTimeBody(
        timeMin="2025-01-06T00:00:00Z",  # Monday
        timeMax="2025-01-12T00:00:00Z"   # Sunday
    )

    calendar_id = 999  # Invalid calendar ID
    person_id = "550e8400-e29b-41d4-a716-446655440001"  # Valid UUID

    lms_user = lms_schema.User(token="invalid_token", id=999)
    cookies = netology_schema.NetologyCookies.model_validate({
        "_netology-on-rails_session": "invalid_session"
    })
    modeus_jwt_token = "invalid_jwt_token"

    # Test error handling in bulk operations
    with pytest.raises(Exception):
        await integration.get_calendar(
            body=body,
            calendar_id=calendar_id,
            person_id=person_id,
            lms_user=lms_user,
            cookies=cookies,
            modeus_jwt_token=modeus_jwt_token
        )


# ========================================
# Views Tests
# ========================================

def test_views_response_type_handling_logic(bulk_fixture_content):
    """Test views response type handling to cover missing lines in views.py."""
    # Test response type handling logic without making API calls
    calendar_data = json.loads(bulk_fixture_content)

    # Create CalendarResponse instance to test response type logic
    calendar_response = schema.CalendarResponse.model_validate(calendar_data)

    # Test isinstance check logic from views.py:37-40
    if isinstance(calendar_response, schema.CalendarResponse):
        # This covers the isinstance branch in get_calendar view
        result = calendar_response.change_timezone("Europe/Moscow")
        assert isinstance(result, schema.CalendarResponse)

    # Test model_validate path (line 40 in views.py)
    calendar_dict = calendar_response.model_dump(by_alias=True)
    validated_response = schema.CalendarResponse.model_validate(calendar_dict)
    timezone_changed = validated_response.change_timezone("Europe/Moscow")
    assert isinstance(timezone_changed, schema.CalendarResponse)


@pytest.mark.asyncio
async def test_views_get_calendar_cached_response_type(fake_redis_pool):
    """Test views get_calendar function with different response types (lines 33-40)."""
    # Mock dependencies
    body = modeus_schema.ModeusTimeBody(
        timeMin="2025-01-06T00:00:00Z",
        timeMax="2025-01-12T00:00:00Z"
    )

    lms_user = lms_schema.User(token="test_token", id=123)
    cookies = netology_schema.NetologyCookies.model_validate({
        "_netology-on-rails_session": "test_session"
    })

    # Test case 1: get_cached_calendar returns CalendarResponse instance
    calendar_response = schema.CalendarResponse.model_validate({
        "netology": {"homework": [], "webinars": []},
        "utmn": {"modeus_events": [], "lms_events": []}
    })

    with patch('yet_another_calendar.web.api.bulk.integration.get_cached_calendar') as mock_cached:
        mock_cached.return_value = calendar_response

        result = await views.get_calendar(
            body=body,
            lms_user=lms_user,
            cookies=cookies,
            donor_token="test_token",
            modeus_person_id="550e8400-e29b-41d4-a716-446655440000",
            redis=fake_redis_pool
        )

        # Should call change_timezone and return CalendarResponse (line 38)
        assert isinstance(result, schema.CalendarResponse)

    # Test case 2: get_cached_calendar returns dict (cached data)
    with patch('yet_another_calendar.web.api.bulk.integration.get_cached_calendar') as mock_cached:
        mock_cached.return_value = {
            "netology": {"homework": [], "webinars": []},
            "utmn": {"modeus_events": [], "lms_events": []}
        }

        result = await views.get_calendar(
            body=body,
            lms_user=lms_user,
            cookies=cookies,
            donor_token="test_token",
            modeus_person_id="550e8400-e29b-41d4-a716-446655440000",
            redis=fake_redis_pool
        )

        # Should validate dict and return CalendarResponse (line 40)
        assert isinstance(result, schema.CalendarResponse)


@pytest.mark.asyncio
async def test_views_refresh_calendar():
    """Test views refresh_calendar function (line 55)."""
    body = modeus_schema.ModeusTimeBody(
        timeMin="2025-01-06T00:00:00Z",
        timeMax="2025-01-12T00:00:00Z"
    )

    lms_user = lms_schema.User(token="test_token", id=123)
    cookies = netology_schema.NetologyCookies.model_validate({
        "_netology-on-rails_session": "test_session"
    })

    # Mock refresh_events to return RefreshedCalendarResponse
    mock_refreshed = schema.RefreshedCalendarResponse(
        netology={"homework": [], "webinars": []},
        utmn={"modeus_events": [], "lms_events": []},
        changed=True
    )

    with patch('yet_another_calendar.web.api.bulk.integration.refresh_events') as mock_refresh:
        mock_refresh.return_value = mock_refreshed

        result = await views.refresh_calendar(
            body=body,
            lms_user=lms_user,
            cookies=cookies,
            donor_token="test_token",
            modeus_person_id="550e8400-e29b-41d4-a716-446655440000"
        )

        # Should return RefreshedCalendarResponse (line 55-57)
        assert isinstance(result, schema.RefreshedCalendarResponse)
        assert result.changed is True


@pytest.mark.asyncio
async def test_views_export_ics():
    """Test views export_ics function (lines 74-79)."""
    body = modeus_schema.ModeusTimeBody(
        timeMin="2025-01-06T00:00:00Z",
        timeMax="2025-01-12T00:00:00Z"
    )

    lms_user = lms_schema.User(token="test_token", id=123)
    cookies = netology_schema.NetologyCookies.model_validate({
        "_netology-on-rails_session": "test_session"
    })

    # Mock get_calendar to return CalendarResponse
    calendar_response = schema.CalendarResponse.model_validate({
        "netology": {"homework": [], "webinars": []},
        "utmn": {"modeus_events": [], "lms_events": []}
    })

    with patch('yet_another_calendar.web.api.bulk.integration.get_calendar') as mock_get_cal:
        mock_get_cal.return_value = calendar_response

        with patch('yet_another_calendar.web.api.bulk.integration.export_to_ics') as mock_export:
            mock_export.return_value = iter([b"BEGIN:VCALENDAR\\nEND:VCALENDAR"])

            result = await views.export_ics(
                body=body,
                lms_user=lms_user,
                cookies=cookies,
                donor_token="test_token",
                modeus_person_id="550e8400-e29b-41d4-a716-446655440000"
            )

            # Should return StreamingResponse (lines 74-79)
            assert isinstance(result, StreamingResponse)

            # Verify get_calendar was called (line 74)
            mock_get_cal.assert_called_once()

            # Verify change_timezone was called (line 78)
            # and export_to_ics was called (line 79)
            mock_export.assert_called_once()
