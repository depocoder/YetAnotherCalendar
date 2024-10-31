import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
    getNetologyCourse,
    bulkEvents,
    getTokenFromLocalStorage,
    getPersonIdLocalStorage,
} from '../services/api'; // Ваши API-запросы
import Loader from "../elements/Loader";

import camera from "../img/camera.png";

import '../style/header.scss';
import '../style/calendar.scss';
import DatePicker from "../components/Calendar/DataPicker";
import ExitBtn from "../components/Calendar/ExitBtn";
import ICSExporter from "../components/Calendar/ICSExporter";
import CacheUpdateBtn from "../components/Calendar/CacheUpdateBtn";

import {getCurrentWeekDates} from "../utils/dateUtils";
import EventsDetail from "../components/Calendar/EventsDetail";
import DeadLine from "../components/Calendar/DeadLine";
import DaysNumber from "../components/Calendar/DaysNumber";



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
     console.log('weekDays', weekDays)
    // const [date, setDate] = useState({
    //     start: "2024-10-28T00:00:00+00:00",
    //     end:   "2024-11-03T23:59:59+00:00"
    // });

    console.log('selectedEvent', selectedEvent)

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

    // // Получение всех дат между началом и концом недели
    // const startDate = new Date(date.start);
    // const monthDays = [];
    // for (let i = 0; i < 7; i++) {
    //     const currentDate = new Date(startDate);
    //     currentDate.setDate(startDate.getDate() + i);
    //     monthDays.push(currentDate.toISOString().split('T')[0]);
    // }

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

                    <EventsDetail event={selectedEvent} />
                    {/*<div className="vertical-line"></div>*/}

                    <DatePicker onWeekChange={handleWeekChange} disableButtons={loading}/>
                </header>

                <div className="calendar">
                    <table className="shedule-table">
                        <thead>
                           <DaysNumber date={date} />
                           <DeadLine date={date} events={events} setSelectedEvent={setSelectedEvent} />
                        </thead>
                        <tbody>
                          {lessonTimesArray.map((timeSlot, index) => {
                            return (
                                <tr key={index}>
                                    <th className="vertical-heading">{index + 1} пара <br/> {timeSlot}</th>
                                    {weekDays.map((lessons, dayIndex) => {
                                        const lesson = lessons.find(lesson => {
                                            const lessonStartTime = new Date(lesson.start || lesson.starts_at);
                                            const lessonEndTime = new Date(lesson.end || lesson.ends_at);
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
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CalendarRoute;
