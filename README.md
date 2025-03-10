# YetAnotherCalendar

![GitHub commit activity](https://img.shields.io/github/commit-activity/m/depocoder/YetAnotherCalendar)
![GitHub last commit](https://img.shields.io/github/last-commit/depocoder/YetAnotherCalendar)
![Github Action status](https://github.com/depocoder/YetAnotherCalendar/actions/workflows/lint-and-test.yaml/badge.svg)

![GitHub contributors](https://img.shields.io/github/contributors/depocoder/YetAnotherCalendar)
![GitHub Created At](https://img.shields.io/github/created-at/depocoder/YetAnotherCalendar)
![GitHub License](https://img.shields.io/github/license/depocoder/YetAnotherCalendar)
![GitHub Repo Size](https://img.shields.io/github/repo-size/depocoder/YetAnotherCalendar)

This product replaces Modeus+LMS calendar & Netology calendar, for better experience and more features.

## Features

- No telemetry or tracking, We don't store passes or emails. We don't need it, **we respect your data**.
- Modeus & LMS & Netology events api support, you won't forget any deadline.
- Export to .ics calendar format.
- Cache all big requests in Redis.
- All code is typed with mypy. Linted with Ruff and tested with pytest.
- Timezones support.

## [Backend docs](https://github.com/depocoder/YetAnotherCalendar/tree/main/backend)

## [Frontend docs](https://github.com/depocoder/YetAnotherCalendar/tree/main/frontend)

### How to run?

1. Create `.env` from `.env.dist` in the backend & frontend directory.
2. Run:

```sh
docker compose up
```
