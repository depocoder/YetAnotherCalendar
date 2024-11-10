import React, {useEffect, useState} from 'react';
import camera from "../../img/camera.png";

export function formatDateToAMPM(date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}

const LessonTimes = ({ events, selectedEvent, setSelectedEvent }) => {
    const [weekDays, setWeekDays] = useState(Array.from({length: 7}, () => []));

    // Массив временных интервалов пар, начиная с 10:00
    const lessonTimesArray = [
        "10:00 - 11:30", // 1 пара
        "12:00 - 13:30", // 2 пара
        "13:45 - 15:15", // 3 пара
        "15:30 - 17:00", // 4 пара
        "17:10 - 18:40", // 5 пара
        "18:50 - 20:20"  // 6 пара
    ];

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
                                                lessonStartFormatted === timeSlot.split(' - ')[0] ||
                                                lessonEndFormatted === timeSlot.split(' - ')[1] ||
                                                (lessonStartFormatted >= timeSlot.split(' - ')[0] && lessonEndFormatted <= timeSlot.split(' - ')[1])
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