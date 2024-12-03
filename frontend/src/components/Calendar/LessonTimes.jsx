import React, {useEffect, useState} from 'react';
import camera from "../../img/camera.png";
import {formatHours} from "../../utils/dateUtils";

export function formatDateToAMPM(date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}

const LessonTimes = ({ events, selectedEvent, setSelectedEvent }) => {
    const [weekDays, setWeekDays] = useState(Array.from({length: 7}, () => []));

    // Массив временных интервалов пар, начиная с 10:00
    const lessonTimesArrayUTC = [
        "7:00 8:30", // 1 пара
        "9:00 10:30", // 2 пара
        "10:45 12:15", // 3 пара
        "12:30 14:00", // 4 пара
        "14:10 15:40", // 5 пара
        "15:50 17:20"  // 6 пара
    ];

    // Функция для преобразования времени в часовой пояс пользователя
    const convertToUserTimezone = (timeArray) => {
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        return timeArray.map((timeRange) => {
            const [start, end] = timeRange.split(" ");
            const [start_hours, start_minutes] = start.split(":");
            const [end_hours, end_minutes] = end.split(":");
            // Создаем даты для начала и конца урока

            const startDateUTC = new Date(Date.UTC(2024, 0, 1, start_hours, start_minutes));
            const endDateUTC = new Date(Date.UTC(2024, 0, 1, end_hours, end_minutes));
            // Преобразуем в формат пояса пользователя
            const startUserTime = new Date(startDateUTC.toLocaleString('ru-RU', { timeZone: userTimezone }));
            const endUserTime = new Date(endDateUTC.toLocaleString('ru-RU', { timeZone: userTimezone }));
            return `${formatHours(startUserTime)} ${formatHours(endUserTime)}`;
        });
    };

    // Получаем преобразованные времена уроков
    const lessonTimesArray = convertToUserTimezone(lessonTimesArrayUTC);
    const populateWeekDays = (events) => {
        if (!events) return;
        const newWeekDays = Array.from({length: 7}, () => []);

        // Заполнение массива дней недели занятиями
        if (events?.utmn?.modeus_events) {
            events.utmn.modeus_events.forEach((lesson) => {
                const startTime = new Date(lesson.start);
                const endTime = new Date(lesson.end);
                const dayOfWeek = (startTime.getDay() + 6) % 7;

                newWeekDays[dayOfWeek].push({
                    ...lesson,
                    startTime,
                    endTime,
                    type: 'modeus' // Добавляем тип события
                });
            });
        }

        // Заполнение массива дней недели вебинарами netology
        if (events?.netology?.webinars) {
            events.netology.webinars.forEach((webinar) => {
                const startTime = new Date(webinar.starts_at);
                const endTime = new Date(webinar.ends_at);

                const dayOfWeek = (startTime.getDay() + 6) % 7;

                newWeekDays[dayOfWeek].push({
                    ...webinar,
                    startTime,
                    endTime,
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
                            return (
                                <tr key={index}>
                                    <th className="vertical-heading">{index + 1} пара <br/> {timeSlot}</th>
                                    {weekDays.map((lessons, dayIndex) => {
                                        const lesson = lessons.find(lesson => {
                                            const lessonStartTime = new Date(lesson.start || lesson.starts_at);
                                            const lessonEndTime = new Date(lesson.end || lesson.ends_at);
                                            const lessonStartFormatted = formatDateToAMPM(lessonStartTime);
                                            const lessonEndFormatted = formatDateToAMPM(lessonEndTime);

                                            return (
                                                lessonStartFormatted === timeSlot.split(' ')[0] ||
                                                lessonEndFormatted === timeSlot.split(' ')[1] ||
                                                (lessonStartFormatted >= timeSlot.split(' ')[0] && lessonEndFormatted <= timeSlot.split(' ')[1])
                                            );
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
                                                    <div
                                                        className={`event-item ${lesson.type === 'modeus' ? 'TyumGU-lesson' : 'netology-lesson'}`}>
                                                        {lesson.type === "modeus" ? (
                                                            <div className="company-name">
                                                                <span><img src={camera} alt={camera}/> ТюмГУ</span>
                                                                <span>{lesson?.cycle_realization?.code}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="company-name">
                                                                   <img src={camera} alt={camera}/> Нетология<br/>
                                                            </span>
                                                        )}
                                                        {/*{lesson.type === "netology" ? (*/}
                                                        {/*    <>*/}
                                                        {/*        <span className="company-name">*/}
                                                        {/*           <img src={camera} alt={camera}/> Нетология<br/>*/}
                                                        {/*        </span>*/}
                                                        {/*        /!*<span className="company-name"></span>*!/*/}
                                                        {/*    </>*/}
                                                        {/*) : (*/}
                                                        {/*    <span className="company-name"></span>*/}
                                                        {/*)}*/}
                                                        {/*<div className="lesson-name">{lesson.course_name || lesson.block_title}</div>*/}
                                                        <div className="lesson-name">{lesson?.course_name || lesson?.block_title}</div>
                                                        {/*<span className="teacher-name">{lesson.teacher_full_name}</span>*/}
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