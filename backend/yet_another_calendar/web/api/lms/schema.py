import datetime
from typing import Any, Annotated

from fastapi import Header
from pydantic import BaseModel, Field, model_validator

from yet_another_calendar.web.api.modeus.schema import Creds, ModeusTimeBody


class LxpCreds(Creds):
    service: str = "test"

    def get_username(self) -> str:
        return self.username.split("@")[0]


class User(BaseModel):
    id: int
    token: str

async def get_user(
        lxp_token: Annotated[str, Header()],
        lxp_id: Annotated[str, Header()],
) -> User:
    return User.model_validate({
        "token": lxp_token,
        "id": lxp_id,
    })


class Course(BaseModel):
    id: int
    short_name: str = Field(alias="shortname")
    full_name: str = Field(alias="fullname")
    completed: bool | None = Field(default=None)
    hidden: bool | None = Field(default=None)


class ModuleState(BaseModel):
    state: bool

    @model_validator(mode='before')
    @classmethod
    def state_validation(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        state = data.get('state')
        if isinstance(state, int):
            # if state more than 1 then state is False (we don't know such state)
            data['state'] = bool(state) if state < 1 else False
        return data

class DateModule(BaseModel):
    label: str
    date: datetime.datetime = Field(alias="timestamp")
    dataid: str

    @model_validator(mode='before')
    @classmethod
    def deadline_validation(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        timestamp = data.get('timestamp')
        if timestamp is None:
            return data
        data['timestamp'] = datetime.datetime.fromtimestamp(timestamp, tz=datetime.UTC)
        return data


class BaseModule(BaseModel):
    id: int
    url: str | None = Field(default=None)
    name: str
    user_visible: bool = Field(alias="uservisible")
    modname: str


class Module(BaseModule):
    dates: list[DateModule]
    completion_state: ModuleState | None = Field(alias="completiondata", default=None)


class ModuleResponse(BaseModule):
    dt_start: datetime.datetime
    dt_end: datetime.datetime
    is_completed: bool
    course_name: str


class ExtendedCourse(BaseModel):
    id: int
    name: str
    modules: list[Module]

    @staticmethod
    def is_suitable_time(deadline: datetime.datetime,
                         time_min: datetime.datetime, time_max: datetime.datetime) -> bool:
        """Check if lesson have suitable time"""
        if deadline and time_max > deadline > time_min:
            return True
        return False

    def get_filtered_modules(self, body: ModeusTimeBody, course_name: str) -> list[ModuleResponse]:
        """Filter module by time and user_visible."""
        filtered_modules = []
        for module in self.modules:
            dt_end = None
            dt_start = None
            if module.dates and len(module.dates) > 1:
                dt_start = module.dates[0].date
                dt_end = module.dates[1].date
            else:
                continue
            if self.is_suitable_time(dt_end, body.time_min, body.time_max) and module.user_visible:
                completion_state = module.completion_state
                state = False
                if completion_state:
                    state = completion_state.state
                filtered_modules.append(ModuleResponse(
                    **module.model_dump(by_alias=True),
                    is_completed=state,
                    dt_end=dt_end, dt_start=dt_start,
                    course_name=course_name,

                ))
        return filtered_modules
