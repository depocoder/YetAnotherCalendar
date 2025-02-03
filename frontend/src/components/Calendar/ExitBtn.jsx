import React from 'react';
import {useNavigate} from "react-router-dom";
import cross from "../../img/cross.png";

const ExitBtn = () => {
    const navigate = useNavigate();

    const exitApp = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <div className="exit-btn" onClick={exitApp}> Выйти
            <img className="exit-btn-cross" src={cross} alt="exit"/>
        </div>
    );
};

export default ExitBtn;