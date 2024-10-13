import React from 'react';
import arrow from "../../img/cross.png";
import cross from "../../img/arrow.png";
// import camera from "../../img/camera.png";

import '../../style/header.scss';
import '../../style/calendar.scss';

const Calendar = ({events}) => {
    console.log('events', events)
    if (!events) {
        return <div>Нет данных для отображения.</div>;
    }

    const modeus = events?.modeus;
    const netology = events?.netology;
    const homework = netology?.homework;
    const webinars = netology?.webinars;
    console.log('modeus', modeus)
    console.log('netology', netology)
    console.log('webinars', webinars)
    console.log('homework', homework)

    // // Функция для получения дня недели (0 = Воскресенье, 6 = Суббота)
    // const getDayOfWeek = (dateString) => {
    //     return new Date(dateString).getDay();
    // };
    //
    // // Массив для распределения занятий по дням недели
    // const weekDays = Array(7).fill([]); // 0 - Воскресенье, 1 - Понедельник и т.д.
    //
    // // Распределение занятий по дням недели
    // modeus?.forEach((lesson) => {
    //     const dayOfWeek = getDayOfWeek(lesson.start);
    //     weekDays[dayOfWeek] = [...weekDays[dayOfWeek], lesson]; // Добавляем занятия в соответствующий день недели
    // });

    // Function to get the day of the week (0 = Sunday, 6 = Saturday)
    const getDayOfWeek = (dateString) => {
        return new Date(dateString).getDay();
    };

    // Create an array for each day of the week
    const weekDays = Array(7).fill([]); // 0 - Sunday, 1 - Monday, and so on

    // Distribute modeus events across the week by day of the week
    modeus?.forEach((lesson) => {
        const dayOfWeek = getDayOfWeek(lesson.start);
        weekDays[dayOfWeek] = [...weekDays[dayOfWeek], lesson];
    });

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

                {/* Информация о дедлайнах */}
                <div className="header-deadline">
                    {netology?.homework?.length > 0 && netology.homework.map((homeworkItem, index) => (
                        <a className="header-deadline-info"
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
            </header>

            <div className="calendar">
                <div className="vertical-line"></div>

                {/* Таблица расписания */}
                <table className="shedule-table">
                    <thead>
                    <tr>
                        <th></th>
                        <th>Пн</th>
                        <th>Вт</th>
                        <th>Ср</th>
                        <th>Чт</th>
                        <th>Пт</th>
                        <th>Сб</th>
                        <th>Вс</th>
                    </tr>
                    </thead>
                    <tbody>
                    {/* Дедлайны */}
                    <tr>
                        <th>Дедлайны</th>
                        <td>{/* Дедлайны для Пн */}</td>
                        <td>{/* Дедлайны для Вт */}</td>
                        <td>{/* Дедлайны для Ср */}</td>
                        <td>{/* Дедлайны для Чт */}</td>
                        <td>{/* Дедлайны для Пт */}</td>
                        <td>{/* Дедлайны для Сб */}</td>
                        <td>{/* Дедлайны для Вс */}</td>
                    </tr>

                    {/*/!* Проход по урокам из modeus *!/*/}
                    {/*{modeus?.map((lesson, index) => (*/}
                    {/*    <tr key={index}>*/}
                    {/*        <th>{lesson.nameShort}</th>*/}
                    {/*        <td>/!* Уроки на Пн *!/</td>*/}
                    {/*        <td>/!* Уроки на Вт *!/</td>*/}
                    {/*        <td>/!* Уроки на Ср *!/</td>*/}
                    {/*        <td>/!* Уроки на Чт *!/</td>*/}
                    {/*        <td>/!* Уроки на Пт *!/</td>*/}
                    {/*        <td>/!* Уроки на Сб *!/</td>*/}
                    {/*        <td>/!* Уроки на Вс *!/</td>*/}
                    {/*    </tr>*/}
                    {/*))}*/}

                    {weekDays.map((lessons, dayIndex) => (
                        <tr key={dayIndex}>
                           <th>{["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][dayIndex]}</th>
                           {lessons.length > 0 ? (
                              lessons.map((lesson, index) => (
                                <td key={index}>
                                    <div className="lesson">
                                        <span className="lesson-name">{lesson.nameShort}</span>
                                        <span className="lesson-time">
                                                    {new Date(lesson.start).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })} -
                                            {new Date(lesson.end).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                                </span>
                                    </div>
                                </td>
                            ))
                           ) : (
                              <td key={`empty-${dayIndex}`}></td>
                           )}
                        </tr>
                     ))}
                    </tbody>
                </table>
            </div>
        </div>
)
    ;
};

export default Calendar;
