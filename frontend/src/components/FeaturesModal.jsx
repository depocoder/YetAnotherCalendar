import React from 'react';

const FeaturesModal = ({ isOpen, onClose, onOpenGithubModal }) => {
    if (!isOpen) return null;

    return (
        <div className="features-modal-overlay">
            <div className="features-modal">
                <button className="features-modal-close" onClick={onClose}>
                    ×
                </button>
                
                <div className="features-modal-content">
                    <div className="features-modal-header">
                        <h2>🚀 Возможности YetAnotherCalendar</h2>
                        <p className="features-modal-subtitle">
                            Все ваши учебные события в одном месте
                        </p>
                    </div>
                    
                    <div className="features-modal-body">
                        <div className="features-grid">
                            <div className="feature-card">
                                <div className="feature-icon">🔐</div>
                                <h3>Приватность прежде всего</h3>
                                <p>Никакой телеметрии и отслеживания. Мы не сохраняем пароли и email. Ваши данные остаются только у вас!</p>
                            </div>

                            <div className="feature-card">
                                <div className="feature-icon">🔄</div>
                                <h3>Интеграция с платформами</h3>
                                <p>Поддержка Modeus, LMS и Нетологии. Все дедлайны и события из разных систем в едином интерфейсе.</p>
                            </div>

                            <div className="feature-card">
                                <div className="feature-icon">📤</div>
                                <h3>Экспорт в календари</h3>
                                <p>Экспорт в формат .ics для использования в любом календарном приложении. Синхронизация с Google Calendar, Apple Calendar и др.</p>
                            </div>

                            <div className="feature-card">
                                <div className="feature-icon">⚡</div>
                                <h3>Высокая производительность</h3>
                                <p>Кэширование всех запросов в Redis. Быстрая загрузка и отзывчивый интерфейс даже при большом количестве событий.</p>
                            </div>

                            <div className="feature-card">
                                <div className="feature-icon">🌍</div>
                                <h3>Поддержка часовых поясов</h3>
                                <p>Автоматическое определение и корректная обработка разных временных зон. Время всегда отображается правильно!</p>
                            </div>

                            <div className="feature-card">
                                <div className="feature-icon">🔧</div>
                                <h3>Умное управление кэшем</h3>
                                <p>Автоматическое обновление данных для актуальных недель. Экономия трафика и быстрая работа системы.</p>
                            </div>

                            <div className="feature-card">
                                <div className="feature-icon">📱</div>
                                <h3>Адаптивный дизайн</h3>
                                <p>Удобное использование на любых устройствах - от смартфонов до больших мониторов. Всегда под рукой!</p>
                            </div>

                            <div className="feature-card">
                                <div className="feature-icon">🎯</div>
                                <h3>Фокус на UX</h3>
                                <p>Интуитивно понятный интерфейс, быстрая навигация между неделями, детальная информация о событиях.</p>
                            </div>
                        </div>

                        <div className="features-tech-info">
                            <h3>🧪 Качество кода</h3>
                            <p>
                                Весь код типизирован с помощью mypy, проходит линтинг Ruff и покрыт тестами pytest. 
                                Непрерывная интеграция обеспечивает стабильность системы.
                            </p>
                        </div>
                    </div>
                    
                    <div className="features-modal-actions">
                        <button 
                            className="about-page-btn"
                            onClick={() => {
                                window.location.href = '/about';
                            }}
                            title="Подробнее о проекте"
                        >
                            📚 Узнать больше о проекте
                        </button>
                        
                        <button 
                            className="feedback-page-btn"
                            onClick={() => {
                                window.location.href = '/feedback';
                            }}
                            title="Обратная связь и поддержка"
                        >
                            🐛 Сообщить об ошибке
                        </button>
                        
                        <button 
                            className="github-star-trigger-btn-modal"
                            onClick={() => {
                                onClose();
                                onOpenGithubModal();
                            }}
                            title="Поставить звезду на GitHub"
                        >
                            ⭐ Поддержать проект на GitHub
                        </button>
                    </div>

                    <div className="features-modal-footer">
                        <p>
                            💡 <strong>Открытый исходный код:</strong> Проект полностью открыт и доступен на GitHub. 
                            Присоединяйтесь к развитию!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeaturesModal;