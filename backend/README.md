# YetAnotherCalendar
This project is created to replace Modeus/Netology calendars

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