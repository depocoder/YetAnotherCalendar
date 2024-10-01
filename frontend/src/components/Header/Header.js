import React from "react";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  return (
    <header>
      <div className="header-line">
        <div className="raspisanie-export">
          <span className="raspisanie">Мое расписание</span>
          <button className="export-btn">Экспорт .ics</button>
        </div>
        <button className="login-btn" onClick={() => navigate("/login")}>
          Войти
        </button>
      </div>
      <table className="raspisanie-table">
        <tr>
          <td className="days"></td>
          <td className="days">Пн</td>
          <td className="days">Вт</td>
          <td className="days">Ср</td>
          <td className="days">Чт</td>
          <td className="days">Пт</td>
          <td className="days">Сб</td>
          <td className="days">Вс</td>
        </tr>
        <tr>
          <th className="vertical-zagolovok">
            дедлайны
            <button className="off-deadline">Скрыть</button>
          </th>
          <td className="vertical">1</td>
          <td className="vertical">2</td>
          <td className="vertical">3</td>
          <td className="vertical">4</td>
          <td className="vertical">5</td>
          <td className="vertical">6</td>
          <td className="vertical">7</td>
        </tr>
        <tr></tr>
        <tr>
          <th className="vertical-zagolovok">2 пара 10:15 11:45</th>
          <td className="vertical">1</td>
          <td className="vertical">2</td>
          <td className="vertical">3</td>
          <td className="vertical">4</td>
          <td className="vertical">5</td>
          <td className="vertical">6</td>
          <td className="vertical">7</td>
        </tr>
        <tr>
          <th className="vertical-zagolovok">3 пара 12:00 13:30</th>
          <td className="vertical">1</td>
          <td className="vertical">2</td>
          <td className="vertical">3</td>
          <td className="vertical">4</td>
          <td className="vertical">5</td>
          <td className="vertical">6</td>
          <td className="vertical">7</td>
        </tr>
        <tr>
          <th className="vertical-zagolovok">4 пара 14:00 15:30</th>
          <td className="vertical">1</td>
          <td className="vertical">2</td>
          <td className="vertical">3</td>
          <td className="vertical">4</td>
          <td className="vertical">5</td>
          <td className="vertical">6</td>
          <td className="vertical">7</td>
        </tr>
        <tr>
          <th className="vertical-zagolovok">5 пара 15:45 17:15</th>
          <td className="vertical">1</td>
          <td className="vertical">2</td>
          <td className="vertical">3</td>
          <td className="vertical">4</td>
          <td className="vertical">5</td>
          <td className="vertical">6</td>
          <td className="vertical">7</td>
        </tr>
        <tr>
          <th className="vertical-zagolovok">6 пара 17:30 19:00</th>
          <td className="vertical">1</td>
          <td className="vertical">2</td>
          <td className="vertical">3</td>
          <td className="vertical">4</td>
          <td className="vertical">5</td>
          <td className="vertical">6</td>
          <td className="vertical">7</td>
        </tr>
        <tr>
          <th className="vertical-zagolovok">7 пара 19:10 20:40</th>
          <td className="vertical">1</td>
          <td className="vertical">2</td>
          <td className="vertical">3</td>
          <td className="vertical">4</td>
          <td className="vertical">5</td>
          <td className="vertical">6</td>
          <td className="vertical">7</td>
        </tr>
      </table>
    </header>
  );
}
