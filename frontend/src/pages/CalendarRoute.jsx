import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
    getNetologyCourse,
    bulkEvents,
    getTokenFromLocalStorage,
    getPersonIdLocalStorage,
} from '../services/api'; // Ваши API-запросы
import Loader from "../elements/Loader";

import arrow from "../img/arrow.png";
import camera from "../img/camera.png";

import '../style/header.scss';
import '../style/calendar.scss';
import DatePicker from "../components/Calendar/DataPicker";
import ExitBtn from "../components/Calendar/ExitBtn";
import ICSExporter from "../components/Calendar/ICSExporter";
import CacheUpdateBtn from "../components/Calendar/CacheUpdateBtn";

import {getCurrentWeekDates} from "../utils/dateUtils";



const CalendarRoute = () => {
    // Используем useMemo для вызова getCurrentWeekDates один раз при инициализации
    const initialDate = useMemo(() => getCurrentWeekDates(), []);
    const [date, setDate] = useState(initialDate);
    
    const [events, setEvents] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // const navigate = useNavigate();
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [weekDays, setWeekDays] = useState(Array.from({length: 7}, () => []));

    // const getCurrentWeekDates = () => {
    //     const today = new Date();
    //     const dayOfWeek = today.getDay();
    //     const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    //     const sundayOffset = 7 - dayOfWeek;
    //
    //     const startOfWeek = new Date(today);
    //     startOfWeek.setDate(today.getDate() + mondayOffset);
    //     startOfWeek.setUTCHours(0, 0, 0, 0);
    //
    //     const endOfWeek = new Date(today);
    //     endOfWeek.setDate(today.getDate() + sundayOffset);
    //     endOfWeek.setUTCHours(23, 59, 59, 0);
    //
    //     // Форматирование даты без миллисекунд и с нужным смещением
    //     const formatISOWithoutMilliseconds = (date) =>
    //         date.toISOString().replace('.000Z', '+00:00');
    //
    //     return {
    //         start: formatISOWithoutMilliseconds(startOfWeek),
    //         end: formatISOWithoutMilliseconds(endOfWeek),
    //     };
    // };

    // const [date, setDate] = useState(getCurrentWeekDates);

    // console.log('date', date)

    // const [date, setDate] = useState({
    //     start: "2024-10-28T00:00:00+00:00",
    //     end:   "2024-11-03T23:59:59+00:00"
    // });

    const populateWeekDays = (eventsData) => {
        if (!eventsData) return;
        const newWeekDays = Array.from({length: 7}, () => []);

        // Заполнение массива дней недели занятиями
        if (eventsData?.utmn?.modeus_events) {
            eventsData.utmn.modeus_events.forEach((lesson) => {
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
        if (eventsData?.netology?.webinars) {
            eventsData.netology.webinars.forEach((webinar) => {
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

    const fetchCourseAndEvents = useCallback(async () => {
        setLoading(true);
        try {
            const courseData = await getNetologyCourse(getTokenFromLocalStorage());
            const calendarId = courseData?.id;
            localStorage.setItem('calendarId', calendarId);

            if (calendarId) {
                const eventsResponse = await bulkEvents({
                    calendarId: calendarId, // ID календаря
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Часовой пояс
                    attendeePersonId: getPersonIdLocalStorage(), // ID участника
                    timeMin: date.start, // Дата начала
                    timeMax: date.end, // Дата окончания
                    sessionToken: getTokenFromLocalStorage(),
                });

                // Проверяем, что события получены
                if (eventsResponse && eventsResponse.data) {
                    setEvents(eventsResponse.data);
                    populateWeekDays(eventsResponse.data); // Обновление weekDays
                } else {
                    throw new Error('Не удалось получить события'); // Бросаем ошибку, если нет данных
                }
            }
        } catch (error) {
            console.error('Ошибка при получении данных с сервера:', error);
            setError("Ошибка при получении данных с сервера. Перезагрузите страницу!");
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        fetchCourseAndEvents();

    }, [fetchCourseAndEvents]);

    if (loading) {
        return (
            // <div className="loader-container">
            <Loader/>
            // </div>
        );
    }

    if (error) {
        return <div>{error}</div>;
    }

    const handleWeekChange = (newDate) => {
        const startOfWeek = new Date(newDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Пн
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Вс

        const currentTimeStart = date.start.split("T")[1];
        const currentTimeEnd = date.end.split("T")[1];

        setDate({
            start: `${startOfWeek.toISOString().split("T")[0]}T${currentTimeStart}`,
            end: `${endOfWeek.toISOString().split("T")[0]}T${currentTimeEnd}`,
        });

        fetchCourseAndEvents(); // Обновляем события после изменения даты
    };


    // Массив временных интервалов пар, начиная с 10:00
    const lessonTimesArray = [
        "10:00 - 11:30", // 1 пара
        "12:00 - 13:30", // 2 пара
        "13:45 - 15:15", // 3 пара
        "15:30 - 17:00", // 4 пара
        "17:10 - 18:40", // 5 пара
        "18:50 - 20:20"  // 6 пара
    ];

    // Функция для форматирования даты
    const formatDate = (dateString) => {
        const dateObj = new Date(dateString);
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        return `${day}.${month}`; // Возвращаем строку в формате "дд.мм"
    };

    // Получение всех дат между началом и концом недели
    const startDate = new Date(date.start);
    const monthDays = [];
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        monthDays.push(currentDate.toISOString().split('T')[0]);
    }

    const handleDataUpdate = (updatedEvents) => {
        setEvents(updatedEvents);
        populateWeekDays(updatedEvents);
    };

    const allEvents = [
        ...(events?.utmn?.modeus_events || []),
        ...(events?.netology?.webinars || [])
    ];


    return (
        <div className="calendar-page">
            <div className="wrapper">
                <header className="header">
                    <div className="header-line">
                        <div className="shedule-export">
                            <span className="shedule">Мое расписание</span>
                            <ICSExporter events={allEvents}/>
                            <CacheUpdateBtn date={date} onDataUpdate={handleDataUpdate}/>
                        </div>
                        <ExitBtn/>
                    </div>

                    <div className="rectangle">
                        {selectedEvent && (
                            <div className="rectangle-info">
                                <div className="source">
                                  <span
                                      className="source-first-word">Событие:</span> {selectedEvent.nameShort || selectedEvent.title}
                                    <span className="date-event">
                                       <img src={arrow}
                                            alt={arrow}/> {formatDate(selectedEvent.start || selectedEvent.deadline)}
                                  </span>
                                </div>
                                <div className="name-event">
                                  <span
                                      className="name-event-text">{selectedEvent.name || 'Информация недоступна'}</span>
                                </div>
                                <div className="task-event">
                                  <span
                                      className="task-event-text">Преподаватель: {selectedEvent.teacher_full_name || 'Не указано'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {/*<div className="vertical-line"></div>*/}

                    <DatePicker onWeekChange={handleWeekChange} disableButtons={loading}/>
                </header>

                <div className="calendar">
                    <table className="shedule-table">
                        <thead>
                        <tr className="days-row">
                            <th className="days"></th>
                            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day, index) => {
                                const dayDate = new Date(date.start);
                                dayDate.setDate(dayDate.getDate() + index);


                                const today = new Date(); // Получаем сегодняшнюю дату
                                today.setHours(0, 0, 0, 0); // Устанавливаем время на начало дня для корректного сравнения

                                // Сравниваем даты и определяем нужный класс
                                let dayClass = "";
                                if (dayDate < today) {
                                    dayClass = "prev";
                                } else if (dayDate.toDateString() === today.toDateString()) {
                                    dayClass = "now";
                                } else {
                                    dayClass = "next";
                                }
                                const formattedDate = formatDate(dayDate);
                                return (
                                    <th key={index} className={`days ${dayClass}`}>
                                        {`${day} ${formattedDate}`}
                                    </th>
                                );
                            })}
                        </tr>
                        <tr>
                            <th className="vertical-heading">
                                Дедлайны
                                <button className="off-deadline">Скрыть</button>
                            </th>
                            {monthDays.map((day, index) => {
                                const adjustedDay = new Date(new Date(date.start).setDate(new Date(date.start).getDate() + index + 1)).toISOString().split('T')[0];

                                const deadlines = events?.netology?.homework.filter(homework => {
                                    const homeworkDeadline = new Date(homework.deadline).toISOString().split('T')[0];
                                    return homeworkDeadline === adjustedDay;
                                });

                                return (
                                    <td key={index} className="vertical-deadline">
                                        {deadlines && deadlines.length > 0 ? (
                                            deadlines.map((homework, hwIndex) => (
                                                <div key={hwIndex} className="deadline-info"
                                                     onClick={() => setSelectedEvent(homework)}>
                                                    <a href={homework.url} target="_blank" rel="noopener noreferrer">
                                                        {homework.title}
                                                    </a>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-deadlines"></div>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                        </thead>
                        <tbody>
                        {lessonTimesArray.map((timeSlot, index) => {
                            return (
                                <tr key={index}>
                                    <th className="vertical-heading">{index + 1} пара <br/> {timeSlot}</th>
                                    {weekDays.map((lessons, dayIndex) => {
                                        const lesson = lessons.find(lesson => {
                                            const lessonStartTime = new Date(lesson.start);
                                            const lessonEndTime = new Date(lesson.end);
                                            const lessonStartFormatted = lessonStartTime.toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            });
                                            const lessonEndFormatted = lessonEndTime.toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            });

                                            return (
                                                lessonStartFormatted === timeSlot.split(' - ')[0] ||
                                                lessonEndFormatted === timeSlot.split(' - ')[1] ||
                                                (lessonStartFormatted >= timeSlot.split(' - ')[0] && lessonEndFormatted <= timeSlot.split(' - ')[1])
                                            );
                                        });

                                        // {weekDays.map((lessons, dayIndex) => {
                                        //         const lesson = lessons.find(lesson => {
                                        //             const lessonStartTime = new Date(lesson.start);
                                        //             const lessonEndTime = new Date(lesson.end);
                                        //             const lessonStartFormatted = lessonStartTime.toLocaleTimeString([], {
                                        //                 hour: '2-digit',
                                        //                 minute: '2-digit'
                                        //             });
                                        //             const lessonEndFormatted = lessonEndTime.toLocaleTimeString([], {
                                        //                 hour: '2-digit',
                                        //                 minute: '2-digit'
                                        //             });
                                        //
                                        //             return (
                                        //                 lessonStartFormatted === timeSlot.split(' - ')[0] ||
                                        //                 lessonEndFormatted === timeSlot.split(' - ')[1] ||
                                        //                 (lessonStartFormatted >= timeSlot.split(' - ')[0] && lessonEndFormatted <= timeSlot.split(' - ')[1])
                                        //             );
                                        //         });

                                        return (
                                            // <td key={dayIndex} className="vertical" onClick={() => {
                                            //     // Check if the clicked lesson is the same as the currently selected event
                                            //     if (selectedEvent && selectedEvent.id === lesson?.id) {
                                            //         setSelectedEvent(null); // Close the modal if the same lesson is clicked
                                            //     } else {
                                            //         setSelectedEvent(lesson); // Set the selected lesson
                                            //     }
                                            // }}>
                                            //     {lesson ? (
                                            //         <div className="TyumGU-lesson event-item" onClick={() => setSelectedEvent(lesson)}>
                                            //             <span className="company-name"><img src={camera} alt={camera} /> ТюмГУ<br /></span>
                                            //             <div className="lesson-name">{lesson.nameShort}</div>
                                            //             <div className="lesson-name">{lesson.name}</div>
                                            //             <span className="teacher-name">{lesson.teacher_full_name}</span>
                                            //         </div>
                                            //     ) : (
                                            //         <div className="no-lessons"></div>
                                            //     )}
                                            // </td>
                                            <td key={dayIndex} className="vertical" onClick={() => {
                                                if (selectedEvent && selectedEvent.id === lesson?.id) {
                                                    setSelectedEvent(null); // Close the modal if the same lesson is clicked
                                                } else {
                                                    setSelectedEvent(lesson); // Set the selected lesson
                                                }
                                            }}>
                                                {lesson ? (
                                                    <div
                                                        className={`event-item ${lesson.type === 'modeus' ? 'TyumGU-lesson' : 'Netology-webinar'}`}>
                                                        {lesson.type === 'modeus' ? (
                                                            <span className="company-name">
                                                                <img src={camera} alt={camera}/> ТюмГУ<br/>
                                                            </span>
                                                        ) : (
                                                            <span className="company-name">Netology</span>
                                                        )}
                                                        <div
                                                            className="lesson-name">{lesson.nameShort || lesson.title}</div>
                                                        <span className="teacher-name">{lesson.teacher_full_name}</span>
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
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CalendarRoute;
