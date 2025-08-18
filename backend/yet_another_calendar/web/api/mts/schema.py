import uuid

from pydantic import BaseModel, Field, HttpUrl


class MtsLinkBody(BaseModel):
    lesson_id: uuid.UUID = Field(alias='lessonId')
    url: HttpUrl


class MtsLinkRequest(BaseModel):
    lesson_ids: list[uuid.UUID] = Field(alias='lessonIds')


class MtsLinkResponse(BaseModel):
    links: dict[str, str]
