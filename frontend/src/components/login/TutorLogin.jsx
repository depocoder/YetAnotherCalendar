import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { tutorLogin } from '../../services/api';
import InlineLoader from '../../elements/InlineLoader';
import '../../style/tutor-login.scss';

const TutorLogin = ({ onSuccess }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!password.trim()) {
            toast.error('Введите пароль');
            return;
        }

        setLoading(true);
        try {
            const response = await tutorLogin(password);
            localStorage.setItem('tutorToken', response.access_token);
            toast.success('Авторизация успешна');
            onSuccess();
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error('Invalid password');
            } else if (error.response?.status === 429) {
                const message = error.response?.data?.detail || 'Too many failed attempts. Please try again later.';
                toast.error(message);
            } else {
                toast.error('Ошибка авторизации');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tutor-login__container">
            <h2 className="tutor-login__title">Панель администратора</h2>
            
            <div className="tutor-login__form">
                <div className="tutor-login__logo-container">
                    <div className="tutor-login__logo">
                        👨‍🏫
                    </div>
                </div>
                
                <label>Введите пароль для доступа к панели администратора</label>
                
                <div className="tutor-login__input-container">
                    <input
                        className="tutor-login__input"
                        type="password"
                        id="tutor-password"
                        name="password"
                        placeholder="Пароль администратора"
                        autoComplete="current-password"
                        aria-label="Admin Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button
                    className="tutor-login__button"
                    type="submit"
                    onClick={handleSubmit}
                    disabled={!password.trim() || loading}
                >
                    {loading ? <InlineLoader /> : 'Войти'}
                </button>
            </div>
        </div>
    );
};

export default TutorLogin;