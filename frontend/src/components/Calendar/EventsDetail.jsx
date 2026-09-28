import React, { useState, useEffect } from 'react';
import arrowGreen from "../../img/ArrowGreen.svg";
import arrowPink from "../../img/ArrowPink.svg";
import arrowViolet from "../../img/ArrowViolet.svg";
import { formatDate } from "../../utils/dateUtils";
import LessonGrade, { ModeusCourseName } from "./LessonGrade";
import LmsCard from "./LmsCard";
import ExternalLink from "./ExternalLink";
import { netologyProgramLinks } from "../../utils/grades";
import NetologyTaskReview from "./NetologyTaskReview";

const EventsDetail = ({ event, mtsUrls = {}, onOpenGrades }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        // Таймер прежнего события сбрасываем: иначе закрыть и быстро открыть
        // карточку — и запоздалое «убрать из DOM» спрячет уже открытую.
        let timer;
        if (event) {
            setShouldRender(true);
            // Небольшая задержка для плавной анимации появления
            timer = setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
            // Ждем завершения анимации перед удалением из DOM
            timer = setTimeout(() => setShouldRender(false), 300);
        }
        return () => clearTimeout(timer);
    }, [event]);

    if (!shouldRender) return null;


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
        if (event.type === 'modeus') {
            return {
                label: 'ТюмГУ',
                icon: arrowViolet,
                date: event.start,
            };
        }
        if (event.source === 'utmn') {
            return {
                label: 'ТюмГу',
                icon: arrowPink,
                date: event.dt_end,
            };
        }
        return {
            label: 'Неизвестный источник',
            icon: arrowPink,
            date: '',
        };
    };

    // Проверяем, что event существует перед вызовом getSourceInfo
    const sourceInfo = event ? getSourceInfo() : null;

    // Функция для получения цвета кнопки в зависимости от типа события
    const getEventButtonColor = () => {
        if (event.type === 'netology') {
            return '#00A8A8'; // Teal
        }
        if (['quiz', 'task', 'test'].includes(event.type)) {
            return '#3492c5'; // Blue
        }
        if (event.type === 'modeus') {
            return '#7B61FF'; // Purple
        }
        if (event.source === 'utmn') {
            return '#f46386'; // Pink
        }
        return '#7B61FF'; // Default purple
    };

    const buttonColor = event ? getEventButtonColor() : '#7B61FF';

    // URL кнопки «Перейти». У Modeus ведем через наш редирект (mts_url): он
    // считает переходы и перекидывает на тот же вебинар. mtsUrls нужен только
    // чтобы понять, оставил ли преподаватель ссылку.
    // Повторный клик по той же паре снимает выбор: event уже null, а панель
    // еще доигрывает анимацию закрытия — тогда кнопки нет.
    let eventUrl = null;
    if (event?.type === 'modeus') {
        eventUrl = mtsUrls[event.id] ? (event.mts_url || mtsUrls[event.id]) : null;
    } else if (event) {
        eventUrl = event.url || event.video_url || event.webinar_url;
    }

    return (
        <div className={`rectangle ${isVisible ? 'rectangle-visible' : 'rectangle-hidden'}`}>
            {event && sourceInfo && (
                <div className={`rectangle-info ${event.type || event.source} ${eventUrl ? 'has-link' : ''}`}>
                    {/* Отображение источника события */}
                    <div className="source">
                        {sourceInfo.label}
                        <span className="date-event">
                            <img src={sourceInfo.icon} alt="Arrow" />
                            {formatDate(sourceInfo.date)}
                        </span>
                    </div>

                    {/* Название события */}
                    <div className="name-event">
                        <span className="name-event-text name-event-text--no-link">
                            {event.title || event.name}
                        </span>
                    </div>

                {/* Дополнительная информация */}
                {event.type === 'netology' && (
                    <div className="task-event">
                        <div className="netology-info-container">
                            {event?.experts?.[0]?.avatar_path && (
                                <div className="avatar_path">
                                    <img
                                        src={event?.experts?.[0]?.avatar_path}
                                        alt={event?.experts?.[0]?.full_name || 'Преподаватель'}
                                    />
                                </div>
                            )}
                            <div className="netology-text-info">
                                {event?.experts?.[0]?.full_name && (
                                    <div className="netology-info-row">
                                        <span className="netology-label">👨‍🏫 Преподаватель: <span className="netology-value">{event.experts[0].full_name}</span></span>
                                    </div>
                                )}
                                {event.block_title && (
                                    <div className="netology-info-row">
                                        <span className="netology-label">📚 Курс: <span className="netology-value">{event.block_title}</span></span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {['quiz', 'task', 'test'].includes(event.type) && event.type !== 'netology' && (
                    <div className="task-event">
                        <span className="task-event-text">
                            {event.block_title ? (
                                <ExternalLink href={netologyProgramLinks(event.url).course} title="Курс в Нетологии">
                                    {event.block_title}
                                </ExternalLink>
                            ) : 'Название предмета не указано'}
                        </span>
                        <NetologyTaskReview event={event} variant="detail" />

                    </div>
                )}
                {event.type === 'modeus' && (
                    <div className="task-event">
                        <div className="netology-info-container">
                            {event?.teacher_profile?.avatar_profile && (
                                <div className="avatar_path">
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
                            <div className="netology-text-info">
                                {event.teacher_full_name && (
                                    <div className="netology-info-row">
                                        <span className="netology-label">👨‍🏫 Преподаватель: <span className="netology-value">{event.teacher_full_name}</span></span>
                                    </div>
                                )}
                                {event.course_name && (
                                    <div className="netology-info-row">
                                        <span className="netology-label">📚 Курс: <span className="netology-value"><ModeusCourseName event={event} /></span></span>
                                    </div>
                                )}
                                <LessonGrade event={event} onOpenGrades={onOpenGrades} />
                            </div>
                        </div>
                    </div>
                )}
                {event.source === 'utmn' && (
                    <div className="task-event">
                        <LmsCard event={event} />
                    </div>
                )}

                {/* Кнопка перехода к уроку в правом нижнем углу — только если есть URL */}
                {eventUrl && (
                    <div className="lesson-button-container">
                        <a
                            href={eventUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="lesson-button"
                            style={{
                                '--button-color': buttonColor
                            }}
                        >
                            Перейти ➜
                        </a>
                    </div>
                )}
                </div>
            )}
        </div>
    );
};

export default EventsDetail;