import React, { useState } from 'react';

const Login = ({ onLogin, title, name, formId }) => {
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
            <div class="loginLogo-container">
                <center><img src={`/${formId}.png`} alt={`Лого ${name}`} class="loginLogo"/></center>
            </div>
            <label>{title}</label>
            <div style={{ display: "flex", flexDirection: "column" }}>
                <input
                   type="hidden"
                     name="login_system"
                     value={formId}  
                />
                <input
                    className="input-email"
                    type="email"
                    id={`email-${formId}`}
                    name={`email-${formId}`}
                    placeholder={`Логин от ${name}`}
                    autoComplete={`${formId}-email`}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    className="input-email"
                    type="password"
                    id={`password-${formId}`}
                    name={`password-${formId}`}
                    placeholder={`Пароль от ${name}`}
                    utoComplete={`${formId}-current-password`}
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
