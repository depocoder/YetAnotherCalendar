class ModeusException(Exception):
    pass


class ModeusUpstreamException(ModeusException):
    pass


class LoginFailed(ModeusUpstreamException):
    pass


class InternalError(ModeusException):
    pass


class CannotAuthenticateError(InternalError):
    def __init__(self) -> None:
        super().__init__("Something went wrong. Maybe auth flow has changed?")
