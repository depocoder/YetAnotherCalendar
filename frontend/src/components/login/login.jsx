import React, { useState } from 'react';
import InlineLoader from '../../elements/InlineLoader';

const Login = ({ onLogin, title, name, formId }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const onClickLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await onLogin(email, password);

            if (!result.success) {
                console.error(result.message || "Произошла ошибка.");
            }
        } catch (error) {
            console.error("Ошибка при выполнении входа:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-netologiya">
            <div className="loginLogo-container">
                <center><img src={`/${formId}.png`} alt={`Лого ${name}`} className="loginLogo"/></center>
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
                    name="email"
                    placeholder={`Логин от ${name}`}
                    autoComplete="username"
                    aria-label={`Login ${name}`}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <input
                    className="input-email"
                    type="password"
                    id={`password-${formId}`}
                    name="password"
                    placeholder={`Пароль от ${name}`}
                    autoComplete="current-password"
                    aria-label={`Password ${name}`}
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
                {loading ? <InlineLoader /> : 'Войти'}
            </button>
        </div>
    );
};

export default Login;
