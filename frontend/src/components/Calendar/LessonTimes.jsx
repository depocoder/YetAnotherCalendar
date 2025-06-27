import React, {useEffect, useState} from 'react';
import camera from "../../img/camera.png";
//import {formatHours} from "../../utils/dateUtils";
import { utcToZonedTime } from 'date-fns-tz';

export function formatDateToAMPM(date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}

const LessonTimes = ({ events, selectedEvent, setSelectedEvent }) => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const [weekDays, setWeekDays] = useState(Array.from({length: 7}, () => []));

    // console.log('events', events)

    // Массив временных интервалов пар, начиная с 10:00
    const lessonTimesArrayUTC = [
        "7:00 8:30", // 1 пара
        "9:00 10:30", // 2 пара
        "10:45 12:15", // 3 пара
        "12:30 14:00", // 4 пара
        "14:10 15:40", // 5 пара
        "15:50 17:20"  // 6 пара
    ];

    // Получаем преобразованные времена уроков
    const lessonTimesArray = lessonTimesArrayUTC;
    const populateWeekDays = (events) => {
        if (!events) return;
        const newWeekDays = Array.from({length: 7}, () => []);
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Хелпер: смещает день назад, если пара началась ночью
        const getAdjustedDayOfWeek = (date) => {
            const localDate = utcToZonedTime(date, userTimezone);
            if (localDate.getHours() < 3) {
                localDate.setDate(localDate.getDate() - 1);
            }
            return (localDate.getDay() + 6) % 7; // Понедельник — 0
        };

        // Заполнение массива дней недели занятиями
        if (events?.utmn?.modeus_events) {
            events.utmn.modeus_events.forEach((lesson) => {
                const startUTC = new Date(lesson.start);
                const endUTC = new Date(lesson.end);

                const dayOfWeek = getAdjustedDayOfWeek(startUTC);

                newWeekDays[dayOfWeek].push({
                    ...lesson,
                    startTime: utcToZonedTime(startUTC, userTimezone),
                    endTime: utcToZonedTime(endUTC, userTimezone),
                    type: 'modeus' // Добавляем тип события
                });
            });
        }

        // Заполнение массива дней недели вебинарами netology
        if (events?.netology?.webinars) {
            events.netology.webinars.forEach((webinar) => {
                const startUTC = new Date(webinar.starts_at);
                const endUTC = new Date(webinar.ends_at);

                const dayOfWeek = getAdjustedDayOfWeek(startUTC);

                newWeekDays[dayOfWeek].push({
                    ...webinar,
                    startTime: utcToZonedTime(startUTC, userTimezone),
                    endTime: utcToZonedTime(endUTC, userTimezone),
                    type: 'netology' // Добавляем тип события
                });
            });
        }

        setWeekDays(newWeekDays); // Сохраняем обновленный массив дней недели в состоянии
    };

    useEffect(() => {
        populateWeekDays(events);
    }, [events]);

    return (
        <>
            {lessonTimesArray.map((timeSlot, index) => {
                const [slotStartRaw, slotEndRaw] = timeSlot.split(' ');

                const [startH, startM] = slotStartRaw.split(':');
                const [endH, endM] = slotEndRaw.split(':');

                const slotStartDate = new Date(Date.UTC(2024, 0, 1, startH, startM));
                const slotEndDate = new Date(Date.UTC(2024, 0, 1, endH, endM));

                const slotStartLocal = utcToZonedTime(slotStartDate, userTimezone);
                const slotEndLocal = utcToZonedTime(slotEndDate, userTimezone);

                const slotStartMinutesUTC = parseInt(startH) * 60 + parseInt(startM);
                const slotEndMinutesUTC = parseInt(endH) * 60 + parseInt(endM);

                const displayedTime = `${formatDateToAMPM(slotStartLocal)}-${formatDateToAMPM(slotEndLocal)}`;

                return (
                    <tr key={index}>
                        <th className="vertical-heading">{index + 1} пара <br/> {displayedTime}</th>
                        {weekDays.map((lessons, dayIndex) => {
                            const lesson = lessons.find(lesson => {
                                const lessonStartUTC = new Date(lesson.start || lesson.starts_at);
                                const lessonEndUTC = new Date(lesson.end || lesson.ends_at);

                                const startMinutesUTC = lessonStartUTC.getUTCHours() * 60 + lessonStartUTC.getUTCMinutes();
                                const endMinutesUTC = lessonEndUTC.getUTCHours() * 60 + lessonEndUTC.getUTCMinutes();

                                const overlap = Math.min(endMinutesUTC, slotEndMinutesUTC) - Math.max(startMinutesUTC, slotStartMinutesUTC);
                                const slotDuration = slotEndMinutesUTC - slotStartMinutesUTC;

                                return overlap >= slotDuration * 0.5; // Пара считается занятой, если >= 50% перекрытия
                            });
                            return (
                                <td key={dayIndex} className="vertical" onClick={() => {
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
                                                    <span><img src={camera} alt={camera}/> ТюмГУ </span>
                                                    <span>{lesson?.cycle_realization?.code}</span>
                                                </div>
                                            ) : (
                                                <span className="company-name">
                                                       <img src={camera} alt={camera}/> Нетология <br/>
                                                </span>
                                            )}
                                            <div className="lesson-name">{lesson?.course_name || lesson?.block_title}</div>
                                        </div>
                                    ) : (
                                        <div className="no-lessons"></div>
                                    )}
                                </td>
                            );
                        })}

                    </tr>
                );
            })}
        </>
    );
};

export default LessonTimes;