import React from 'react';
import { formatDateToAMPM } from './LessonTimes';
import camera from "../../img/camera.png";

const MobileCalendarView = ({ 
    events, 
    selectedEvent, 
    setSelectedEvent, 
    date 
}) => {
    if (!events) return null;

    // Days of the week (Monday = 0)
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const weekDaysEvents = Array.from({length: 7}, () => []);

    // Process all events and group by day
    const processEvents = () => {
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const allEvents = [];

        // Process Modeus events
        events?.utmn?.modeus_events?.forEach(event => {
            const startTime = new Date(event.start);
            const endTime = new Date(event.end);
            const localStartTime = new Date(startTime.toLocaleString("en-US", {timeZone: userTimezone}));
            
            let dayOfWeek = (localStartTime.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
            if (localStartTime.getHours() < 3) {
                dayOfWeek = (dayOfWeek + 6) % 7; // Early morning counts as previous day
            }

            allEvents.push({
                ...event,
                type: 'modeus',
                startTime: localStartTime,
                endTime: new Date(endTime.toLocaleString("en-US", {timeZone: userTimezone})),
                dayOfWeek
            });
        });

        // Process Netology events
        events?.netology?.webinars?.forEach(event => {
            const startTime = new Date(event.starts_at);
            const endTime = new Date(event.ends_at);
            const localStartTime = new Date(startTime.toLocaleString("en-US", {timeZone: userTimezone}));
            
            let dayOfWeek = (localStartTime.getDay() + 6) % 7;
            if (localStartTime.getHours() < 3) {
                dayOfWeek = (dayOfWeek + 6) % 7;
            }

            allEvents.push({
                ...event,
                type: 'netology',
                startTime: localStartTime,
                endTime: new Date(endTime.toLocaleString("en-US", {timeZone: userTimezone})),
                dayOfWeek
            });
        });

        // Process Netology deadlines and tasks
        ['quizzes', 'tasks', 'tests']?.forEach(taskType => {
            events?.netology?.[taskType]?.forEach(event => {
                const deadline = new Date(event.deadline);
                const localDeadlineTime = new Date(deadline.toLocaleString("en-US", {timeZone: userTimezone}));
                
                let dayOfWeek = (localDeadlineTime.getDay() + 6) % 7;
                if (localDeadlineTime.getHours() < 3) {
                    dayOfWeek = (dayOfWeek + 6) % 7;
                }

                allEvents.push({
                    ...event,
                    type: taskType.slice(0, -1), // quiz, task, test (singular)
                    startTime: localDeadlineTime,
                    endTime: localDeadlineTime,
                    dayOfWeek,
                    title: event.name || event.title, // Add both name and title for consistency
                    name: event.name || event.title,   // Ensure name is also available
                    isDeadline: true,
                    source: 'netology'
                });
            });
        });

        // Process Netology homework
        events?.netology?.homework?.forEach(event => {
            const deadline = new Date(event.deadline);
            const localDeadlineTime = new Date(deadline.toLocaleString("en-US", {timeZone: userTimezone}));
            
            let dayOfWeek = (localDeadlineTime.getDay() + 6) % 7;
            if (localDeadlineTime.getHours() < 3) {
                dayOfWeek = (dayOfWeek + 6) % 7;
            }

            allEvents.push({
                ...event,
                type: 'homework',
                startTime: localDeadlineTime,
                endTime: localDeadlineTime,
                dayOfWeek,
                title: event.name || event.title, // Add both name and title for consistency
                name: event.name || event.title,   // Ensure name is also available
                isDeadline: true,
                source: 'netology'
            });
        });

        // Process UTMN LMS events
        events?.utmn?.lms_events?.forEach(event => {
            const deadline = new Date(event.dt_end);
            const localDeadlineTime = new Date(deadline.toLocaleString("en-US", {timeZone: userTimezone}));
            
            let dayOfWeek = (localDeadlineTime.getDay() + 6) % 7;
            if (localDeadlineTime.getHours() < 3) {
                dayOfWeek = (dayOfWeek + 6) % 7;
            }

            allEvents.push({
                ...event,
                type: 'lms',
                startTime: localDeadlineTime,
                endTime: localDeadlineTime,
                dayOfWeek,
                title: event.name || event.title, // Add both name and title for consistency
                name: event.name || event.title,   // Ensure name is also available
                isDeadline: true,
                source: 'utmn'
            });
        });

        // Group events by day
        allEvents.forEach(event => {
            if (event.dayOfWeek >= 0 && event.dayOfWeek < 7) {
                weekDaysEvents[event.dayOfWeek].push(event);
            }
        });

        // Sort events within each day by start time
        weekDaysEvents.forEach(dayEvents => {
            dayEvents.sort((a, b) => a.startTime - b.startTime);
        });
    };

    processEvents();

    const handleEventClick = (event) => {
        if (selectedEvent && selectedEvent.id === event.id) {
            setSelectedEvent(null);
        } else {
            setSelectedEvent(event);
        }
    };

    const getCurrentDate = (dayIndex) => {
        const startDate = new Date(date.start);
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + dayIndex);
        return targetDate.getDate().toString().padStart(2, '0');
    };

    const getCurrentMonth = (dayIndex) => {
        const startDate = new Date(date.start);
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + dayIndex);
        return (targetDate.getMonth() + 1).toString().padStart(2, '0');
    };

    const isToday = (dayIndex) => {
        const today = new Date();
        const startDate = new Date(date.start);
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + dayIndex);
        
        return today.toDateString() === targetDate.toDateString();
    };

    const isPast = (dayIndex) => {
        const today = new Date();
        const startDate = new Date(date.start);
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + dayIndex);
        
        return targetDate < today && !isToday(dayIndex);
    };

    return (
        <div className="mobile-calendar">
            {weekDaysEvents.map((dayEvents, dayIndex) => (
                <div 
                    key={dayIndex} 
                    className={`mobile-day ${isToday(dayIndex) ? 'mobile-day-today' : ''} ${isPast(dayIndex) ? 'mobile-day-past' : ''}`}
                >
                    <div className="mobile-day-header">
                        <div className="mobile-day-name">
                            {weekDays[dayIndex]} {getCurrentDate(dayIndex)}.{getCurrentMonth(dayIndex)}
                        </div>
                    </div>
                    
                    <div className="mobile-day-events">
                        {dayEvents.length === 0 ? (
                            <div className="mobile-no-events">
                                <span>Нет событий</span>
                            </div>
                        ) : (
                            dayEvents.map((event, eventIndex) => (
                                <div
                                    key={eventIndex}
                                    className={`mobile-event ${
                                        event.type === 'modeus' ? 'mobile-event-modeus' : 
                                        ['quiz', 'task', 'test', 'homework'].includes(event.type) ? 'mobile-event-task' :
                                        event.type === 'lms' || event.source === 'utmn' ? 'mobile-event-utmn' :
                                        'mobile-event-netology'
                                    } ${event.endTime < new Date() ? 'mobile-event-past' : ''} ${event.isDeadline ? 'mobile-event-deadline' : ''}`}
                                    onClick={() => handleEventClick(event)}
                                >
                                    <div className="mobile-event-time">
                                        {event.isDeadline ? (
                                            <span className="mobile-event-deadline-label">Дедлайн</span>
                                        ) : (
                                            <>
                                                <span className="mobile-event-start">
                                                    {formatDateToAMPM(event.startTime)}
                                                </span>
                                                <span className="mobile-event-separator">—</span>
                                                <span className="mobile-event-end">
                                                    {formatDateToAMPM(event.endTime)}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    
                                    <div className="mobile-event-content">
                                        <div className="mobile-event-source">
                                            <img src={camera} alt="camera" className="mobile-event-icon" />
                                            <span>
                                                {event.type === 'modeus' ? 'ТюмГУ' : 
                                                 event.type === 'quiz' ? 'Тест' :
                                                 event.type === 'task' ? 'Задача' :
                                                 event.type === 'test' ? 'Тестирование' :
                                                 event.type === 'homework' ? 'Домашнее задание' :
                                                 event.type === 'lms' || event.source === 'utmn' ? 'ТюмГу LXP' :
                                                 'Нетология'}
                                            </span>
                                        </div>
                                        
                                        <div className="mobile-event-title">
                                            {event?.course_name || event?.block_title || event?.title || event?.name}
                                        </div>
                                        
                                        {event.type === 'modeus' && event?.cycle_realization?.code && (
                                            <div className="mobile-event-code">
                                                {event.cycle_realization.code}
                                            </div>
                                        )}
                                        
                                    </div>
                                    
                                    <div className="mobile-event-arrow">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MobileCalendarView;