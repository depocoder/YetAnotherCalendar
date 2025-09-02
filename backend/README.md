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

* 📱 **Responsive Interface** - Works seamlessly on all devices
* 🔄 **Export to ICS** - Sync with Google Calendar, Apple Calendar, and more
* 🌍 **Timezone Support** - Automatic timezone handling (default Moscow)
* 🔌 **Multi-Platform Integration** - Modeus + Netology + LMS unified
* 📦 **Redis Caching** - Lightning-fast performance with smart caching (14-day retention)
* 🏷️ **Event Management** - Custom tagging and categorization with source attribution
* 🔍 **Advanced Search** - Powerful filtering and search capabilities
* 🔒 **Enterprise Security** - Rate limiting, JWT tokens, and brute force protection
* 👨‍🏫 **Admin Panel** - Secure tutor authentication with donor account system
* 🚀 **High Performance** - Async Python with optimized database queries
* 📊 **Production Monitoring** - Rollbar error tracking with sensitive data scrubbing
* 🔗 **MTS Link Management** - Custom webinar redirect system with Redis storage
* 🛡️ **Security Hardening** - Comprehensive field scrubbing for all authentication tokens

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
# Edit .env with your configuration (see Environment Variables section below)

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
# Edit .env with your configuration (see Environment Variables section below)

# Start the services
docker compose up --build -d
```

## 🔧 Environment Variables

Configure your application by setting these environment variables in your `.env` file:

### 🏗️ **Core Settings**
```bash
YET_ANOTHER_CALENDAR_WORKERS_COUNT=10          # 🔄 Number of uvicorn workers
YET_ANOTHER_CALENDAR_DEBUG=False               # 🐛 Enable debug mode
```

### 🔐 **Security & Authentication**
```bash
# Tutor Admin Panel Authentication
YET_ANOTHER_CALENDAR_TUTOR_PASSWORD_HASH=""            # 🔒 Hashed password for admin access
YET_ANOTHER_CALENDAR_TUTOR_SECRET_KEY=""               # 🔑 JWT secret key for tutor tokens

# Modeus Donor Account (for tutors to access student schedules)
YET_ANOTHER_CALENDAR_MODEUS_USERNAME=""                # 👤 Modeus donor account username
YET_ANOTHER_CALENDAR_MODEUS_PASSWORD=""                # 🔐 Modeus donor account password
```

### 🛡️ **Rate Limiting Protection**
```bash
YET_ANOTHER_CALENDAR_LOGIN_MAX_ATTEMPTS=5              # 🚫 Max failed login attempts
YET_ANOTHER_CALENDAR_LOGIN_LOCKOUT_TIME=900            # ⏱️ Lockout time in seconds (15 min)
```

### 🌐 **External Services**
```bash
# Netology Integration
NETOLOGY_DEFAULT_COURSE_ID=45526                       # 📚 Default course ID
NETOLOGY_COURSE_NAME="Разработка IT-продуктов"         # 📖 Course name
NETOLOGY_URL="https://netology.ru"                     # 🔗 Netology base URL

# Application Domain
YET_ANOTHER_CALENDAR_APP_DOMAIN="https://yetanothercalendar.ru"  # 🌍 Your domain
```

### 🛡️ **Error Monitoring & Logging**
```bash
# Rollbar Integration (Production Error Tracking)
YET_ANOTHER_CALENDAR_ROLLBAR_TOKEN=""                  # 🔍 Rollbar access token  
YET_ANOTHER_CALENDAR_ROLLBAR_ENVIRONMENT="production"   # 🏷️ Environment (dev/staging/production)
```

### ⚙️ **Generate Password Hash**
To set up admin access, run this script to generate a secure password hash:

```bash
cd backend
python generate_password_hash.py
```

Copy the generated hash to your `.env` file as `YET_ANOTHER_CALENDAR_TUTOR_PASSWORD_HASH`.

## 🐛 Debugging

### Python Debug with VS Code

The application includes debugpy integration for remote debugging during development.

#### Setup & Usage

1. **Start the application in debug mode**:
   ```bash
   # Set debug mode in .env
   YET_ANOTHER_CALENDAR_DEBUG=True
   
   # Using Docker Compose (recommended)
   docker compose up --build
   
2. **In VS Code**:
   - Open the project folder containing `.vscode/launch.json`
   - Go to Run and Debug (Ctrl+Shift+D)
   - Select "Python debug backend" configuration
   - Click "Start Debugging" (F5)

#### Configuration Details

- **Debug Port**: 5678 (automatically exposed in Docker)
- **Path Mapping**: 
  - Local: `${workspaceFolder}/backend` 
  - Remote: `/app/src` (inside Docker container)
- **Connection**: Attaches to running application (not launch mode)

#### When Debug Mode is Active

- Debugpy listens on `0.0.0.0:5678` inside the container
- Port 5678 is exposed via Docker Compose
- VS Code can attach and set breakpoints in your backend code
- `justMyCode: true` - only debug your application code (not libraries)

#### Troubleshooting

- Ensure `YET_ANOTHER_CALENDAR_DEBUG=True` in your `.env` file
- Check that port 5678 is not used by another process
- Restart the Docker container after changing debug settings
- Verify VS Code is using the correct launch configuration

## 📖 Documentation

### 📊 **API Documentation**

Once the application is running, you can access the interactive API documentation:

- 🎯 **Swagger UI**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- 📚 **ReDoc**: [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)

![Swagger](https://github.com/user-attachments/assets/bca25df5-fd1a-4942-adb8-72f3f18ab178)

### 👨‍🏫 **Admin Panel Access**

After setting up your tutor password, access the admin panel at:
- 🔐 **Admin Login**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- 📅 **Calendar Links**: [http://localhost:3000/admin/calendar-links](http://localhost:3000/admin/calendar-links)

## 🙏 Acknowledgements

- [FastAPI](https://fastapi.tiangolo.com/)
- [Pydantic](https://pydantic-docs.helpmanual.io/)
- [React](https://reactjs.org/)
- [Redis](https://redis.io/)

