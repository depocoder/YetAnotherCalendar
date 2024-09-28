import uvicorn

from yet_another_calendar.settings import settings


def main() -> None:
    """Entrypoint of the application."""
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
