FROM python:3.10-slim-bullseye

RUN pip install poetry==1.8.3

WORKDIR /app
COPY poetry.lock pyproject.toml /app

RUN POETRY_VIRTUALENVS_CREATE=false poetry install
COPY . /app

ENTRYPOINT ["python3"]
CMD ["prod.py"]