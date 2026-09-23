import uuid

from pydantic import BaseModel, Field, HttpUrl

# Long enough for any Modeus course name, short enough to keep the Redis
# fields of the metric sane.
COURSE_NAME_LIMIT = 200


class MtsLinkBody(BaseModel):
    lesson_id: uuid.UUID = Field(alias='lessonId')
    url: HttpUrl
    # The course this lesson belongs to, remembered so that follow-throughs
    # can be counted per course. Optional: links saved before the metric
    # existed, and lessons Modeus gives no course for, stay unattributed.
    course: str | None = Field(default=None, max_length=COURSE_NAME_LIMIT)


class MtsLinkRequest(BaseModel):
    lesson_ids: list[uuid.UUID] = Field(alias='lessonIds')


class MtsLinkResponse(BaseModel):
    links: dict[str, str]


class RedirectWindow(BaseModel):
    """Follow-throughs over one time window."""

    redirects: int = 0
    # Per course, biggest first. Lessons saved without a course are missing
    # here, so the courses can add up to less than `redirects`.
    courses: dict[str, int] = Field(default_factory=dict)


class MtsRedirectMetrics(BaseModel):
    """
    Anonymous usage of the links left on the lessons.

    Follow-throughs, not people: only counters are stored, so there is
    nobody to deduplicate by and every follow-through counts.
    """

    week: RedirectWindow
    month: RedirectWindow
