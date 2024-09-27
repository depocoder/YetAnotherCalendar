import datetime
import uuid
from typing import Optional, Annotated

from fastapi import Header
from pydantic import BaseModel, Field, computed_field

from yet_another_calendar.settings import settings


class NetologyCreds(BaseModel):
    """Netology creds."""

    username: str
    password: str


class NetologyCookies(BaseModel):
    rails_session: str = Field(alias="_netology-on-rails_session")
    sg_payment_exist: str
    sg_reg_date: str
    sg_uid: str
    remember_user_token: str
    http_x_authentication: str

    # class Config:
    #     allow_population_by_field_name = False


async def get_cookies_from_headers(
        rails_session: Annotated[str, Header(alias="_netology-on-rails_session")],
        sg_payment_exist: Annotated[str, Header()],
        sg_reg_date: Annotated[str, Header()],
        sg_uid: Annotated[str, Header()],
        remember_user_token: Annotated[str, Header()],
        http_x_authentication: Annotated[str, Header()],
):
    return NetologyCookies.model_validate({
        "_netology-on-rails_session": rails_session,
        "sg_payment_exist": sg_payment_exist,
        "sg_reg_date": sg_reg_date,
        "sg_uid": sg_uid,
        "remember_user_token": remember_user_token,
        "http_x_authentication": http_x_authentication, }
    )


class NetologyProgram(BaseModel):
    id: int
    title: str
    url_code: str = Field(alias="urlcode")
    type: str


class NetologyPrograms(BaseModel):
    programs: list[NetologyProgram]

    def get_utmn_program(self) -> Optional[NetologyProgram]:
        for program in self.programs:
            if settings.netology_course_name in program.title:
                return program
