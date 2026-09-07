import logging
import re
import sys
from typing import Any

from loguru import logger
from rollbar.logger import RollbarHandler

from yet_another_calendar.settings import settings

# Client-held secrets must never reach logs: neither the ICS subscription
# secret from the URL path nor the vault cookie value. Even developers
# reading production logs must not be able to open someone's calendar feed.
_MASK_PATTERNS = (
    # /api/subscription/{vault_id}/{secret}/... - hide the secret segment
    (re.compile(r"(/api/subscription/[0-9a-f]{32}/)[A-Za-z0-9_\-~.%]+"), r"\1***"),
    # Vault remember-me cookie value
    (re.compile(r"(yac_vault=)[^;\s\"']+"), r"\1***"),
)


def mask_secrets(message: str) -> str:
    """Replace client-held secrets in a log message with ***."""
    for pattern, replacement in _MASK_PATTERNS:
        message = pattern.sub(replacement, message)
    return message


def _mask_record(record: Any) -> None:
    record["message"] = mask_secrets(record["message"])


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
    # Scrub client-held secrets (subscription URLs, vault cookies) from every
    # log line, including uvicorn access logs intercepted above.
    logger.configure(patcher=_mask_record)
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
