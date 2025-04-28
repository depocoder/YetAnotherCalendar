# 🗓️ YetAnotherCalendar

[![Python](https://img.shields.io/badge/python-3.12.8+-blue.svg?style=flat&logo=python&logoColor=white)](https://www.python.org/downloads/)
[![Linting: Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/charliermarsh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)
[![Checked with mypy](https://www.mypy-lang.org/static/mypy_badge.svg)](https://mypy-lang.org/)
[![uv](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/uv/main/assets/badge/v0.json)](https://github.com/astral-sh/uv)

[![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white&style=flat)](https://redis.io/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white&style=flat)](https://www.docker.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&style=flat)](https://fastapi.tiangolo.com/)
[![Pydantic v2](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/pydantic/pydantic/main/docs/badge/v2.json)](https://docs.pydantic.dev/latest/contributing/#badges)

## 📝 Overview

YetAnotherCalendar was created to provide a superior alternative to Modeus/Netology calendars with enhanced features and
better user experience. It combines multiple educational platforms into a single, convenient calendar interface.

## ✨ Features

* 📱 Responsive interface for all devices
* 🔄 Export to .ics calendar format for integration with Google Calendar, Apple Calendar, etc.
* 🌍 Your timezone support (default Moscow)
* 🔌 Modeus + Netology integration
* 📚 LMS support
* 📦 Redis caching for improved performance
* 🏷️ Custom event tagging and categorization
* 🔍 Advanced search and filtering options
* 🔒 Secure authentication

## 🚀 Getting Started

### Prerequisites

- Python 3.12.8+
- Docker and Docker Compose (optional)

### Installation

#### 1. Using uv (Recommended)

[uv](https://github.com/astral-sh/uv) is a fast Python package installer and resolver.

```bash
# On macOS and Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Clone the repository
git clone https://github.com/depocoder/YetAnotherCalendar.git
cd YetAnotherCalendar

# Install dependencies
uv sync

# Create environment file
cp .env.dist .env
# Edit .env with your configuration

# install pre-commit hooks
uv run pre-commit install

# Run the application
uv run python -m yet_another_calendar
```

#### 2. Using Docker Compose

```bash
# Clone the repository
git clone https://github.com/depocoder/YetAnotherCalendar.git
cd YetAnotherCalendar

# Create environment file
cp .env.dist .env
# Edit .env with your configuration

# Start the services
docker compose up --build -d
```

## 📖 Documentation

### API Documentation

Once the application is running, you can access the Swagger UI documentation:

- OpenAPI documentation: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- ReDoc: [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)

![Swagger](https://github.com/user-attachments/assets/bca25df5-fd1a-4942-adb8-72f3f18ab178)

## 🙏 Acknowledgements

- [FastAPI](https://fastapi.tiangolo.com/)
- [Pydantic](https://pydantic-docs.helpmanual.io/)
- [React](https://reactjs.org/)
- [Redis](https://redis.io/)

