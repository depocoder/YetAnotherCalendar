# MVC model view controller 

import uuid
from pydantic import BaseModel, Field, HttpUrl


class MtsLinkBody(BaseModel):
    lesson_id: uuid.UUID = Field(alias='lessonId')
    url: HttpUrl
