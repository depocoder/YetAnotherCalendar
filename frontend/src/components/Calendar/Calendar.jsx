import React from 'react';
import arrow from "../../img/cross.png";
import cross from "../../img/arrow.png";
// import camera from "../../img/camera.png";

import '../../style/header.scss';
import '../../style/calendar.scss';
import DatePicker from "./DataPicker";
import camera from "../../img/camera.png";

const Calendar = ({events}) => {
    console.log('events:', events);

    if (!events) {
        return <div>Нет данных для отображения.</div>;
    }

    const modeus = events?.modeus;
    const netology = events?.netology;
    // const homework = netology?.homework;
    // const webinars = netology?.webinars;
    console.log('modeus', modeus)
    // console.log('netology', netology)
    // console.log('webinars', webinars)
    // console.log('homework', homework)

    // Функция для получения дней недели
    const getWeekDays = () => {
        const today = new Date();
        const startOfWeek = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1); // Начало недели с понедельника
        const weekDays = [];

        // Генерация всех дней недели (с понедельника по воскресенье)
        for (let i = 0; i < 7; i++) {
            const day = new Date(today.setDate(startOfWeek + i));
            weekDays.push({
                day: day.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: '2-digit' }),
                date: day.toISOString().split('T')[0] // Формат даты YYYY-MM-DD
            });
        }
        return weekDays;
    };

    const weekDays = getWeekDays();

    // Функция для фильтрации занятий на определенный день
    const getEventsForDay = (day) => {
        // console.log('day', day)

        if (!modeus) {
            return []; // Возвращаем пустой массив, если данных нет
        }

        return modeus?.filter(event => {
            const eventDate = event.start.split('T')[0]; // Извлекаем только дату в формате YYYY-MM-DD
            return eventDate === day;
        });
    };

    // Функция для определения номера пары по времени
    const getLessonNumber = (eventStart) => {
        const startTime = new Date(eventStart).getHours();
        const startMinutes = new Date(eventStart).getMinutes();

        // 1 пара: 08:00 - 09:30
        if (startTime === 8 || (startTime === 9 && startMinutes <= 30)) return 1;

        // 2 пара: 10:00 - 11:30
        if (startTime === 10 || (startTime === 11 && startMinutes <= 30)) return 2;

        // 3 пара: 12:00 - 13:30
        if (startTime === 12 || (startTime === 13 && startMinutes <= 30)) return 3;

        // 4 пара: 14:00 - 15:30
        if (startTime === 14 || (startTime === 15 && startMinutes <= 30)) return 4;

        // 5 пара: 15:45 - 17:15
        if ((startTime === 15 && startMinutes >= 45) || startTime === 16 || (startTime === 17 && startMinutes <= 15)) return 5;

        // 6 пара: 17:30 - 19:00
        if ((startTime === 17 && startMinutes >= 30) || startTime === 18 || (startTime === 19 && startMinutes === 0)) return 6;

        // 7 пара: 19:10 - 20:40
        if ((startTime === 19 && startMinutes >= 10) || (startTime === 20 && startMinutes <= 40)) return 7;

        return null;
    };

    // const lessonTimes = [
    //     {number: 1, start: "08:30", end: "10:00"},
    //     {number: 2, start: "10:15", end: "11:45"},
    //     {number: 3, start: "12:00", end: "13:30"},
    //     {number: 4, start: "14:00", end: "15:30"},
    //     {number: 5, start: "15:45", end: "17:15"},
    //     {number: 6, start: "17:30", end: "19:00"},
    //     {number: 7, start: "19:10", end: "20:40"},
    // ];

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
                        <img className="exit-btn-cross" src={cross} alt={cross}/>
                    </button>
                </div>

                <div className="rectangle">
                    {netology?.homework?.length > 0 && netology.homework.map((homeworkItem, index) => (
                        <a className="rectangle-info"
                           key={index}
                           href={homeworkItem?.url}
                           target="_blank"
                           rel="noopener noreferrer"
                        >
                            <div className="source">
                                <span className="source-first-word">Дедлайн</span> Нетология
                                <span className="date-event">
                                <img src={arrow} alt="arrow"/>
                                    {new Date(homeworkItem?.deadline).toLocaleDateString()}
                            </span>
                            </div>
                            <div className="name-event">
                                <span className="name-event-text">{homeworkItem?.title}</span>
                            </div>
                            {/*<div className="task-event">*/}
                            {/*    <span className="task-event-text">*/}
                            {/*        Тестирование (дедлайн {new Date(homeworkItem.deadline).toLocaleDateString()})*/}
                            {/*    </span>*/}
                            {/*</div>*/}
                        </a>
                    ))}
                </div>

                <DatePicker />
            </header>

            <div className="calendar">
                {/*TODO: написать логику движении линии, для отображения текущего дня*/}
                <div className="vertical-line"></div>

                <table className="shedule-table">
                    <thead>
                       <tr>
                        <th className="days"></th>
                        {weekDays.map((day, index) => (
                            <th key={index} className={`days-${index + 1}`}>{day.day}</th>
                        ))}
                    </tr>
                       {/*TODO: написать логику*/}
                       <tr>
                        <th className="vertical-heading"> дедлайны
                            <div className="off-deadline">Скрыть</div>
                        </th>
                        <td className="vertical-deadline">
                            <div className="deadline-info">ТюмГУ</div>
                            <div className="deadline-info-on">Нетология</div>
                        </td>
                        <td className="vertical-deadline"></td>
                        <td className="vertical-deadline">
                            <div className="deadline-info">ТюмГУ</div>
                        </td>
                        <td className="vertical-deadline"></td>
                        <td className="vertical-deadline">
                            <div className="deadline-info">Нетология</div>
                        </td>
                        <td className="vertical-deadline"></td>
                        <td className="vertical-deadline"></td>
                    </tr>

                    </thead>
                    {/*TODO: дописать логику, поправить стили*/}
                    <tbody>
                    {[1, 2, 3, 4, 5, 6, 7].map((lessonNumber) => (
                        <tr key={lessonNumber}>
                            <th className="vertical-heading">
                                {lessonNumber} пара <br/> {lessonNumber * 2 + 8}:00 {lessonNumber * 2 + 9}:30
                            </th>
                            {weekDays.map((day, index) => {
                                const eventsForDay = getEventsForDay(day.date);
                                const eventsForSlot = eventsForDay.filter(event => getLessonNumber(event.start) === lessonNumber);
                                return (
                                    <td key={index} className="vertical">
                                        {eventsForSlot.length > 0 ? (
                                            eventsForSlot.map(event => (
                                                <div key={event.id} className="TyumGU-lesson event-item">
                                                    <span className="company-name"><img src={camera} alt={camera}/> ТюмГУ<br/></span>
                                                    <div className="lesson-name">{event.nameShort}</div>
                                                    <div className="lesson-name">{event.name}</div>
                                                    <div className="lesson-time">
                                                        {new Date(event.start).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })} -
                                                        {new Date(event.end).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                    <span className="teacher-name">{event.teacher_full_name}</span>
                                                </div>
                                            ))
                                            ) : (<div className="empty-slot"></div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        )
                    )
                    }
                                </tbody>
                </table>
            </div>
        </div>
    );
};

export default Calendar;