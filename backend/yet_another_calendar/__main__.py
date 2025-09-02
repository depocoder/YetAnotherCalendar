import uvicorn
import debugpy  # noqa: T100

from yet_another_calendar.settings import settings


def main() -> None:
    """Entrypoint of the application."""
    if settings.debug:
        debugpy.listen(("0.0.0.0", 5678))  # noqa: T100
    uvicorn.run(
        "yet_another_calendar.web.application:get_app",
        workers=settings.workers_count,
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.value.lower(),
        factory=True,
    )


if __name__ == "__main__":
    main()
