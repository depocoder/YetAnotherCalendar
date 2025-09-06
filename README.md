# ![32x32_UPD](https://github.com/user-attachments/assets/1fbb28a8-01bf-46bc-acc7-8527a1fd60aa) YetAnotherCalendar

<!-- Pytest Coverage Comment:Begin -->

<!-- Pytest Coverage Comment:End -->

[![GitHub Repo stars](https://img.shields.io/github/stars/depocoder/YetAnotherCalendar)](https://github.com/depocoder/YetAnotherCalendar/stargazers)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/depocoder/YetAnotherCalendar)
![GitHub last commit](https://img.shields.io/github/last-commit/depocoder/YetAnotherCalendar)
![Github Action status](https://github.com/depocoder/YetAnotherCalendar/actions/workflows/lint-and-test.yaml/badge.svg)

![GitHub Created At](https://img.shields.io/github/created-at/depocoder/YetAnotherCalendar)
![GitHub License](https://img.shields.io/github/license/depocoder/YetAnotherCalendar)
![GitHub Repo Size](https://img.shields.io/github/repo-size/depocoder/YetAnotherCalendar)

## 📝 Description

This product replaces Modeus+LMS calendar & Netology calendar, for better experience and more features.
YetAnotherCalendar provides a unified interface to manage all your educational events and deadlines in one place.

## Preview
<img width="2016" height="930" alt="{9C731E20-4F0A-46EC-9C84-F5D204A9A1B2}" src="https://github.com/user-attachments/assets/1abd74fb-1e23-445b-9829-fc4bbdd0b23d" />


## ✨ Features

### 🔒 **Privacy & Security First**
- **No Data Storage**: We don't store passwords, emails, or personal credentials
- **Privacy-by-Design**: No telemetry, tracking, or analytics - we respect your data
- **Error Monitoring**: Rollbar integration with sensitive data scrubbing for production reliability
- **Rate Limiting**: Built-in protection against login attacks with configurable limits

### 🔄 **Multi-Platform Integration**
- **🎓 Modeus Integration**: UTMN university schedule with JWT token support and donor account system
- **📚 LMS Integration**: Moodle-based learning management system with course modules and deadlines
- **🌐 Netology Integration**: Professional education platform with webinars and homework tracking
- **🔗 Unified API**: Single endpoint combining all platforms for seamless experience

### 📱 **Modern User Interface**
- **📱 Mobile-First Design**: BETA mobile interface with responsive calendar views
- **🗓️ Advanced Date Picker**: Custom week picker with Russian localization
- **📋 Event Details**: Rich event modals with source attribution and action buttons  
- **⚡ Real-time Updates**: Cache refresh system with visual indicators
- **🎨 Material Design**: Clean, modern interface with intuitive navigation

### 📤 **Export & Sharing Features**
- **📅 ICS Export**: Standard calendar format compatible with Google Calendar, Outlook, Apple Calendar
- **🔗 MTS Links**: Custom webinar link management system for quick access
- **⏰ Timezone Support**: Automatic timezone detection and conversion (Moscow, UTC, local)
- **💾 Smart Caching**: Redis-powered caching with 14-day event retention

### 🛠️ **Technical Excellence**
- **🧪 Comprehensive Testing**: pytest with fixtures for all major components
- **📝 Type Safety**: Full mypy typing coverage for better code reliability  
- **🔍 Code Quality**: Ruff linting with strict formatting standards
- **🐳 Container Ready**: Docker Compose setup for easy deployment
- **⚡ High Performance**: Async FastAPI backend with Redis caching layer

### 👥 **Authentication & Authorization**
- **🔐 Tutor Authentication**: JWT-based secure access for instructors
- **🚫 Rate Limiting**: Protection against brute force attacks on all login endpoints
- **🍪 Session Management**: Secure cookie handling with proper expiration
- **🔑 Token Management**: Automatic token refresh and validation

## 🏗️ **Architecture**

### Backend Stack
- **🚀 FastAPI**: Modern async Python web framework with automatic API documentation  
- **🔍 Pydantic**: Data validation and settings management with type hints
- **🗄️ Redis**: High-performance caching and session storage
- **🌐 HTTPX**: Async HTTP client for external API integrations
- **🔧 Loguru**: Advanced logging with structured output and Rollbar integration

### Frontend Stack  
- **⚛️ React**: Component-based UI library with hooks and modern patterns
- **🎨 SCSS**: Advanced CSS preprocessing for maintainable styles
- **📅 Flatpickr**: Customizable date picker with internationalization
- **🍞 React Toastify**: User-friendly notification system
- **📱 Responsive Design**: Mobile-first approach with adaptive layouts

### Infrastructure
- **🐳 Docker**: Containerized deployment with multi-stage builds
- **🔄 Docker Compose**: Development and production orchestration  
- **⚡ Uvicorn**: ASGI server with auto-reload and performance optimization
- **🌍 NGINX**: Reverse proxy and static file serving (production)

## 📚 Documentation

- ### ⚙️ [Backend docs](https://github.com/depocoder/YetAnotherCalendar/tree/main/backend)
- ### 🌐 [Frontend docs](https://github.com/depocoder/YetAnotherCalendar/tree/main/frontend)

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose
- Git

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/depocoder/YetAnotherCalendar.git
   cd YetAnotherCalendar
   ```

2. Create `.env` files from templates:
   ```sh
   cp backend/.env.dist backend/.env
   cp frontend/.env.dist frontend/.env
   ```

3. Configure your environment variables in the `.env` files

4. Run the application:
    ```sh
    docker compose up --build
    ```

### Production Mode

```sh
docker compose -f docker-compose.prod.yaml up -d
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the LICENSE file for details.


## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=depocoder/YetAnotherCalendar&type=Date)](https://www.star-history.com/#depocoder/YetAnotherCalendar&Date)
