import React from 'react';
import arrowImage from "../../img/arrow.png";
import {formatDate} from "../../utils/dateUtils";


const EventsDetail = ({ event }) => {
    // console.log('event', event)
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
                                <span className="source-first-word">Событие:</span> {event?.nameShort} {event?.cycle_realization?.code}
                                <span className="date-event">
                                   <img src={arrowImage} alt={arrowImage}/> {formatDate(event.start)}
                                </span>
                            </div>
                            <div className="name-event">
                                <>
                                    <span className="name-event-text">{event?.name}</span> <br/>
                                    <span className="name-event-text">{event?.cycle_realization?.name}</span>
                                </>
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
                                <span className="source-first-word">Событие:</span> {event.block_title}
                                <span className="date-event">
                                    <img src={arrowImage} alt={arrowImage}/> {formatDate(event.starts_at)}
                                </span>
                            </div>
                            <div className="name-event">
                                <span className="name-event-text">{event.title}</span>
                            </div>
                            <div className="task-event">
                                <img className="avatar_path" src={event?.experts[0]?.avatar_path}
                                     alt={event?.experts[0]?.full_name}/>
                                <span className="task-event-text">
                                    Преподаватель: {event?.experts[0]?.full_name || 'Не указано'}
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
