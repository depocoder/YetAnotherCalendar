import React, { useState } from 'react';

const Login = ({ onLogin, title, name }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const onClickLogin = async (e) => {
        e.preventDefault();
        try {
            const result = await onLogin(email, password);

            if (!result.success) {
                console.error(result.message || "Произошла ошибка.");
            }
        } catch (error) {
            console.error("Ошибка при выполнении входа:", error);
        }
    };

    return (
        <div className="login-netologiya">
            <label>{title}</label>
            <div style={{ display: "flex", flexDirection: "column" }}>
                <input
                    className="input-email"
                    type="email"
                    placeholder={`Логин от ${name}`}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    className="input-email"
                    type="password"
                    placeholder={`Пароль от ${name}`}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>

            <button
                className="login-btn-log"
                id="login"
                onClick={onClickLogin}
                disabled={!email || !password}
            >
                Войти
            </button>
        </div>
    );
};

export default Login;
