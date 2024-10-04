# YetAnotherCalendar
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Poetry](https://img.shields.io/badge/Poetry-%233B82F6.svg?style=for-the-badge&logo=poetry&logoColor=0B3D8D)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

[![Linting: Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/charliermarsh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)
[![Checked with mypy](https://www.mypy-lang.org/static/mypy_badge.svg)](https://mypy-lang.org/)


This project was created to replace Modeus/Netology calendars


## Getting started

1. Install [poetry](https://python-poetry.org/docs/#installing-with-the-official-installer)
2. install dependencies
3. run the application

### For Linux and Mac

```bash
curl -sSL https://install.python-poetry.org | python3 -

poetry install

poetry run python -m yet_another_calendar
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
