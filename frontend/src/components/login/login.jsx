import React, {useState} from 'react';
import {useNavigate} from "react-router-dom";

const Login = ({ onLogin, title, name }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState("");
    // const navigate = useNavigate(); // Навигация

      const onClickLogin = async () => {
        const result = await onLogin(email, password);

        if (result.success) {
            // localStorage.setItem('personId', personId); // Сохраняем personId localstorage
            setErrorMessage(""); // Очищаем ошибку при успешном логине
            // navigate("/");
        } else {
            setErrorMessage(result.message);
        }
    };

    return (
        <div className="login-netologiya">
            <label>{title}</label>
            <div style={{display: "flex", flexDirection: "column"}}>
                <input
                    className="input-email"
                    type="email"
                    placeholder={`Логин от ${name}`}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    className="input-email"
                    type="password"
                    placeholder={`Пароль от ${name}`}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            {/* Сообщение об ошибке */}
            {errorMessage && <p className="error-message">{errorMessage}</p>}

            <button className="login-btn-log" id="login" onClick={onClickLogin}>
                Войти
            </button>
        </div>
    );
};

export default Login;