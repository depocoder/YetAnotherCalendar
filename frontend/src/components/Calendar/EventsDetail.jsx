import React from 'react';
import arrowImage from "../../img/arrow.png";
import {formatDate} from "../../utils/dateUtils";


const EventsDetail = ({ event }) => {
    return (
        <div className="rectangle">
            {event && (
                <div className={`rectangle-info ${event.type === 'task' ? 'task' : event.type === 'test' ? 'test' : event.type === 'modeus' ? 'modeus' : event.type === 'netology' ? 'netology' : ''}`}>
                    {((event.type === 'task') || (event.type === 'test')) && (
                        <>
                            <div className="source">
                                <span className="source-first-word">Событие:</span> {event.block_title}
                                <span className="date-event">
                                <img src={arrowImage} alt={arrowImage}/> {formatDate(event.start || event.deadline)}
                            </span>
                            </div>
                            <div className="name-event">
                                <a href={event?.url}>
                                    <span className="name-event-text">{event.title}</span>
                                </a>
                            </div>
                            {/*<div className="task-event">*/}
                            {/*   <span className="task-event-text">*/}
                            {/*      Преподаватель: {event.teacher_full_name || 'Не указано'}*/}
                            {/*   </span>*/}
                            {/*</div>*/}
                        </>
                    )}
                    {event.type === 'modeus' && (
                        <>
                            <div className="source">
                                <span className="source-first-word">Событие:</span> {event.nameShort || event.title}
                                <span className="date-event">
                            <img src={arrowImage} alt={arrowImage}/> {/* Используйте новое имя переменной здесь */}
                                    {formatDate(event.start || event.deadline)}
                        </span>
                            </div>
                            <div className="name-event">
                                <span className="name-event-text">{event.name || 'Информация недоступна'}</span>
                            </div>
                            <div className="task-event">
                        <span className="task-event-text">
                            Преподаватель: {event.teacher_full_name || 'Не указано'}
                        </span>
                            </div>
                        </>
                    )}
                    {event.type === 'netology' && (
                        <>
                            <div className="source">
                                <span className="source-first-word">Событие:</span> {event.nameShort || event.title}
                                <span className="date-event">
                            <img src={arrowImage} alt={arrowImage}/> {/* Используйте новое имя переменной здесь */}
                                    {formatDate(event.start || event.deadline)}
                        </span>
                            </div>
                            <div className="name-event">
                                <span className="name-event-text">{event.name || 'Информация недоступна'}</span>
                            </div>
                            <div className="task-event">
                        <span className="task-event-text">
                            Преподаватель: {event.teacher_full_name || 'Не указано'}
                        </span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default EventsDetail;
