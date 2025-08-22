import React from 'react';
import '../style/about.scss';

const AboutPage = () => {
    return (
        <div className="about-page">
            {/* Hero Section */}
            <section className="about-hero">
                <div className="about-hero-content">
                    <h1>🗓️ YetAnotherCalendar</h1>
                    <p className="about-hero-subtitle">
                        Объединяем все ваши учебные события в одном удобном календаре
                    </p>
                    <p className="about-hero-description">
                        Превосходная альтернатива календарям Modeus и Нетологии с расширенными возможностями 
                        и лучшим пользовательским опытом. Интеграция с множественными образовательными платформами 
                        в едином интерфейсе.
                    </p>
                    <div className="about-hero-actions">
                        <button 
                            className="hero-btn primary"
                            onClick={() => window.open('https://github.com/depocoder/YetAnotherCalendar', '_blank')}
                        >
                            ⭐ GitHub
                        </button>
                        <button 
                            className="hero-btn secondary"
                            onClick={() => window.location.href = '/'}
                        >
                            🚀 Попробовать
                        </button>
                    </div>
                </div>
            </section>

            {/* Core Features Section */}
            <section className="about-section">
                <div className="about-container">
                    <h2>🚀 Основные возможности</h2>
                    <div className="features-grid-large">
                        <div className="feature-card-large">
                            <div className="feature-header">
                                <span className="feature-icon-large">🔗</span>
                                <h3>Мультиплатформенная интеграция</h3>
                            </div>
                            <p>
                                Полная интеграция с <strong>Modeus</strong>, <strong>LMS</strong> и <strong>Нетологией</strong>. 
                                Все ваши события, дедлайны и расписание из разных систем объединены в одном календаре.
                            </p>
                            <ul className="feature-list">
                                <li>✅ Автоматическая синхронизация событий</li>
                                <li>✅ Единая авторизация для всех платформ</li>
                                <li>✅ Умная категоризация по источникам</li>
                            </ul>
                        </div>

                        <div className="feature-card-large">
                            <div className="feature-header">
                                <span className="feature-icon-large">⚡</span>
                                <h3>Молниеносная производительность</h3>
                            </div>
                            <p>
                                Система построена на <strong>FastAPI</strong> с <strong>Redis кэшированием</strong> 
                                для максимальной скорости загрузки и отзывчивости интерфейса.
                            </p>
                            <ul className="feature-list">
                                <li>✅ Асинхронная архитектура Python</li>
                                <li>✅ Интеллектуальное кэширование</li>
                                <li>✅ Оптимизированные запросы к базе данных</li>
                            </ul>
                        </div>

                        <div className="feature-card-large">
                            <div className="feature-header">
                                <span className="feature-icon-large">📤</span>
                                <h3>Экспорт и синхронизация</h3>
                            </div>
                            <p>
                                Экспорт в формат <strong>.ics</strong> для использования в любом календарном приложении. 
                                Синхронизация с Google Calendar, Apple Calendar и другими.
                            </p>
                            <ul className="feature-list">
                                <li>✅ Стандартный формат iCalendar</li>
                                <li>✅ Автоматическое обновление событий</li>
                                <li>✅ Поддержка всех календарных приложений</li>
                            </ul>
                        </div>

                        <div className="feature-card-large">
                            <div className="feature-header">
                                <span className="feature-icon-large">🔐</span>
                                <h3>Корпоративная безопасность</h3>
                            </div>
                            <p>
                                Защита на уровне предприятия: <strong>JWT токены</strong>, ограничение скорости запросов, 
                                защита от брутфорса и безопасная аутентификация.
                            </p>
                            <ul className="feature-list">
                                <li>✅ Защита от атак методом перебора</li>
                                <li>✅ Лимитирование запросов (Rate Limiting)</li>
                                <li>✅ Безопасное хранение сессий</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Admin Features Section */}
            <section className="about-section alt">
                <div className="about-container">
                    <h2>👨‍🏫 Возможности для преподавателей</h2>
                    <div className="admin-features">
                        <div className="admin-feature">
                            <span className="admin-icon">🔒</span>
                            <div>
                                <h4>Панель администратора</h4>
                                <p>Защищенная панель для преподавателей с возможностью управления расписанием студентов</p>
                            </div>
                        </div>
                        <div className="admin-feature">
                            <span className="admin-icon">👥</span>
                            <div>
                                <h4>Система донорских аккаунтов</h4>
                                <p>Безопасный доступ к расписанию студентов через донорские учетные записи</p>
                            </div>
                        </div>
                        <div className="admin-feature">
                            <span className="admin-icon">📊</span>
                            <div>
                                <h4>Аналитика и мониторинг</h4>
                                <p>Комплексное логирование, отслеживание ошибок и мониторинг производительности</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Technology Stack Section */}
            <section className="about-section">
                <div className="about-container">
                    <h2>🛠️ Технологический стек</h2>
                    <div className="tech-grid">
                        <div className="tech-category">
                            <h4>Backend</h4>
                            <div className="tech-items">
                                <div className="tech-item">
                                    <span className="tech-badge python">Python 3.12+</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge fastapi">FastAPI</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge pydantic">Pydantic v2</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge redis">Redis</span>
                                </div>
                            </div>
                        </div>
                        <div className="tech-category">
                            <h4>Frontend</h4>
                            <div className="tech-items">
                                <div className="tech-item">
                                    <span className="tech-badge react">React</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge scss">SCSS</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge responsive">Responsive</span>
                                </div>
                            </div>
                        </div>
                        <div className="tech-category">
                            <h4>DevOps</h4>
                            <div className="tech-items">
                                <div className="tech-item">
                                    <span className="tech-badge docker">Docker</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge uv">uv</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge github">GitHub Actions</span>
                                </div>
                            </div>
                        </div>
                        <div className="tech-category">
                            <h4>Качество кода</h4>
                            <div className="tech-items">
                                <div className="tech-item">
                                    <span className="tech-badge mypy">mypy</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge ruff">Ruff</span>
                                </div>
                                <div className="tech-item">
                                    <span className="tech-badge pytest">pytest</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* API & Documentation Section */}
            <section className="about-section alt">
                <div className="about-container">
                    <h2>📚 API и документация</h2>
                    <div className="api-features">
                        <div className="api-card">
                            <h4>🎯 Swagger UI</h4>
                            <p>Интерактивная документация API с возможностью тестирования эндпоинтов в реальном времени</p>
                            <code>/api/docs</code>
                        </div>
                        <div className="api-card">
                            <h4>📖 ReDoc</h4>
                            <p>Красивая статическая документация API с подробными описаниями всех методов</p>
                            <code>/api/redoc</code>
                        </div>
                        <div className="api-card">
                            <h4>🔗 RESTful API</h4>
                            <p>Полноценный REST API для интеграции с внешними системами и разработки мобильных приложений</p>
                            <code>JSON/HTTP</code>
                        </div>
                    </div>
                </div>
            </section>

            {/* Privacy & Security Section */}
            <section className="about-section">
                <div className="about-container">
                    <h2>🛡️ Приватность и безопасность</h2>
                    <div className="security-grid">
                        <div className="security-item">
                            <span className="security-icon">🔐</span>
                            <h4>Никакой телеметрии</h4>
                            <p>Мы не собираем ваши личные данные и не отслеживаем активность. Полное уважение к приватности пользователей.</p>
                        </div>
                        <div className="security-item">
                            <span className="security-icon">🔒</span>
                            <h4>Безопасное хранение</h4>
                            <p>Пароли и токены не сохраняются. Все данные аутентификации передаются напрямую в соответствующие системы.</p>
                        </div>
                        <div className="security-item">
                            <span className="security-icon">🌍</span>
                            <h4>Открытый код</h4>
                            <p>Полностью открытый исходный код - вы можете убедиться в безопасности и внести свой вклад в развитие проекта.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contributing Section */}
            <section className="about-section alt">
                <div className="about-container">
                    <h2>🤝 Как помочь проекту</h2>
                    <div className="contributing-options">
                        <div className="contrib-card">
                            <span className="contrib-icon">⭐</span>
                            <h4>Поставьте звезду</h4>
                            <p>Самый простой способ поддержать проект - поставить звезду на GitHub</p>
                        </div>
                        <div className="contrib-card">
                            <span className="contrib-icon">🐛</span>
                            <h4>Сообщите об ошибке</h4>
                            <p>Нашли баг? Создайте issue в GitHub репозитории с подробным описанием</p>
                        </div>
                        <div className="contrib-card">
                            <span className="contrib-icon">💡</span>
                            <h4>Предложите идею</h4>
                            <p>Есть предложения по улучшению? Поделитесь своими идеями через GitHub Discussions</p>
                        </div>
                        <div className="contrib-card">
                            <span className="contrib-icon">👨‍💻</span>
                            <h4>Внесите код</h4>
                            <p>Хотите участвовать в разработке? Создайте Pull Request с вашими улучшениями</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <section className="about-footer">
                <div className="about-container">
                    <div className="footer-content">
                        <div className="footer-info">
                            <h4>YetAnotherCalendar</h4>
                            <p>Создано студентами для студентов 💜</p>
                        </div>
                        <div className="footer-links">
                            <a href="https://github.com/depocoder/YetAnotherCalendar" target="_blank" rel="noopener noreferrer">
                                GitHub
                            </a>
                            <a href="https://github.com/depocoder/YetAnotherCalendar/issues" target="_blank" rel="noopener noreferrer">
                                Issues
                            </a>
                            <a href="/" className="footer-home">
                                ← Вернуться к календарю
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AboutPage;