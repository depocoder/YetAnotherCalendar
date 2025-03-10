# YetAnotherCalendar
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&style=flat)
[![Pydantic v2](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/pydantic/pydantic/main/docs/badge/v2.json)](https://docs.pydantic.dev/latest/contributing/#badges)
[![Linting: Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/charliermarsh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)
[![Checked with mypy](https://www.mypy-lang.org/static/mypy_badge.svg)](https://mypy-lang.org/)
[![uv](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/uv/main/assets/badge/v0.json)](https://github.com/astral-sh/uv)

![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white&style=flat)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white&style=flat)
![GitHub Repo stars](https://img.shields.io/github/stars/depocoder/YetAnotherCalendar)


This project was created to replace Modeus/Netology calendars


## Features

* Export to .ics calendar format
* Your timezone support (default Moscow)
* Modeus + Netology integration
* LMS support (not required to use)
* Redis cache

## Getting started

1. Install [poetry](https://python-poetry.org/docs/#installing-with-the-official-installer)
2. install dependencies
3. create .env file from .env.dist
4. run the application

### For Linux and Mac

```bash
# On macOS and Linux.
curl -LsSf https://astral.sh/uv/install.sh | sh

uv sync

uv run python -m yet_another_calendar
```

### Running with Docker Compose

```bash
docker compose up -d
```

If code was changed, rebuild images:

```bash
docker compose up --build -d
```

### Open [OpenAPI](http://localhost:8000/api/docs)
![image](https://github.com/user-attachments/assets/03b0fd01-50ac-4d17-9001-e22d0df7cda5)
