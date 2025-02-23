import React from 'react';
import arrowGreen from "../../img/ArrowGreen.svg";
import arrowPink from "../../img/ArrowPink.svg";
import arrowViolet from "../../img/ArrowViolet.svg";
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
                                {event.block_title}
                                <span className="date-event">
                                <img src={arrowPink} alt={arrowPink}/> {formatDate(event.start || event.deadline)}
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
                                {event?.nameShort} {event?.cycle_realization?.code}
                                <span className="date-event">
                                   <img src={arrowViolet} alt={arrowViolet}/> {formatDate(event.start)}
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
                            <a href={event?.video_url || event?.webinar_url}>
                                <div className="source">
                                    {event.block_title}
                                    <span className="date-event">
                                    <img src={arrowGreen} alt={arrowGreen}/> {formatDate(event.starts_at)}
                                </span>
                                </div>
                                <div className="name-event">
                                    <span className="name-event-text">{event.title}</span>
                                </div>
                            </a>
                            <div className="task-event">
                                <div className='persona_container'>
                                    <div className="avatar_path">
                                        <img src={event?.experts[0]?.avatar_path}
                                             alt={event?.experts[0]?.full_name}/>
                                    </div>
                                    <span className="task-event-text">
                                <span
                                    className="source-first-word">Преподаватель:</span> {event?.experts[0]?.full_name || 'Не указано'}
                                </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default EventsDetail;
