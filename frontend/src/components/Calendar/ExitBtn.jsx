import React from 'react';
import { useNavigate } from "react-router-dom";
import { exitApp } from '../../utils/auth';
import cross from "../../img/cross.png";

const ExitBtn = () => {
    const navigate = useNavigate();

    const handleExit = () => {
        exitApp(navigate);
    };

    return (
        <div className="exit-btn" onClick={handleExit}>
            Выйти
            <img className="exit-btn-cross" src={cross} alt="exit" />
        </div>
    );
};

export default ExitBtn;
