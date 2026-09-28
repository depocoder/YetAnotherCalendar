import React, { useRef, useState } from 'react';
import '../../style/export-menu.scss';

/**
 * Меню "Ещё": группирует второстепенные действия шапки, чтобы не
 * перегружать её кнопками. Ховер на десктопе, тап (bottom sheet) на
 * мобильных — тот же паттерн, что у меню экспорта.
 */
const SettingsMenu = ({ onOpenCourses, onOpenFeatures }) => {
    const [open, setOpen] = useState(false);
    const closeTimerRef = useRef(null);

    const openMenu = () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        setOpen(true);
    };

    const scheduleClose = () => {
        closeTimerRef.current = setTimeout(() => setOpen(false), 150);
    };

    const pick = (action) => () => {
        setOpen(false);
        action();
    };

    return (
        <div
            className={`export-menu ${open ? 'export-menu--open' : ''}`}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
        >
            <button
                className="export-btn"
                onClick={() => setOpen(prev => !prev)}
                title="Курсы, приватность и информация о проекте"
            >
                ⚙️ Ещё <span className="export-menu__caret">▾</span>
            </button>
            {open && <div className="export-menu__backdrop" onClick={() => setOpen(false)} />}
            <div className="export-menu__dropdown">
                <button className="export-menu__item" onClick={pick(onOpenCourses)}>
                    <span className="export-menu__item-icon">📚</span>
                    <span>
                        <span className="export-menu__item-title">Мои курсы</span>
                        <span className="export-menu__item-hint">Какие курсы Нетологии подгружать</span>
                    </span>
                </button>
                <button
                    className="export-menu__item"
                    onClick={pick(() => window.open('/privacy', '_blank', 'noopener'))}
                >
                    <span className="export-menu__item-icon">🛡</span>
                    <span>
                        <span className="export-menu__item-title">Данные и приватность</span>
                        <span className="export-menu__item-hint">Что храним и как все удалить</span>
                    </span>
                </button>
                <button className="export-menu__item" onClick={pick(onOpenFeatures)}>
                    <span className="export-menu__item-icon">✨</span>
                    <span>
                        <span className="export-menu__item-title">О проекте</span>
                        <span className="export-menu__item-hint">Возможности YetAnotherCalendar</span>
                    </span>
                </button>
            </div>
        </div>
    );
};

export default SettingsMenu;
