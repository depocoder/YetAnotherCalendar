import React from 'react';

const GitHubStarModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleStarClick = () => {
        window.open('https://github.com/depocoder/YetAnotherCalendar/', '_blank');
        // Сохраняем в localStorage, что пользователь поставил звезду и больше не нужно показывать окно
        localStorage.setItem('githubStarModalShown', 'true');
        // Удаляем дату напоминания, если она была установлена
        localStorage.removeItem('githubStarRemindDate');
        onClose();
    };

    const handleClose = () => {
        // Сохраняем в localStorage информацию о том, что пользователь уже видел модальное окно
        localStorage.setItem('githubStarModalShown', 'true');
        onClose();
    };

    const handleRemindLater = () => {
        // Устанавливаем дату напоминания через неделю
        const reminderDate = new Date();
        reminderDate.setDate(reminderDate.getDate() + 7);
        localStorage.setItem('githubStarRemindDate', reminderDate.toISOString());
        onClose();
    };

    return (
        <div className="github-star-modal-overlay" onClick={handleClose}>
            <div className="github-star-modal" onClick={(e) => e.stopPropagation()}>
                <button className="github-star-modal-close" onClick={handleClose}>
                    ×
                </button>
                
                <div className="github-star-modal-content">
                    <div className="github-star-modal-header">
                        <h2>🌟 Нравится YetAnotherCalendar?</h2>
                    </div>
                    
                    <div className="github-star-modal-body">
                        <p>
                            Если наш календарь помогает вам организовать учебу, 
                            <strong> поставьте звезду на GitHub!</strong>
                        </p>
                        
                        <p>
                            Это поможет другим студентам найти проект и мотивирует нас развивать его дальше.
                        </p>
                        

                        
                        <div className="github-star-modal-contribute">
                            <p>
                                <strong>Мы открыты для новых контрибьюторов!</strong>
                            </p>
                            <p>
                                Есть идеи для улучшения? Хотите добавить новые функции? 
                                Присоединяйтесь к разработке или оставьте обратную связь!
                            </p>
                        </div>
                    </div>
                    
                    <div className="github-star-modal-actions">
                        <button 
                            className="github-star-btn"
                            onClick={handleStarClick}
                        >
                            ⭐ Поставить звезду на GitHub
                        </button>
                        <button 
                            className="github-star-modal-later"
                            onClick={handleRemindLater}
                        >
                            Напомнить через неделю
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GitHubStarModal;
