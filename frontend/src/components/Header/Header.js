import React from "react";
// import { useNavigate } from "react-router-dom";

import cross from "./cross.png";
import arrow from "./arrow.png"
import camera from "./camera.png"

export default function Header() {
  // const navigate = useNavigate();
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
          <img className="exit-btn-cross" src={cross} alt={cross} />
        </button>
      </div>
      <div id="rectangle" className="info">
        <div className="source">
          <span className="source-first-word">Дедлайн</span> Нетология <span className="date-event"><img src={arrow} alt={arrow} /> 23.09.2024</span>
        </div>
        <div className="name-event">
          <span className="name-event-text">Программирование на Python</span>
        </div>
        <div className="task-event">
          <span className="task-event-text">Домашнее задание с самопроверкой(дедлайн 12.12.24)</span>
        </div>
      </div>
      <div className="vertical-line"></div>
      <table className="shedule-table">
        <tr>
          <td className="days"></td>
          <td className="days-1">Пн 23.09</td>
          <td className="days-2">Вт 24.09</td>
          <td className="days-3">Ср 25.09</td>
          <td className="days-4">Чт 26.09</td>
          <td className="days-5">Пт 27.09</td>
          <td className="days-6">Сб 28.09</td>
          <td className="days-7">Вс 29.09</td>
        </tr>
        <tr>
            <th className="vertical-heading">
              дедлайны
              <button className="off-deadline">Скрыть</button>
            </th>
            <td className="vertical-deadline">
              <button className="deadline-info">ТюмГУ</button>
              <button className="deadline-info-on">Нетология</button>
            </td>
            <td className="vertical-deadline"></td>
            <td className="vertical-deadline"><button className="deadline-info">ТюмГУ</button></td>
            <td className="vertical-deadline"></td>
            <td className="vertical-deadline"><button className="deadline-info">Нетология</button></td>
            <td className="vertical-deadline"></td>
            <td className="vertical-deadline"></td>
        </tr>
        <tr></tr>
        <tr>
          <th className="vertical-heading">2 пара <br />10:15 11:45</th>
          <td className="vertical"></td>
          <td className="vertical"></td>
          <td className="vertical"></td>
          <td className="vertical"></td>
          <td className="vertical"></td>
          <td className="vertical"><button className="TyumGU-lesson">
            <span className="company-name"><img src={camera} alt={camera} /> ТюмГУ<br /></span>
            <span className="lesson-name">Математический анализ</span></button></td>
          <td className="vertical"></td>
        </tr>
        <tr>
          <th className="vertical-heading">3 пара <br />12:00 13:30</th>
          <td className="vertical"></td>
          <td className="vertical"></td>
          <td className="vertical"></td>
          <td className="vertical"></td>
          <td className="vertical"></td>
          <td className="vertical"><button className="TyumGU-lesson">
            <span className="company-name"><img src={camera} alt={camera}/> ТюмГУ<br /></span>
            <span className="lesson-name">Математический анализ</span></button></td>
          <td className="vertical"></td>
        </tr>
        <tr>
          <th className="vertical-heading">4 пара <br />14:00 15:30</th>
          <td className="vertical"></td>
          <td className="vertical"></td>
          <td className="vertical"></td>
          <td className="vertical"></td>
          <td className="vertical"><button className="TyumGU-lesson">
            <span className="company-name"><img src={camera} alt={camera}/> ТюмГУ<br /></span>
            <span className="lesson-name">Философия</span></button></td>
          <td className="vertical"></td>
          <td className="vertical"></td>
        </tr>
        <tr>
          <th className="vertical-heading">5 пара <br />15:45 17:15</th>
          <td className="vertical"><button className="past-lesson">
            <span className="company-name"><img src={camera} alt={camera}/> ТюмГУ<br /></span>
            <span className="lesson-name">Иностранный язык</span></button></td>
          <td className="vertical"></td>
          <td className="vertical"><button className="TyumGU-lesson">
            <span className="company-name"><img src={camera} alt={camera} /> ТюмГУ<br /></span>
            <span className="lesson-name">История Росссии</span></button></td>
          <td className="vertical"></td>
          <td className="vertical"><button className="TyumGU-lesson">
            <span className="company-name"><img src={camera} alt={camera} /> ТюмГУ<br /></span>
            <span className="lesson-name">Философия</span></button></td>
          <td className="vertical"></td>
          <td className="vertical"></td>
        </tr>
        <tr>
          <th className="vertical-heading">6 пара <br />17:30 19:00</th>
            <td className="vertical"><button className="past-lesson">
              <span className="company-name"><img src={camera} alt={camera} /> ТюмГУ<br /></span>
              <span className="lesson-name">Иностранный язык</span></button></td>
          <td className="vertical"></td>
          <td className="vertical"><button className="TyumGU-lesson">
            <span className="company-name"><img src={camera} alt={camera} /> ТюмГУ<br /></span>
            <span className="lesson-name">История Росссии</span></button></td>
          <td className="vertical"><button className="TyumGU-lesson">
            <span className="company-name"><img src={camera} alt={camera} /> ТюмГУ<br /></span>
            <span className="lesson-name">Алгебра</span></button></td>
          <td className="vertical"></td>
          <td className="vertical"></td>
          <td className="vertical"></td>
        </tr>
        <tr>
          <th className="vertical-heading">7 пара <br />19:10 20:40</th>
          <td className="vertical"></td>
          <td className="vertical"><button className="netology-lesson">
            <span className="company-name"><img src={camera} alt={camera} /> Нетология<br /></span>
            <span className="lesson-name">Введение в специальность</span></button></td>
          <td className="vertical"><button className="netology-lesson">
            <span className="company-name"><img src={camera} alt={camera} /> Нетология<br /></span>
            <span className="lesson-name">Программирование на Python</span></button></td>
          <td className="vertical"><button className="TyumGU-lesson">
            <span className="company-name"><img src={camera} alt={camera} /> ТюмГУ<br /></span>
            <span className="lesson-name">Алгебра</span></button></td>
          <td className="vertical"></td>
          <td className="vertical"></td>
          <td className="vertical"></td>
        </tr>
      </table>
    </header>
  );
}
