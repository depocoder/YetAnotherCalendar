import { useState } from "react";
import Login from "../components/login/login";
import { loginLms, loginModeus, loginNetology } from "../services/api";
import { useLocation, useNavigate } from "react-router-dom";
import '../style/login.scss';
import { toast } from 'react-toastify';

const LoginPage = () => {
    const [isNetologyLoggedIn, setIsNetologyLoggedIn] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleNetologyLogin = async (email, password) => {
        try {
            const response = await loginNetology(email, password);

            if (response.status === 200) {
                localStorage.setItem('token', response.data["_netology-on-rails_session"]);
                setIsNetologyLoggedIn(true);
                navigate("/login/modeus");
                return { success: true };
            }

            if (response.status === 401) {
                toast.error("Неверный логин или пароль.");
                return { success: false, message: "Неверный логин или пароль." };
            }

            if (response.status === 429) {
                const detail = response.data?.detail || '';
                // Извлекаем время из английского сообщения
                const timeMatch = detail.match(/(\d+)\s+seconds?/);
                const seconds = timeMatch ? timeMatch[1] : '';
                const message = seconds 
                    ? `Слишком много попыток. Попробуйте через ${seconds} секунд.`
                    : 'Слишком много неудачных попыток. Попробуйте позже.';
                toast.error(message);
                return { success: false, message: message };
            }

            if (response.status === 400 || response.status === 422) {
                toast.error("Были переданы неверные данные.");
                return { success: false, message: "Неверные данные." };
            }

            toast.error("Произошла ошибка. Попробуйте снова.");
            return { success: false, message: "Произошла ошибка." };

        } catch (error) {
            console.error("Ошибка при входе в Нетологию:", error);
            toast.error("Ошибка сети. Попробуйте позже.");
            return { success: false, message: "Ошибка сети." };
        }
    };

    const handleModeusLogin = async (email, password) => {
        try {
            const modeusResponse = await loginModeus(email, password);

            if (modeusResponse.status === 200) {
                localStorage.setItem('jwt-token', modeusResponse.data);

                const lmsResponse = await loginLms(email, password);

                if (lmsResponse.status === 200) {
                    localStorage.setItem('lms-id', lmsResponse.data.id);
                    localStorage.setItem('lms-token', lmsResponse.data.token);
                    navigate("/");
                    return { success: true };
                }

                if (lmsResponse.status === 401) {
                    toast.error("Неверный логин или пароль для LMS Нетологии.");
                    return { success: false };
                }

                if (lmsResponse.status === 400 || lmsResponse.status === 422) {
                    toast.error("Неверные данные LMS. Проверьте почту.");
                    return { success: false };
                }

                toast.error("Ошибка входа в LMS. Попробуйте снова.");
                return { success: false };
            }

            if (modeusResponse.status === 401) {
                toast.error("Неверный логин или пароль для Modeus.");
                return { success: false };
            }

            if (modeusResponse.status === 429) {
                const detail = modeusResponse.data?.detail || '';
                // Извлекаем время из английского сообщения
                const timeMatch = detail.match(/(\d+)\s+seconds?/);
                const seconds = timeMatch ? timeMatch[1] : '';
                const message = seconds 
                    ? `Слишком много попыток входа в Modeus. Попробуйте через ${seconds} секунд.`
                    : 'Слишком много неудачных попыток входа в Modeus. Попробуйте позже.';
                toast.error(message);
                return { success: false };
            }

            if (modeusResponse.status === 400 || modeusResponse.status === 422) {
                toast.error("Неверные данные Modeus. Проверьте почту.");
                return { success: false };
            }

            toast.error("Ошибка входа в Modeus. Попробуйте снова.");
            return { success: false };

        } catch (error) {
            console.error("Ошибка при входе в Modeus:", error);
            toast.error("Ошибка сети при входе в Modeus.");
            return { success: false };
        }
    };

    const isNetologyRoute = location.pathname === "/login";
    const isModeusRoute = location.pathname === "/login/modeus";

    return (
        <div className="login-container">
            <h2 className="login-container__title shedule-login">Мое расписание</h2>

            {isNetologyRoute && (
                <Login
                    key="netology"
                    onLogin={handleNetologyLogin}
                    title="Введите логин и пароль от Нетологии, чтобы увидеть свое расписание"
                    name="Нетологии"
                    formId="netology"
                />
            )}

            {isModeusRoute && isNetologyLoggedIn && (
                <Login
                    key="modeus"
                    onLogin={handleModeusLogin}
                    title="Введите логин и пароль от Модеус, чтобы увидеть lms в своем расписании"
                    name="Модеус"
                    formId="modeus"
                />
            )}
        </div>
    );
};

export default LoginPage;
