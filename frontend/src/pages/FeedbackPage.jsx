import React from 'react';
import '../style/feedback.scss';

const FeedbackPage = () => {
    const openGitHubIssue = () => {
        window.open('https://github.com/depocoder/YetAnotherCalendar/issues/new', '_blank');
    };

    const openTelegram = () => {
        window.open('https://t.me/yetanothercalendar', '_blank');
    };

    const goHome = () => {
        window.location.href = '/';
    };

    const goToAbout = () => {
        window.location.href = '/about';
    };

    return (
        <div className="feedback-page">
            {/* Hero Section */}
            <section className="feedback-hero">
                <div className="feedback-hero-content">
                    <h1>🐛 Обратная связь и поддержка</h1>
                    <p className="feedback-hero-subtitle">
                        Помогите нам сделать YetAnotherCalendar лучше
                    </p>
                    <p className="feedback-hero-description">
                        Мы ценим ваши отзывы! Если вы столкнулись с проблемой или у вас есть предложения, 
                        воспользуйтесь одним из способов связи ниже.
                    </p>
                </div>
            </section>

            {/* Development Status */}
            <section className="feedback-section">
                <div className="feedback-container">
                    <div className="status-notice">
                        <div className="notice-header">
                            <span className="notice-icon">🚧</span>
                            <h2>Проект в активной разработке</h2>
                        </div>
                        <div className="notice-content">
                            <p>
                                <strong>YetAnotherCalendar</strong> находится в активной стадии разработки. 
                                Некоторые функции могут работать нестабильно, особенно интеграции с внешними сервисами.
                            </p>
                            <div className="api-warning">
                                <h4>⚠️ Особенности интеграции</h4>
                                <p>
                                    Наш календарь использует <strong>неофициальные API</strong> образовательных платформ 
                                    (Modeus, Нетология, LMS). Это означает, что мы работаем через те же методы, 
                                    что и браузер, но иногда это может приводить к временным сбоям или ограничениям.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Feedback Options */}
            <section className="feedback-section alt">
                <div className="feedback-container">
                    <h2>📝 Способы обратной связи</h2>
                    <div className="feedback-grid">
                        <div className="feedback-card primary">
                            <div className="card-header">
                                <span className="card-icon">🐞</span>
                                <h3>Сообщить об ошибке</h3>
                            </div>
                            <div className="card-content">
                                <p>
                                    Нашли баг или ошибку? Создайте issue на GitHub с подробным описанием проблемы.
                                    Это поможет нам быстро исправить проблему.
                                </p>
                                <ul className="card-benefits">
                                    <li>✅ Прямая связь с разработчиками</li>
                                    <li>✅ Отслеживание статуса исправления</li>
                                    <li>✅ Помощь другим пользователям</li>
                                </ul>
                            </div>
                            <div className="card-actions">
                                <button 
                                    className="feedback-btn primary"
                                    onClick={openGitHubIssue}
                                >
                                    🚀 Создать Issue
                                </button>
                            </div>
                        </div>

                        <div className="feedback-card">
                            <div className="card-header">
                                <span className="card-icon">💬</span>
                                <h3>Сообщество в Telegram</h3>
                            </div>
                            <div className="card-content">
                                <p>
                                    Присоединяйтесь к нашему Telegram-каналу для общения с другими пользователями, 
                                    получения новостей и быстрой помощи.
                                </p>
                                <ul className="card-benefits">
                                    <li>✅ Быстрые ответы на вопросы</li>
                                    <li>✅ Общение с сообществом</li>
                                    <li>✅ Новости и обновления</li>
                                </ul>
                            </div>
                            <div className="card-actions">
                                <button 
                                    className="feedback-btn secondary"
                                    onClick={openTelegram}
                                >
                                    📱 Присоединиться к чату
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Privacy & Security */}
            <section className="feedback-section">
                <div className="feedback-container">
                    <h2>🛡️ Приватность и безопасность</h2>
                    <div className="privacy-info">
                        <div className="privacy-card">
                            <span className="privacy-icon">🔒</span>
                            <div className="privacy-content">
                                <h4>Rollbar - мониторинг ошибок</h4>
                                <p>
                                    Мы используем Rollbar для автоматического отслеживания ошибок в системе. 
                                    <strong>Мы не передаем ваши личные данные!</strong>
                                </p>
                                <details className="privacy-details">
                                    <summary>Что мы скрываем от логов?</summary>
                                    <div className="scrub-list">
                                        <p>Все чувствительные данные автоматически удаляются:</p>
                                        <ul>
                                            <li>🔐 Пароли и токены авторизации</li>
                                            <li>🏫 Данные Modeus (JWT токены, ID пользователей)</li>
                                            <li>🎓 Сессии Нетологии и LMS</li>
                                            <li>💳 Любая личная информация</li>
                                        </ul>
                                        <p className="code-ref">
                                            Проверить можно в коде: 
                                            <code>lifespan.py:95-110</code>
                                        </p>
                                    </div>
                                </details>
                            </div>
                        </div>

                        <div className="privacy-card">
                            <span className="privacy-icon">👁️</span>
                            <div className="privacy-content">
                                <h4>Прозрачность разработки</h4>
                                <p>
                                    Проект полностью открытый - вы можете изучить исходный код и убедиться, 
                                    что мы действительно не собираем ваши данные.
                                </p>
                                <a 
                                    href="https://github.com/depocoder/YetAnotherCalendar" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="code-link"
                                >
                                    📂 Посмотреть код на GitHub
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tips & Troubleshooting */}
            <section className="feedback-section alt">
                <div className="feedback-container">
                    <h2>💡 Частые вопросы и решения</h2>
                    <div className="tips-grid">
                        <div className="tip-item">
                            <h4>🔄 Проблемы с синхронизацией</h4>
                            <p>Попробуйте обновить кэш или перезайти в систему. Внешние API иногда временно недоступны.</p>
                        </div>
                        <div className="tip-item">
                            <h4>🚫 Ошибки входа</h4>
                            <p>Убедитесь, что используете актуальные данные. Если проблема повторяется - сообщите нам!</p>
                        </div>
                        <div className="tip-item">
                            <h4>📱 Мобильная версия</h4>
                            <p>Календарь адаптирован для мобильных устройств, но некоторые функции лучше работают на десктопе.</p>
                        </div>
                        <div className="tip-item">
                            <h4>⚡ Производительность</h4>
                            <p>Первая загрузка может быть медленной из-за синхронизации. Последующие заходы будут быстрее.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer Actions */}
            <section className="feedback-footer">
                <div className="feedback-container">
                    <div className="footer-actions">
                        <button 
                            className="footer-btn primary"
                            onClick={goHome}
                        >
                            🏠 Вернуться к календарю
                        </button>
                        <button 
                            className="footer-btn secondary"
                            onClick={goToAbout}
                        >
                            ℹ️ О проекте
                        </button>
                    </div>
                    <div className="footer-info">
                        <p>Спасибо, что помогаете нам улучшать YetAnotherCalendar! 💜</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default FeedbackPage;