import React from 'react';
import '../style/feedback-modal.scss';

const FeedbackModal = ({ isOpen, onClose }) => {
    const openGitHubIssue = () => {
        window.open('https://github.com/depocoder/YetAnotherCalendar/issues/new', '_blank');
    };

    const openTelegram = () => {
        window.open('https://t.me/yetanothercalendar', '_blank');
    };

    const goToFeedbackPage = () => {
        window.location.href = '/feedback';
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    React.useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        const previousOverflow = document.body.style.overflow;
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="feedback-modal-backdrop" onClick={handleBackdropClick}>
            <div className="feedback-modal">
                <div className="modal-header">
                    <h2>🐛 Обратная связь и поддержка</h2>
                    <button className="modal-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="modal-content">
                    <div className="modal-intro">
                        <p>
                            Помогите нам сделать <strong>YetAnotherCalendar</strong> лучше! 
                            Если у вас есть вопросы, предложения или вы нашли ошибку, 
                            воспользуйтесь одним из способов связи.
                        </p>
                        <div className="dev-notice">
                            <span className="notice-icon">🚧</span>
                            <span>Проект в активной разработке - некоторые функции могут работать нестабильно</span>
                        </div>
                    </div>

                    <div className="modal-options">
                        <div className="feedback-option primary">
                            <div className="option-header">
                                <span className="option-icon">🐞</span>
                                <h3>GitHub Issues</h3>
                            </div>
                            <p>Сообщите об ошибке или предложите улучшение</p>
                            <button className="option-btn primary" onClick={openGitHubIssue}>
                                Создать Issue
                            </button>
                        </div>

                        <div className="feedback-option">
                            <div className="option-header">
                                <span className="option-icon">💬</span>
                                <h3>Telegram</h3>
                            </div>
                            <p>Присоединяйтесь к сообществу для общения и поддержки</p>
                            <button className="option-btn secondary" onClick={openTelegram}>
                                Присоединиться
                            </button>
                        </div>
                    </div>

                    <div className="modal-privacy">
                        <div className="privacy-item">
                            <span className="privacy-icon">🔒</span>
                            <div className="privacy-text">
                                <strong>Приватность:</strong> Мы используем Rollbar для мониторинга ошибок, 
                                но не передаем ваши личные данные. Все пароли и токены автоматически удаляются из логов.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <div className="footer-actions">
                        <button className="footer-btn primary" onClick={goToFeedbackPage}>
                            📝 Открыть страницу обратной связи
                        </button>
                        <button className="footer-link" onClick={onClose}>
                            Закрыть
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;
