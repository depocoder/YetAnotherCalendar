import React from 'react';
import arrow from "../../img/cross.png";
import cross from "../../img/arrow.png";
// import camera from "../../img/camera.png";

const Calendar = ({ events }) => {
  if (!events) {
    return <div>Нет данных для отображения.</div>;
  }

  const netology = events?.netology;
  const modeus = events?.modeus;

  return (
    <header className="wrapper">
      <div className="header-line">
        <div className="shedule-export">
          <span className="shedule">Мое расписание</span>
          <button className="export-btn">Экспорт .ics</button>
          <button className="cache-btn">Сбросить кэш расписания</button>
        </div>
        <button className="exit-btn" href="#">
          Выйти
          <img className="exit-btn-cross" src={cross} alt="cross" />
        </button>
      </div>

      {/* Информация о дедлайнах */}
      {netology?.homework?.length > 0 && (
        <div id="rectangle" className="info">
          <div className="source">
            <span className="source-first-word">Дедлайн</span> Нетология{" "}
            <span className="date-event">
              <img src={arrow} alt="arrow" />{" "}
              {new Date(netology.homework[0].deadline).toLocaleDateString()}
            </span>
          </div>
          <div className="name-event">
            <span className="name-event-text">{netology.homework[0].title}</span>
          </div>
          <div className="task-event">
            <span className="task-event-text">
              Домашнее задание с самопроверкой (дедлайн{" "}
              {new Date(netology.homework[0].deadline).toLocaleDateString()})
            </span>
          </div>
        </div>
      )}

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

          {/* Проход по урокам из modeus */}
          {modeus?.map((lesson, index) => (
            <tr key={index}>
              <th>{lesson.nameShort}</th>
              <td>{/* Уроки на Пн */}</td>
              <td>{/* Уроки на Вт */}</td>
              <td>{/* Уроки на Ср */}</td>
              <td>{/* Уроки на Чт */}</td>
              <td>{/* Уроки на Пт */}</td>
              <td>{/* Уроки на Сб */}</td>
              <td>{/* Уроки на Вс */}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </header>
  );
};

export default Calendar;
