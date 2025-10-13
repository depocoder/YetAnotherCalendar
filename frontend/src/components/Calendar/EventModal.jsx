import React, { useState, useEffect } from 'react';
import arrowGreen from "../../img/ArrowGreen.svg";
import arrowPink from "../../img/ArrowPink.svg";
import arrowViolet from "../../img/ArrowViolet.svg";
import { formatDate } from "../../utils/dateUtils";

const EventModal = ({ event, isOpen, onClose, mtsUrls = {} }) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            // Only block scroll on mobile (where modal is actually visible)
            if (window.innerWidth <= 768) {
                document.body.style.overflow = 'hidden';
            }
        } else {
            document.body.style.overflow = '';
            const timer = setTimeout(() => setIsAnimating(false), 300);
            return () => clearTimeout(timer);
        }
        
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    if (!isAnimating && !isOpen) return null;
    if (!event) return null;

    // Определение источника события
    const getSourceInfo = () => {
        if (event.type === 'netology') {
            return {
                label: 'Нетология',
                icon: arrowGreen,
                date: event.starts_at || event.deadline,
            };
        }
        if (['quiz', 'task', 'test'].includes(event.type)) {
            return {
                label: event.type === 'quiz' ? 'Нетология Тест' : event.type === 'task' ? 'Нетология Задача' : 'Нетология Тестовое задание',
                icon: arrowPink,
                date: event.start || event.deadline,
            };
        }
        if (event.type === 'homework') {
            return {
                label: 'Нетология Домашка',
                icon: arrowPink,
                date: event.deadline,
            };
        }
        if (event.type === 'modeus') {
            return {
                label: 'ТюмГУ',
                icon: arrowViolet,
                date: event.start,
            };
        }
        if (event.type === 'lms' || event.source === 'utmn') {
            return {
                label: 'ТюмГу LXP',
                icon: arrowPink,
                date: event.dt_end || event.deadline,
            };
        }
        return {
            label: 'Неизвестный источник',
            icon: arrowPink,
            date: '',
        };
    };

    // Функция для получения CSS класса кнопки в зависимости от типа события
    const getEventButtonClass = () => {
        if (event.type === 'netology') {
            return 'event-btn-netology';
        }
        if (['quiz', 'task', 'test', 'homework'].includes(event.type)) {
            return 'event-btn-task';
        }
        if (event.type === 'modeus') {
            return 'event-btn-modeus';
        }
        if (event.type === 'lms' || event.source === 'utmn') {
            return 'event-btn-utmn';
        }
        return 'event-btn-modeus'; // Default
    };

    const sourceInfo = getSourceInfo();
    const buttonClass = getEventButtonClass();

    // Определяем URL для кнопки
    let eventUrl = null;
    if (event.type === 'modeus') {
        eventUrl = mtsUrls[event.id];
    } else {
        eventUrl = event.url || event.video_url || event.webinar_url;
    }

    return (
        <div 
            className={`event-modal-overlay ${isOpen ? 'event-modal-overlay-visible' : 'event-modal-overlay-hidden'}`}
            onClick={handleBackdropClick}
        >
            <div className={`event-modal ${isOpen ? 'event-modal-visible' : 'event-modal-hidden'}`}>
                <button 
                    className="event-modal-close"
                    onClick={onClose}
                    aria-label="Закрыть"
                >
                    ×
                </button>

                <div className="event-modal-content">
                    {/* Заголовок с источником */}
                    <div className={`event-modal-header ${event.type || event.source}`}>
                        <div className="event-modal-source">
                            <span className="source-label">{sourceInfo.label}</span>
                            <div className="source-date">
                                <img src={sourceInfo.icon} alt="Arrow" />
                                <span>{formatDate(sourceInfo.date)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Название события */}
                    <div className="event-modal-title">
                        <h2>{event.title || event.name}</h2>
                    </div>

                    {/* Детали события */}
                    <div className="event-modal-details">
                        {event.type === 'netology' && (
                            <div className="event-detail-section">
                                {event?.experts?.[0]?.avatar_path && (
                                    <div className="expert-avatar">
                                        <img
                                            src={event?.experts?.[0]?.avatar_path}
                                            alt={event?.experts?.[0]?.full_name || 'Преподаватель'}
                                        />
                                    </div>
                                )}
                                <div className="event-info-list">
                                    {event?.experts?.[0]?.full_name && (
                                        <div className="event-info-row">
                                            <span className="info-icon">👨‍🏫</span>
                                            <div className="info-content">
                                                <span className="info-label">Преподаватель:</span>
                                                <span className="info-value">{event.experts[0].full_name}</span>
                                            </div>
                                        </div>
                                    )}
                                    {event.block_title && (
                                        <div className="event-info-row">
                                            <span className="info-icon">📚</span>
                                            <div className="info-content">
                                                <span className="info-label">Курс:</span>
                                                <span className="info-value">{event.block_title}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {['quiz', 'task', 'test', 'homework'].includes(event.type) && event.type !== 'netology' && (
                            <div className="event-detail-section">
                                <div className="event-info-list">
                                    <div className="event-info-row">
                                        <span className="info-icon">📚</span>
                                        <div className="info-content">
                                            <span className="info-label">Предмет:</span>
                                            <span className="info-value">{event.block_title || event.course_name || 'Не указано'}</span>
                                        </div>
                                    </div>
                                    {event.type !== 'homework' && (
                                        <div className="event-info-row">
                                            <span className="info-icon">✅</span>
                                            <div className="info-content">
                                                <span className="info-label">Статус:</span>
                                                <span className={`info-badge ${event.passed ? 'passed' : 'not-passed'}`}>
                                                    {event.passed ? 'Пройдено' : 'Не пройдено'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {event.type === 'homework' && (
                                        <div className="event-info-row">
                                            <span className="info-icon">📝</span>
                                            <div className="info-content">
                                                <span className="info-label">Тип:</span>
                                                <span className="info-value">Домашнее задание</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {event.type === 'modeus' && (
                            <div className="event-detail-section">
                                {event?.teacher_profile?.avatar_profile && (
                                    <div className="expert-avatar">
                                        <a 
                                            href={event.teacher_profile.profile_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            title="Профиль преподавателя"
                                        >
                                            <img
                                                src={event.teacher_profile.avatar_profile}
                                                alt={event.teacher_full_name || 'Преподаватель'}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </a>
                                    </div>
                                )}
                                <div className="event-info-list">
                                    {event.teacher_full_name && (
                                        <div className="event-info-row">
                                            <span className="info-icon">👨‍🏫</span>
                                            <div className="info-content">
                                                <span className="info-label">Преподаватель:</span>
                                                <span className="info-value">{event.teacher_full_name}</span>
                                            </div>
                                        </div>
                                    )}
                                    {event.course_name && (
                                        <div className="event-info-row">
                                            <span className="info-icon">📚</span>
                                            <div className="info-content">
                                                <span className="info-label">Курс:</span>
                                                <span className="info-value">{event.course_name}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {(event.type === 'lms' || event.source === 'utmn') && (
                            <div className="event-detail-section">
                                <div className="event-info-list">
                                    {event.course_name && (
                                        <div className="event-info-row">
                                            <span className="info-icon">📚</span>
                                            <div className="info-content">
                                                <span className="info-label">Курс:</span>
                                                <span className="info-value">{event.course_name}</span>
                                            </div>
                                        </div>
                                    )}
                                    {event.modname && (
                                        <div className="event-info-row">
                                            <span className="info-icon">📖</span>
                                            <div className="info-content">
                                                <span className="info-label">Тип:</span>
                                                <span className="info-value">
                                                    {event.modname === 'assign' ? 'Задание' :
                                                     event.modname === 'quiz' ? 'Тест' :
                                                     event.modname === 'forum' ? 'Форум' :
                                                     event.modname === 'workshop' ? 'Семинар' :
                                                     event.modname}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Кнопка действия */}
                    {eventUrl && (
                        <div className="event-modal-action">
                            <a 
                                href={eventUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`event-action-btn ${buttonClass}`}
                            >
                                <span>Перейти к событию</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventModal;