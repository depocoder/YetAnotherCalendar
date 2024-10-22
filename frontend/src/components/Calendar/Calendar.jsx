import React, { useState } from 'react'; // Убедитесь, что useState импортирован
import cross from "../../img/arrow.png";
import camera from "../../img/camera.png";
import '../../style/header.scss';
import '../../style/calendar.scss';
import arrow from "../../img/arrow.png";
import {useNavigate} from "react-router-dom";
// import DatePicker from "./DataPicker";

const Calendar = ({ events, date, onRefresh, cacheUpdated }) => {

    console.log('Calendar events', events)
    const navigate = useNavigate();
    const [selectedEvent, setSelectedEvent] = useState(null);

    if (!events) {
        return <div>Нет данных для отображения.</div>;
    }

    // Уроки modeus
    const { utmn, netology } = events;
    const weekDays = Array.from({ length: 7 }, () => []);

    // Заполнение массива дней недели занятиями
    utmn.modeus_events?.forEach((lesson) => {
        const startTime = new Date(lesson.start);
        const endTime = new Date(lesson.end);
        const dayOfWeek = (startTime.getDay() + 6) % 7;

        weekDays[dayOfWeek].push({
            ...lesson,
            startTime,
            endTime
        });
    });

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


    const exitApp = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <div className="wrapper">
            <header className="header">
                <div className="header-line">
                    <div className="shedule-export">
                        <span className="shedule">Мое расписание</span>
                        {/*<button className="export-btn">Экспорт .ics</button>*/}
                        <button onClick={onRefresh} className={`cache-btn ${cacheUpdated ? 'updated' : ''}`}>
                            {cacheUpdated ? 'Кэш обновлен' : 'Сбросить кэш расписания'}
                        </button>
                    </div>
                    <div className="exit-btn" onClick={exitApp}> Выйти
                        <img className="exit-btn-cross" src={cross} alt="exit"/>
                    </div>
                </div>

                <div className="rectangle">
                    {selectedEvent && (
                        <div className="rectangle-info">
                            <div className="source">
                                <span className="source-first-word">Событие:</span> {selectedEvent.nameShort || selectedEvent.title} <span
                                    className="date-event"><img src={arrow} alt={arrow}/> {formatDate(selectedEvent.start || selectedEvent.deadline)}</span>
                            </div>
                            <div className="name-event">
                                <span className="name-event-text">{selectedEvent.name || 'Информация недоступна'}</span>
                            </div>
                            <div className="task-event">
                                <span className="task-event-text">Преподаватель: {selectedEvent.teacher_full_name || 'Не указано'}</span>
                            </div>
                        </div>
                    )}
                </div>
                {/*<div className="vertical-line"></div>*/}

                {/*<DatePicker />*/}
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
                    {/* Строка с дедлайнами */}
                    <tr>
                        <th className="vertical-heading">
                            Дедлайны
                            <button className="off-deadline">Скрыть</button>
                        </th>
                        {monthDays.map((day, index) => {
                            const adjustedDay = new Date(new Date(date.start).setDate(new Date(date.start).getDate() + index + 1)).toISOString().split('T')[0];

                            const deadlines = netology?.homework.filter(homework => {
                                const homeworkDeadline = new Date(homework.deadline).toISOString().split('T')[0];
                                return homeworkDeadline === adjustedDay;
                            });

                            return (
                                <td key={index} className="vertical-deadline">
                                    {deadlines && deadlines.length > 0 ? (
                                        deadlines.map((homework, hwIndex) => (
                                            <div key={hwIndex} className="deadline-info" onClick={() => setSelectedEvent(homework)}>
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

                                    return (
                                        <td key={dayIndex} className="vertical" onClick={() => {
                                            // Check if the clicked lesson is the same as the currently selected event
                                            if (selectedEvent && selectedEvent.id === lesson?.id) {
                                                setSelectedEvent(null); // Close the modal if the same lesson is clicked
                                            } else {
                                                setSelectedEvent(lesson); // Set the selected lesson
                                            }
                                        }}>
                                            {lesson ? (
                                                <div className="TyumGU-lesson event-item" onClick={() => setSelectedEvent(lesson)}>
                                                    <span className="company-name"><img src={camera} alt={camera} /> ТюмГУ<br /></span>
                                                    <div className="lesson-name">{lesson.nameShort}</div>
                                                    <div className="lesson-name">{lesson.name}</div>
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
    );
};

export default Calendar;
