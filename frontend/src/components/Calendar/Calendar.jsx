import React from 'react';
import cross from "../../img/arrow.png";
import camera from "../../img/camera.png";

import '../../style/header.scss';
import '../../style/calendar.scss';
import arrow from "../../img/arrow.png";
import DatePicker from "./DataPicker";

const Calendar = ({ events, date }) => {
    if (!events) {
        return <div>Нет данных для отображения.</div>;
    }
   // modeus lessons
    const { modeus, netology } = events;
    const weekDays = Array.from({ length: 7 }, () => []);

    // Заполнение массива дней недели занятиями
    modeus?.forEach((lesson) => {
        const startTime = new Date(lesson.start);
        const endTime = new Date(lesson.end);
        const dayOfWeek = (startTime.getDay() + 6) % 7; // Преобразуем: Пн = 0, Вт = 1, ..., Вс = 6

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
        const day = dateObj.getDate().toString().padStart(2, '0'); // Форматируем день
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0'); // Форматируем месяц
        return `${day}.${month}`; // Возвращаем строку в формате "дд.мм"
    };

    //netology homework
    console.log('netology homework', netology.homework)
    // Получение всех дат между началом и концом недели
    const startDate = new Date(date.start);
    const monthDays = [];
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        monthDays.push(currentDate.toISOString().split('T')[0]); // Получаем формат "YYYY-MM-DD" для сравнения
    }

    //netology webinars

    return (
        <div className="wrapper">
            <header className="header">
                <div className="header-line">
                    <div className="shedule-export">
                        <span className="shedule">Мое расписание</span>
                        <button className="export-btn">Экспорт .ics</button>
                        <button className="cache-btn">Сбросить кэш расписания</button>
                    </div>
                    <button className="exit-btn" href="#"> Выйти
                        <img className="exit-btn-cross" src={cross} alt="exit"/>
                    </button>
                </div>

                <div className="rectangle">
                    <div className="rectangle-info">
                        <div className="source">
                            <span className="source-first-word">Дедлайн</span> Нетология <span
                            className="date-event"><img src={arrow}
                                                        alt={arrow}/> 23.09.2024</span>
                        </div>
                        <div className="name-event">
                            <span className="name-event-text">Программирование на Python</span>
                        </div>
                        <div className="task-event">
                            <span className="task-event-text">Домашнее задание с самопроверкой(дедлайн 12.12.24)</span>
                        </div>
                    </div>
                </div>
                <div className="vertical-line"></div>

                <DatePicker />
            </header>


            <div className="calendar">
                <table className="shedule-table">
                    <thead>
                    <tr>
                        {/*<th>Время</th>*/}
                        <th className="days"></th>
                        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day, index) => {
                            // Получаем дату для каждого дня недели
                            const dayDate = new Date(date.start);
                            dayDate.setDate(dayDate.getDate() + index); // Увеличиваем на index
                            const formattedDate = formatDate(dayDate); // Форматируем дату

                            return (
                                <th key={index} className={`days-${index}`}>
                                    {`${day} ${formattedDate}`} {/* Отображаем день недели и дату */}
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
                            // Уменьшаем индекс на 1, чтобы получить предыдущий день
                            const adjustedDay = new Date(new Date(date.start).setDate(new Date(date.start).getDate() + index + 1)).toISOString().split('T')[0];

                            console.log('adjustedDay', adjustedDay);

                            const deadlines = netology?.homework.filter(homework => {
                                const homeworkDeadline = new Date(homework.deadline).toISOString().split('T')[0]; // Формат "YYYY-MM-DD"
                                console.log('homeworkDeadline', homeworkDeadline);
                                return homeworkDeadline === adjustedDay; // Сравниваем с уменьшенной датой
                            });

                            return (
                                <td key={index} className="vertical-deadline">
                                    {deadlines && deadlines.length > 0 ? (
                                        deadlines.map((homework, hwIndex) => (
                                            <div key={hwIndex} className="deadline-info">
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

                                        // Сравнение времени с интервалами
                                        return (
                                            lessonStartFormatted === timeSlot.split(' - ')[0] ||
                                            lessonEndFormatted === timeSlot.split(' - ')[1] ||
                                                (lessonStartFormatted >= timeSlot.split(' - ')[0] && lessonEndFormatted <= timeSlot.split(' - ')[1])
                                            );
                                        });

                                        return (
                                            <td key={dayIndex} className="vertical">
                                                {lesson ? (
                                                    <div className="TyumGU-lesson event-item">
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
                       {/* Строка с вебинарами */}
                        <tr>
                            <th className="vertical-heading">Вебинары</th>
                            {monthDays.map((day, index) => {
                                // Найдем вебинары для текущего дня
                                const webinars = netology?.webinars.filter(webinar => {
                                    const webinarStart = new Date(webinar.starts_at).toISOString().split('T')[0]; // Формат "YYYY-MM-DD"
                                    return webinarStart === day;
                                });

                                return (
                                    <td key={index} className="vertical-deadline">
                                        {webinars && webinars.length > 0 ? (
                                            webinars.map((webinar, wbIndex) => (
                                                <div key={wbIndex} className="webinar-info">
                                                    <a href={webinar.video_url || webinar.webinar_url} target="_blank" rel="noopener noreferrer">
                                                        {webinar.title}
                                                    </a>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-webinars">Нет вебинаров</div>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Calendar;
