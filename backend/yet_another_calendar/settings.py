import enum
from pathlib import Path
from tempfile import gettempdir

from environs import Env
from pydantic_settings import BaseSettings, SettingsConfigDict
from yarl import URL

TEMP_DIR = Path(gettempdir())
env = Env()
env.read_env()


class LogLevel(str, enum.Enum):
    """Possible log levels."""

    NOTSET = "NOTSET"
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    FATAL = "FATAL"


class Settings(BaseSettings):
    """
    Application settings.

    These parameters can be configured
    with environment variables.
    """

    host: str = "127.0.0.1"
    port: int = 8000
    # quantity of workers for uvicorn
    workers_count: int = 1
    # Enable uvicorn reloading, debug and docs
    debug: bool = env.bool("YET_ANOTHER_CALENDAR_DEBUG", False)

    log_level: LogLevel = LogLevel.INFO

    # Variables for Redis
    redis_host: str = "yet_another_calendar-redis"
    redis_port: int = 6379
    redis_user: str | None = None
    redis_pass: str | None = None
    redis_base: int | None = None
    redis_cookie_key: str = "MODEUS_JWT"
    redis_jwt_time_live: int = 60 * 60 * 12  # 12 hours
    redis_events_time_live: int = 60 * 60 * 24 * 14  # 2 weeks
    redis_utmn_teachers_time_live: int = 60 * 60 * 24 * 30  # 30 days
    redis_prefix: str = 'FastAPI-redis'

    retry_tries: int = 5
    retry_delay: int = 3

    netology_default_course_id: int = env.int("NETOLOGY_DEFAULT_COURSE_ID", 45526)
    netology_course_name: str = env.str(
        "NETOLOGY_COURSE_NAME", "Разработка IT-продуктов и информационных систем",
    )
    netology_location_name: str = "Нетология"
    netology_url: str = env.str("NETOLOGY_URL", "https://netology.ru")

    test_parent_path: Path = Path(__file__).parent / "tests"

    netology_base_url: str = "https://netology.ru"
    netology_get_programs_part: str = '/backend/api/user/professions/{calendar_id}/schedule'
    netology_get_events_part: str = '/backend/api/user/programs/{program_id}/schedule'
    netology_sign_in_part: str = '/backend/api/user/sign_in'
    netology_get_course_part: str = '/backend/api/user/programs/calendar/filters'

    modeus_base_url: str = "https://utmn.modeus.org/"
    modeus_login_part: str = "/schedule-calendar/assets/app.config.json"
    modeus_continue_auth_url: str = "https://auth.modeus.org/commonauth"
    modeus_search_events_part: str = "/schedule-calendar-v2/api/calendar/events/search"
    modeus_search_people_part: str = "/schedule-calendar-v2/api/people/persons/search"

    # Donor account for tutors (no personal Modeus accounts needed)
    modeus_username: str = env.str("YET_ANOTHER_CALENDAR_MODEUS_USERNAME", "")
    modeus_password: str = env.str("YET_ANOTHER_CALENDAR_MODEUS_PASSWORD", "")

    utmn_base_url: str = "https://www.utmn.ru"
    utmn_get_teachers_part: str = "/o-tyumgu/sotrudniki/?PAGEN_1={page}"

    # Tutor authentication (password in hashed format)
    tutor_password_hash: str = env.str("YET_ANOTHER_CALENDAR_TUTOR_PASSWORD_HASH", "")
    tutor_secret_key: str = env.str("YET_ANOTHER_CALENDAR_TUTOR_SECRET_KEY")
    tutor_jwt_time_live: int = 60 * 60 * 24 * 30  # 1 month

    # Rate limiting settings (applies to all login endpoints)
    login_max_attempts: int = env.int("YET_ANOTHER_CALENDAR_LOGIN_MAX_ATTEMPTS", 5)
    login_lockout_time: int = env.int("YET_ANOTHER_CALENDAR_LOGIN_LOCKOUT_TIME", 900)  # 15 minutes

    lms_base_url: str = "https://lms.utmn.ru"
    lms_get_user_part: str = "/webservice/rest/server.php"
    lms_get_course_part: str = '/webservice/rest/server.php'
    lms_get_extended_course_part: str = '/webservice/rest/server.php'
    lms_login_part: str = '/login/token.php'

    # Application domain for generating full URLs
    app_domain: str = env.str("YET_ANOTHER_CALENDAR_APP_DOMAIN", "https://yetanothercalendar.ru")

    rollbar_token: str = ""
    rollbar_environment: str = "dev"

    @property
    def redis_url(self) -> URL:
        """
        Assemble REDIS URL from settings.

        :return: redis URL.
        """
        path = ""
        if self.redis_base is not None:
            path = f"/{self.redis_base}"
        return URL.build(
            scheme="redis",
            host=self.redis_host,
            port=self.redis_port,
            user=self.redis_user,
            password=self.redis_pass,
            path=path,
        )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="YET_ANOTHER_CALENDAR_",
        env_file_encoding="utf-8",
    )


settings = Settings()
