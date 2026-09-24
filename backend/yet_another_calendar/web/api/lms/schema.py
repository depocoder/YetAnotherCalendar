import datetime
from enum import StrEnum
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


class CompletionStatus(StrEnum):
    INCOMPLETE = "incomplete"
    COMPLETE = "complete"
    COMPLETE_PASS = "complete_pass"
    COMPLETE_FAIL = "complete_fail"


# Moodle's COMPLETION_* constants, as `completiondata.state` and
# `details[].rulevalue.status` report them.
_MOODLE_STATES = {
    0: CompletionStatus.INCOMPLETE,
    1: CompletionStatus.COMPLETE,
    2: CompletionStatus.COMPLETE_PASS,
    3: CompletionStatus.COMPLETE_FAIL,
}
_DONE_STATES = (CompletionStatus.COMPLETE, CompletionStatus.COMPLETE_PASS)


def to_completion_status(state: Any) -> Any:
    """Turn Moodle's numeric state into a status; anything else goes to pydantic as is."""
    if isinstance(state, bool):
        return CompletionStatus.COMPLETE if state else CompletionStatus.INCOMPLETE
    if isinstance(state, int):
        return _MOODLE_STATES.get(state, CompletionStatus.INCOMPLETE)
    return state


class CompletionRequirement(BaseModel):
    """One condition from the "Выполнено: Получить оценку" badges on an activity."""
    description: str
    status: CompletionStatus

    @model_validator(mode='before')
    @classmethod
    def rule_validation(cls, data: Any) -> Any:
        if not isinstance(data, dict) or 'rulevalue' not in data:
            return data
        rule = data['rulevalue'] or {}
        return {
            'description': rule.get('description') or data.get('rulename', ''),
            'status': to_completion_status(rule.get('status')),
        }


class ModuleState(BaseModel):
    status: CompletionStatus = Field(alias="state")
    completed_at: datetime.datetime | None = Field(alias="timecompleted", default=None)
    requirements: list[CompletionRequirement] = Field(alias="details", default_factory=list)
    # False when the student ticks the activity off by hand: then the state
    # says what they ticked, not what they did.
    is_automatic: bool = Field(alias="isautomatic", default=True)

    @model_validator(mode='before')
    @classmethod
    def state_validation(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        data = {**data, 'state': to_completion_status(data.get('state'))}
        timecompleted = data.get('timecompleted')
        if isinstance(timecompleted, int):
            # Moodle sends 0 until the activity is completed.
            data['timecompleted'] = (datetime.datetime.fromtimestamp(timecompleted, tz=datetime.UTC)
                                     if timecompleted else None)
        return data

    @property
    def is_completed(self) -> bool:
        return self.status in _DONE_STATES

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
    # None when the teacher did not turn completion tracking on for the activity.
    completion_status: CompletionStatus | None = None
    completed_at: datetime.datetime | None = None
    completion_requirements: list[CompletionRequirement] = Field(default_factory=list)
    completion_is_manual: bool = False
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
                completion = module.completion_state
                filtered_modules.append(ModuleResponse(
                    **module.model_dump(by_alias=True, exclude={"completion_state"}),
                    is_completed=completion.is_completed if completion else False,
                    completion_status=completion.status if completion else None,
                    completed_at=completion.completed_at if completion else None,
                    completion_requirements=completion.requirements if completion else [],
                    completion_is_manual=not completion.is_automatic if completion else False,
                    dt_end=dt_end, dt_start=dt_start,
                    course_name=course_name,

                ))
        return filtered_modules
