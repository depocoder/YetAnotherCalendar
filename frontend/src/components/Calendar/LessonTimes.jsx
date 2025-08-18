import React, {useEffect, useState, useCallback} from 'react';
import camera from "../../img/camera.png";
//import {formatHours} from "../../utils/dateUtils";
import { utcToZonedTime } from 'date-fns-tz';

export function formatDateToAMPM(date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}

const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

// Массив временных интервалов пар, начиная с 10:00
const lessonTimesArrayUTC = [
    "7:00 8:30", // 1 пара
    "9:00 10:30", // 2 пара
    "10:45 12:15", // 3 пара
    "12:30 14:00", // 4 пара
    "14:10 15:40", // 5 пара
    "15:50 17:20"  // 6 пара
];

const SpecialTimingEventsRow = ({ unrenderedEvents, selectedEvent, setSelectedEvent }) => {
    if (!unrenderedEvents || unrenderedEvents.length === 0) return null;

    // Group unrendered events by day
    const eventsByDay = Array.from({length: 7}, () => []);
    unrenderedEvents.forEach(event => {
        eventsByDay[event.dayOfWeek].push(event);
    });

    return (
        <tr className="special-timing-events-row">
            <th className="vertical-heading special-timing-header">
                Особое время<br/>
                <small>({unrenderedEvents.length})</small>
            </th>
            {eventsByDay.map((dayEvents, dayIndex) => (
                <td key={dayIndex} className="special-timing-events-cell">
                    {dayEvents.map((event, eventIndex) => (
                        <div
                            key={eventIndex}
                            className={`event-item special-timing-event ${event.type === 'modeus' ? 'TyumGU-lesson' : 'netology-lesson'} ${event.endTime < new Date() ? 'past' : ''}`}
                            onClick={() => {
                                if (selectedEvent && selectedEvent.id === event?.id) {
                                    setSelectedEvent(null);
                                } else {
                                    setSelectedEvent(event);
                                }
                            }}
                        >
                            <div className="event-time-badge">
                                <div className="time-start">{formatDateToAMPM(event.startTime)}</div>
                                <div className="time-separator">—</div>
                                <div className="time-end">{formatDateToAMPM(event.endTime)}</div>
                            </div>
                            {event.type === "modeus" ? (
                                <div className="company-name">
                                    <span><img src={camera} alt="camera"/> ТюмГУ </span>
                                    <span>{event?.cycle_realization?.code}</span>
                                </div>
                            ) : (
                                <span className="company-name">
                                    <img src={camera} alt="camera"/> Нетология <br/>
                                </span>
                            )}
                            <div className="lesson-name">{event?.course_name || event?.block_title || event?.title}</div>
                            {event.title && event.block_title && (
                                <div className="lesson-subtitle">{event.title}</div>
                            )}
                        </div>
                    ))}
                </td>
            ))}
        </tr>
    );
};

const EventCell = ({ lesson, selectedEvent, setSelectedEvent }) => (
    <td className="vertical" onClick={() => {
        if (selectedEvent && selectedEvent.id === lesson?.id) {
            setSelectedEvent(null); // Close the modal if the same lesson is clicked
        } else {
            setSelectedEvent(lesson); // Set the selected lesson
        }
    }}>
        {lesson ? (
            <div className={`event-item ${lesson.type === 'modeus' ? 'TyumGU-lesson' : 'netology-lesson'} ${lesson.endTime < new Date() ? 'past' : ''}`}>
                {lesson.type === "modeus" ? (
                    <div className="company-name">
                        <span><img src={camera} alt="camera"/> ТюмГУ </span>
                        <span>{lesson?.cycle_realization?.code}</span>
                    </div>
                ) : (
                    <span className="company-name">
                        <img src={camera} alt="camera"/> Нетология <br/>
                    </span>
                )}
                <div className="lesson-name">{lesson?.course_name || lesson?.block_title}</div>
            </div>
        ) : (
            <div className="no-lessons"></div>
        )}
    </td>
);

const TimeSlotRow = ({ timeSlot, index, weekDays, selectedEvent, setSelectedEvent, userTimezone }) => {
    const [slotStartRaw, slotEndRaw] = timeSlot.split(' ');

    const slotStartDate = new Date(Date.UTC(2024, 0, 1, ...slotStartRaw.split(':')));
    const slotEndDate = new Date(Date.UTC(2024, 0, 1, ...slotEndRaw.split(':')));

    const slotStartLocal = utcToZonedTime(slotStartDate, userTimezone);
    const slotEndLocal = utcToZonedTime(slotEndDate, userTimezone);

    const slotStartMinutesUTC = parseTime(slotStartRaw);
    const slotEndMinutesUTC = parseTime(slotEndRaw);

    const displayedTime = `${formatDateToAMPM(slotStartLocal)}-${formatDateToAMPM(slotEndLocal)}`;

    return (
        <tr key={index}>
            <th className="vertical-heading">{index + 1} пара <br/> {displayedTime}</th>
            {weekDays.map((lessons, dayIndex) => {
                const lesson = lessons.find(l => {
                    const overlap = Math.min(l.endMinutesUTC, slotEndMinutesUTC) - Math.max(l.startMinutesUTC, slotStartMinutesUTC);
                    const slotDuration = slotEndMinutesUTC - slotStartMinutesUTC;
                    const hasGoodOverlap = overlap >= slotDuration * 0.5;
                    
                    // Only show events that have good overlap AND are marked as rendered (belong in regular slots)
                    return hasGoodOverlap && l.rendered === true;
                });
                return <EventCell key={dayIndex} lesson={lesson} selectedEvent={selectedEvent} setSelectedEvent={setSelectedEvent} />;
            })}
        </tr>
    );
};

const LessonTimes = ({ events, selectedEvent, setSelectedEvent }) => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const [weekDays, setWeekDays] = useState(Array.from({length: 7}, () => []));
    const [unrenderedEvents, setUnrenderedEvents] = useState([]);

    // console.log('events', events)

    // Получаем преобразованные времена уроков
    const lessonTimesArray = lessonTimesArrayUTC;
    const populateWeekDays = useCallback((events) => {
        if (!events) return;
        const newWeekDays = Array.from({length: 7}, () => []);
        const allEvents = [];

        const processEvent = (event, type) => {
            const startUTC = new Date(event.start || event.starts_at);
            const endUTC = new Date(event.end || event.ends_at);
            const localDate = utcToZonedTime(startUTC, userTimezone);

            let dayOfWeek = (localDate.getDay() + 6) % 7; // Понедельник — 0
            if (localDate.getHours() < 3) {
                dayOfWeek = (dayOfWeek + 6) % 7; // If it's early morning, count it as the previous day
            }

            const processedEvent = {
                ...event,
                startTime: utcToZonedTime(startUTC, userTimezone),
                endTime: utcToZonedTime(endUTC, userTimezone),
                startMinutesUTC: startUTC.getUTCHours() * 60 + startUTC.getUTCMinutes(),
                endMinutesUTC: endUTC.getUTCHours() * 60 + endUTC.getUTCMinutes(),
                type,
                dayOfWeek,
                rendered: false, // Track if this event gets rendered
            };

            newWeekDays[dayOfWeek].push(processedEvent);
            allEvents.push(processedEvent);
        };

        events?.utmn?.modeus_events?.forEach(lesson => processEvent(lesson, 'modeus'));
        events?.netology?.webinars?.forEach(webinar => processEvent(webinar, 'netology'));

        // Determine which events fit into standard time slots
        lessonTimesArrayUTC.forEach(timeSlot => {
            const [slotStartRaw, slotEndRaw] = timeSlot.split(' ');
            const slotStartMinutesUTC = parseTime(slotStartRaw);
            const slotEndMinutesUTC = parseTime(slotEndRaw);

            newWeekDays.forEach(dayLessons => {
                const lesson = dayLessons.find(l => {
                    const eventStart = l.startMinutesUTC;
                    const eventEnd = l.endMinutesUTC;
                    
                    // Event must start within ±15 minutes of slot start
                    const startWithinRange = eventStart >= (slotStartMinutesUTC - 15) && 
                                           eventStart <= (slotStartMinutesUTC + 15);
                    
                    // And have at least 50% overlap with the slot
                    const overlap = Math.min(eventEnd, slotEndMinutesUTC) - Math.max(eventStart, slotStartMinutesUTC);
                    const slotDuration = slotEndMinutesUTC - slotStartMinutesUTC;
                    const hasGoodOverlap = overlap >= slotDuration * 0.5;
                    
                    return startWithinRange && hasGoodOverlap;
                });
                if (lesson) {
                    lesson.rendered = true;
                }
            });
        });

        // Separate events that don't fit into standard time slots
        const unrendered = allEvents.filter(event => !event.rendered);
        
        if (unrendered.length > 0) {
            console.log(`📊 Found ${unrendered.length} events with special timing that don't fit standard time slots`);
        }
        
        setWeekDays(newWeekDays); // Сохраняем обновленный массив дней недели в состоянии
        setUnrenderedEvents(unrendered);
    }, [userTimezone]);

    useEffect(() => {
        populateWeekDays(events);
    }, [events]);

    return (
        <>
            {lessonTimesArray.map((timeSlot, index) => (
                <TimeSlotRow
                    key={index}
                    timeSlot={timeSlot}
                    index={index}
                    weekDays={weekDays}
                    selectedEvent={selectedEvent}
                    setSelectedEvent={setSelectedEvent}
                    userTimezone={userTimezone}
                />
            ))}
            <SpecialTimingEventsRow
                unrenderedEvents={unrenderedEvents}
                selectedEvent={selectedEvent}
                setSelectedEvent={setSelectedEvent}
            />
        </>
    );
};

export default LessonTimes;