import React from "react";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  return (
    <header>
      <div>
        <span className="raspisanie">Мое расписание</span>
        <button className="export-btn">Экспорт .ics</button>
        <button className="login-btn" onClick={() => navigate("/login")}>
          Войти
        </button>
      </div>
    </header>
  );
}
