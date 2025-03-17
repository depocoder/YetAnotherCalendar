import React, { useState } from 'react';

const Login = ({ onLogin, title, name, error }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const onClickLogin = async (e) => {
        e.preventDefault(); // Предотвращаем стандартное поведение формы

        try {
            // Вызываем функцию входа и получаем результат
            const result = await onLogin(email, password);

            if (!result.success) {
                // Если вход неуспешен, показываем сообщение об ошибке
                console.error(result.message || "Произошла ошибка.");
            }
        } catch (error) {
            console.error("Не удалось выполнить вход. Попробуйте снова.");
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
                    required // Добавляем атрибут required для обязательного поля
                />
                <input
                    className="input-email"
                    type="password"
                    placeholder={`Пароль от ${name}`}
                    onChange={(e) => setPassword(e.target.value)}
                    required // Добавляем атрибут required для обязательного поля
                />
            </div>

            {/* Сообщение об ошибке */}
            {error && <p className="error-message">{error}</p>}

            <button
                className="login-btn-log"
                id="login"
                onClick={onClickLogin}
                disabled={!email || !password} // Блокируем кнопку, если поля пустые
            >
                Войти
            </button>
        </div>
    );
};

export default Login;