import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/notfound.scss';

const NotFoundPage = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [textVisible, setTextVisible] = useState(false);
    const [showSubtext, setShowSubtext] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Анимация появления страницы
        setTimeout(() => setIsVisible(true), 100);
        setTimeout(() => setTextVisible(true), 800);
        setTimeout(() => setShowSubtext(true), 1500);
    }, []);

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <div className={`notfound-container ${isVisible ? 'notfound-container--visible' : ''}`}>
            <div className="notfound-content">
                {/* Главный мем */}
                <div className={`notfound-meme ${textVisible ? 'notfound-meme--visible' : ''}`}>
                    <div className="notfound-cat-container">
                        <div className="notfound-hood"></div>
                        <div className="notfound-cat-head">
                            <div className="notfound-eyes">
                                <div className="notfound-eye"></div>
                                <div className="notfound-eye"></div>
                            </div>
                        </div>
                    </div>
                    <div className="notfound-speech-bubble">
                        <div className="notfound-speech-text">
                            О как
                        </div>
                        <div className="notfound-speech-tail"></div>
                    </div>
                </div>

                {/* Основной текст */}
                <div className={`notfound-main-text ${textVisible ? 'notfound-main-text--visible' : ''}`}>
                    <h1 className="notfound-title">404</h1>
                    <h2 className="notfound-subtitle">
                        Мы еще не успели добавить ссылку на этот урок
                    </h2>
                </div>

                {/* Кнопка */}
                <div className={`notfound-details ${showSubtext ? 'notfound-details--visible' : ''}`}>
                    <div className="notfound-actions">
                        <button 
                            className="notfound-btn notfound-btn--primary" 
                            onClick={handleGoHome}
                        >
                            Вернуться к календарю
                        </button>
                    </div>
                </div>

                {/* Декоративные элементы */}
                <div className="notfound-decorations">
                    <div className="notfound-float notfound-float--1">📚</div>
                    <div className="notfound-float notfound-float--2">✨</div>
                    <div className="notfound-float notfound-float--3">🔗</div>
                    <div className="notfound-float notfound-float--4">📝</div>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
