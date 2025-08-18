import React from 'react';
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import cross from "../../img/cross.png";

const ExitBtn = () => {
    const navigate = useNavigate();

    const exitApp = () => {
        toast.info("Вы вышли из системы.");
        setTimeout(() => {
            // Сохраняем информацию о модальном окне GitHub перед очисткой
            const githubStarModalShown = localStorage.getItem('githubStarModalShown');
            const githubStarRemindDate = localStorage.getItem('githubStarRemindDate');
            
            localStorage.clear();
            
            // Восстанавливаем информацию о модальном окне GitHub после очистки
            if (githubStarModalShown) {
                localStorage.setItem('githubStarModalShown', githubStarModalShown);
            }
            if (githubStarRemindDate) {
                localStorage.setItem('githubStarRemindDate', githubStarRemindDate);
            }
            
            navigate("/login");
        }, 100); // ⏱ Даём время на показ уведомления
    };

    return (
        <div className="exit-btn" onClick={exitApp}>
            Выйти
            <img className="exit-btn-cross" src={cross} alt="exit" />
        </div>
    );
};

export default ExitBtn;
