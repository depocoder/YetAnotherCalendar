import React from 'react';
import cross from "../../img/cross.png";

const ExitBtn = ({ onExit }) => {
    return (
        <div className="exit-btn" onClick={onExit}>
            Выйти
            <img className="exit-btn-cross" src={cross} alt="exit" />
        </div>
    );
};

export default ExitBtn;
