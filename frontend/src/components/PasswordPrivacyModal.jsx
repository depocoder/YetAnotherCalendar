import React from 'react';
import '../style/password-privacy-modal.scss';

const PasswordPrivacyModal = ({ isOpen, onClose }) => {
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    React.useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="password-modal-backdrop" onClick={handleBackdropClick}>
            <div className="password-modal">
                <div className="modal-header">
                    <h2>🔐 Безопасность ваших паролей</h2>
                    <button className="modal-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="modal-content">
                    <div className="modal-header-intro">
                        <p className="intro-subtitle">
                            Прозрачность и безопасность — основа нашего подхода к защите ваших данных
                        </p>
                    </div>
                    
                    <div className="privacy-section">
                        <div className="privacy-item highlight">
                            <span className="privacy-icon">🛡️</span>
                            <div className="privacy-text">
                                <h3>Мы НЕ храним ваши пароли!</h3>
                                <p>
                                    Ваши пароли используются исключительно для авторизации и 
                                    <strong> хранятся в оперативной памяти всего 1-4 секунды</strong> во время процесса входа в систему.
                                    
                                </p>
                            </div>
                        </div>

                        <div className="privacy-item">
                            <span className="privacy-icon">🔄</span>
                            <div className="privacy-text">
                                <h4>Как это работает?</h4>
                                <ol>
                                    <li>Вы вводите логин и пароль</li>
                                    <li>Данные передаются в бэкэнд, а оттуда напрямую в образовательную программу</li>
                                    <li>Получаем временные токены для доступа</li>
                                    <li>Пароль немедленно удаляется из памяти</li>
                                    <li>После авторизации мы забываем ваши данные</li>
                                    <li>В браузере сохраняются только токены</li>
                                </ol>
                            </div>
                        </div>

                        <div className="privacy-item">
                            <span className="privacy-icon">🗄️</span>
                            <div className="privacy-text">
                                <h4>У нас нет базы данных</h4>
                                <p>
                                    Все расписание хранится во временном кэше Redis. 
                                    А ваши данные хранятся в оперативной памяти всего 1-4 секунды во время процесса входа в систему.
                                </p>
                            </div>
                        </div>

                        <div className="privacy-item warning">
                            <span className="privacy-icon">⚠️</span>
                            <div className="privacy-text">
                                <h4>Почему нужен пароль?</h4>
                                <p>
                                    К сожалению, <strong>Netology, LMS и Modeus не предоставляют официальные API</strong> для интеграции. Мы связывались с командами всех платформ и получали отказы.
                                </p>
                                <p>
                                    Поэтому приходится симулировать работу браузера для получения данных. 
                                    Это единственный способ объединить ваше расписание из разных систем.
                                </p>
                            </div>
                        </div>

                        <div className="privacy-item trust">
                            <span className="privacy-icon">🌍</span>
                            <div className="privacy-text">
                                <h4>Хотите убедиться?</h4>
                                <p>Проект полностью открытый! Вы можете:</p>
                                <ul>
                                    <li>📂 <a href="https://github.com/depocoder/YetAnotherCalendar" target="_blank" rel="noopener noreferrer">Изучить исходный код</a></li>
                                    <li>🏠 Поднять проект локально у себя</li>
                                    <li>🔍 Убедиться, что мы действительно не храним пароли</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="privacy-tech-info">
                        <h3>🔧 Техническая реализация</h3>
                        <p>
                            Система построена на FastAPI с Redis кэшированием. Все чувствительные данные 
                            автоматически удаляются из памяти после использования. Мониторинг ошибок 
                            ведется через Rollbar с полным исключением персональных данных.
                        </p>
                    </div>
                </div>

                <div className="modal-footer">
                    <div className="footer-actions">
                        <button 
                            className="privacy-modal-btn privacy-modal-btn--about"
                            onClick={() => window.location.href = '/about'}
                        >
                            📚 О проекте
                        </button>
                        <button 
                            className="privacy-modal-btn privacy-modal-btn--github"
                            onClick={() => window.open('https://github.com/depocoder/YetAnotherCalendar', '_blank')}
                        >
                            📂 GitHub
                        </button>
                    </div>                    
                    <div className="footer-info">
                        <p>
                            💡 <strong>Открытый исходный код:</strong> Вся безопасность проверяема. 
                            Поднимите проект локально или изучите код для полной уверенности.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PasswordPrivacyModal;