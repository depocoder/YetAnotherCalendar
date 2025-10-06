import logging
import sys

from loguru import logger
from rollbar.logger import RollbarHandler

from yet_another_calendar.settings import settings


class InterceptHandler(logging.Handler):
    """
    Default handler from examples in loguru documentation.

    This handler intercepts all log requests and
    passes them to loguru.

    For more info see:
    https://loguru.readthedocs.io/en/stable/overview.html#entirely-compatible-with-standard-logging
    """

    def emit(self, record: logging.LogRecord) -> None:  # pragma: no cover
        """
        Propagates logs to loguru.

        :param record: record to log.
        """
        try:
            level: str | int = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where originated the logged message
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back  # type: ignore
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level,
            record.getMessage(),
        )


def configure_logging() -> None:  # pragma: no cover
    """Configures logging."""
    intercept_handler = InterceptHandler()

    logging.basicConfig(handlers=[intercept_handler], level=logging.NOTSET)

    for logger_name in logging.root.manager.loggerDict:
        if logger_name.startswith("uvicorn."):
            logging.getLogger(logger_name).handlers = []

    # change handler for default uvicorn logger
    logging.getLogger("uvicorn").handlers = [intercept_handler]
    logging.getLogger("uvicorn.access").handlers = [intercept_handler]
    logging.getLogger("fastapi_cache").setLevel(logging.ERROR)
    if not settings.debug:
        logging.getLogger("httpx").setLevel(logging.WARNING)

    # set logs output, level and format
    logger.remove()
    logger.add(
        sys.stdout,
        level=settings.log_level.value,
    )
    if settings.rollbar_token:
        # Report ERROR and above to Rollbar
        rollbar_handler = RollbarHandler()
        rollbar_handler.setLevel(logging.ERROR)

        # Attach Rollbar handler to the root logger
        logger.add(rollbar_handler)
