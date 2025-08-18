import React, { useState, useEffect } from 'react';
import arrowGreen from "../../img/ArrowGreen.svg";
import arrowPink from "../../img/ArrowPink.svg";
import arrowViolet from "../../img/ArrowViolet.svg";
import { formatDate } from "../../utils/dateUtils";

const EventsDetail = ({ event }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (event) {
            setShouldRender(true);
            // Небольшая задержка для плавной анимации появления
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
            // Ждем завершения анимации перед удалением из DOM
            setTimeout(() => setShouldRender(false), 300);
        }
    }, [event]);

    if (!shouldRender) return null;

    // console.log('event', event);

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
                label: 'Modeus',
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

    return (
        <div className={`rectangle ${isVisible ? 'rectangle-visible' : 'rectangle-hidden'}`}>
            {event && sourceInfo && (
                <div className={`rectangle-info ${event.type || event.source}`}>
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
                        <a href={event.url || event.video_url || event.webinar_url} target="_blank" rel="noopener noreferrer">
                            <span className="name-event-text">{event.title || event.name}</span>
                        </a>
                    </div>

                {/* Дополнительная информация */}
                {event.type === 'netology' && (
                    <div className="task-event">
                        <div className='persona_container'>
                            <div className="avatar_path">
                                <img
                                    src={event?.experts?.[0]?.avatar_path}
                                    alt={event?.experts?.[0]?.full_name || 'Преподаватель'}
                                />
                            </div>
                            <span className="task-event-text">
                                Преподаватель: {event?.experts?.[0]?.full_name || 'Не указано'}
                            </span>
                        </div>
                    </div>
                )}
                {['quiz', 'task', 'test'].includes(event.type) && event.type !== 'netology' && (
                    <div className="task-event">
                        <span className="task-event-text">
                            {event.block_title || 'Название предмета не указано'}
                        </span>
                        <br/>
                        <span className="task-event-text">
                            Пройдено: {event.passed ? '✅' : '❌'}
                        </span>

                    </div>
                )}
                {event.type === 'modeus' && (
                    <div className="task-event">
                        <span className="task-event-text">
                            Преподаватель: {event.teacher_full_name || 'Не указано'}
                        </span>
                        <span className="task-event-text">
                            Цикл: {event.cycle_realization?.name || 'Не указано'}
                        </span>
                    </div>
                )}
                {event.source === 'utmn' && (
                    <div className="task-event">
                        <span className="task-event-text">
                            Курс: {event.course_name || 'Не указано'}
                        </span>
                        <span className="task-event-text">
                            Модуль: {event.modname || 'Не указано'}
                        </span>
                        <span className="task-event-text">
                            Статус: {event.is_completed ? 'Завершено' : 'В процессе'}
                        </span>
                    </div>
                )}
                </div>
            )}
        </div>
    );
};

export default EventsDetail;