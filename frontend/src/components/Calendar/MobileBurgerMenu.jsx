import React, { useState, useEffect } from 'react';

const MobileBurgerMenu = ({ 
    date, 
    onDataUpdate, 
    cachedAt, 
    calendarReady, 
    onOpenFeaturesModal 
}) => {
    const [isOpen, setIsOpen] = useState(false);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && !event.target.closest('.mobile-burger-menu') && !event.target.closest('.mobile-burger-trigger')) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('click', handleClickOutside);
            document.body.style.overflow = 'hidden'; // Prevent scroll when menu is open
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Close menu on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    return (
        <>
            {/* Burger Menu Trigger */}
            <button 
                className="mobile-burger-trigger"
                onClick={toggleMenu}
                aria-label="Открыть меню"
            >
                <div className={`burger-icon ${isOpen ? 'burger-icon-open' : ''}`}>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </button>

            {/* Menu Overlay */}
            {isOpen && <div className="mobile-menu-overlay" onClick={() => setIsOpen(false)} />}

            {/* Menu Content */}
            <div className={`mobile-burger-menu ${isOpen ? 'mobile-burger-menu-open' : ''}`}>
                <div className="mobile-menu-header">
                    <h3>Меню</h3>
                    <button 
                        className="mobile-menu-close"
                        onClick={() => setIsOpen(false)}
                        aria-label="Закрыть меню"
                    >
                        ×
                    </button>
                </div>

                <div className="mobile-menu-content">
                    {/* ICS Export - We'll need to import this component */}
                    <div className="mobile-menu-item">
                        <div className="mobile-menu-item-icon">📅</div>
                        <div className="mobile-menu-item-content">
                            <div className="mobile-menu-item-title">Экспорт календаря</div>
                            <div className="mobile-menu-item-description">Скачать в формате ICS</div>
                        </div>
                    </div>

                    {/* Cache Update - We'll need to import this component */}
                    <div className="mobile-menu-item">
                        <div className="mobile-menu-item-icon">🔄</div>
                        <div className="mobile-menu-item-content">
                            <div className="mobile-menu-item-title">Обновить кэш</div>
                            <div className="mobile-menu-item-description">Получить свежие данные</div>
                        </div>
                    </div>

                    {/* Features/About */}
                    <div className="mobile-menu-item" onClick={() => {
                        onOpenFeaturesModal();
                        setIsOpen(false);
                    }}>
                        <div className="mobile-menu-item-icon">✨</div>
                        <div className="mobile-menu-item-content">
                            <div className="mobile-menu-item-title">О проекте</div>
                            <div className="mobile-menu-item-description">Узнать больше о возможностях</div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MobileBurgerMenu;