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
                    return overlap >= slotDuration * 0.5;
                });
                return <EventCell key={dayIndex} lesson={lesson} selectedEvent={selectedEvent} setSelectedEvent={setSelectedEvent} />;
            })}
        </tr>
    );
};

const LessonTimes = ({ events, selectedEvent, setSelectedEvent }) => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const [weekDays, setWeekDays] = useState(Array.from({length: 7}, () => []));

    // console.log('events', events)

    // Получаем преобразованные времена уроков
    const lessonTimesArray = lessonTimesArrayUTC;
    const populateWeekDays = useCallback((events) => {
        if (!events) return;
        const newWeekDays = Array.from({length: 7}, () => []);

        const processEvent = (event, type) => {
            const startUTC = new Date(event.start || event.starts_at);
            const endUTC = new Date(event.end || event.ends_at);
            const localDate = utcToZonedTime(startUTC, userTimezone);

            let dayOfWeek = (localDate.getDay() + 6) % 7; // Понедельник — 0
            if (localDate.getHours() < 3) {
                dayOfWeek = (dayOfWeek + 6) % 7; // If it's early morning, count it as the previous day
            }

            newWeekDays[dayOfWeek].push({
                ...event,
                startTime: utcToZonedTime(startUTC, userTimezone),
                endTime: utcToZonedTime(endUTC, userTimezone),
                startMinutesUTC: startUTC.getUTCHours() * 60 + startUTC.getUTCMinutes(),
                endMinutesUTC: endUTC.getUTCHours() * 60 + endUTC.getUTCMinutes(),
                type,
            });
        };

        events?.utmn?.modeus_events?.forEach(lesson => processEvent(lesson, 'modeus'));
        events?.netology?.webinars?.forEach(webinar => processEvent(webinar, 'netology'));

        setWeekDays(newWeekDays); // Сохраняем обновленный массив дней недели в состоянии
    }, []);

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
        </>
    );
};

export default LessonTimes;