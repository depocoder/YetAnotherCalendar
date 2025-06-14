import { useState } from "react";
import Login from "../components/login/login";
import { loginLms, loginModeus, loginNetology } from "../services/api";
import { useNavigate } from "react-router-dom";
import '../style/login.scss';
import { toast } from 'react-toastify';

const LoginPage = () => {
    const [isNetologyLoggedIn, setIsNetologyLoggedIn] = useState(false);
    const navigate = useNavigate();

    const handleNetologyLogin = async (email, password) => {
        try {
            const response = await loginNetology(email, password);

            if (response.status === 200) {
                localStorage.setItem('token', response.data["_netology-on-rails_session"]);
                setIsNetologyLoggedIn(true);

                // Редирект на поддомен modeus (локально или в проде)
                const { protocol, hostname } = window.location;
                const isDev = hostname.includes("localhost");
                const modeusHost = isDev
                    ? 'modeus.localhost:3000'
                    : 'modeus.yetanothercalendar.ru';
                window.location.href = `${protocol}//${modeusHost}/login`;
                return { success: true };
            }

            if (response.status === 401) {
                toast.error("Неверный логин или пароль.");
                return { success: false, message: "Неверный логин или пароль." };
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


    // Определяем, какую форму авторизации отображать в зависимости от домена и маршрута:
    // - Если поддомен содержит "modeus" и путь содержит "/login", рендерим форму авторизации Модеуса
    // - Во всех остальных случаях, если путь содержит "/login", рендерим форму авторизации Нетологии

    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    const isLoginRoute = pathname.includes("/login");
    const isModeusDomain = hostname.includes("modeus");

    const showModeus = isLoginRoute && isModeusDomain;
    const showNetology = isLoginRoute && !isModeusDomain;

    return (
        <div className="login-container">
            <h2 className="login-container__title shedule-login">Мое расписание</h2>

            {showNetology && (
                <Login
                    key="netology"
                    onLogin={handleNetologyLogin}
                    title="Введите логин и пароль от Нетологии, чтобы увидеть свое расписание"
                    name="Нетологии"
                    formId="netology"
                />
            )}

            {showModeus && isNetologyLoggedIn && (
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
