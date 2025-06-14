# ![32x32_UPD](https://github.com/user-attachments/assets/1fbb28a8-01bf-46bc-acc7-8527a1fd60aa) YetAnotherCalendar

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

## ✨ Features

- 🔒 **Privacy First**: No telemetry or tracking, We don't store passes or emails. We don't need it, **we respect your
  data**.
- 🔄 **Multi-platform Integration**: Modeus & LMS & Netology events API support, you won't forget any deadline.
- 📤 **Export Options**: Export to .ics calendar format for use with your favorite calendar app.
- ⚡ **Performance**: Cache all big requests in Redis for faster response times.
- 🧪 **Code Quality**: All code is typed with mypy. Linted with Ruff and tested with pytest.
- 🌍 **Timezone Support**: Seamless handling of different timezones.

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

### 🔁 Local subdomain setup for development

To enable subdomain-based login flows in development (e.g. separate autofill for Netology and Modeus login forms), you need to add a custom host entry:

1. Open your `hosts` file:
   - **Windows**: `C:\Windows\System32\drivers\etc\hosts`
   - **macOS / Linux**: `/etc/hosts`

2. Add the following line:

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the LICENSE file for details.
