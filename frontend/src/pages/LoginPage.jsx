import { useState } from "react";
import Login from "../components/login/login";
import { loginLms, loginModeus, loginNetology } from "../services/api";
import { useLocation, useNavigate } from "react-router-dom";
import '../style/login.scss';

const LoginPage = () => {
    const [isNetologyLoggedIn, setIsNetologyLoggedIn] = useState(false);
    const [error, setError] = useState(""); // Состояние для хранения ошибок
    const navigate = useNavigate(); // Навигация
    const location = useLocation(); // Получаем текущий маршрут

    const handleNetologyLogin = async (email, password) => {
        try {
            let response = await loginNetology(email, password);

            console.log('response', response)

            if (response.status === 200) {
                localStorage.setItem('token', response.data["_netology-on-rails_session"]);
                setIsNetologyLoggedIn(true); // Успешный вход в Нетологию
                setError(""); // Очищаем ошибку
                navigate("/login/modeus"); // Переходим на страницу логина Модеуса
                return { success: true };
            } if (response.status === 401) {
                return {success: false, message: "Неверный логин или пароль."};
            } if (response.status === 400 || response.status === 422) {
                return {success: false, message: "Были переданы неверный данные"};
            } if (response.status === 401) {
                return {success: false, message: "Неверный логин или пароль."};
            } if (response.status === 400 || response.status === 422) {
                return {success: false, message: "Были переданы неверный данные"};
            } else {
                return {success: false, message: "Произошла ошибка. Попробуйте снова."};
            }
        } catch (error) {
            setError("Произошла ошибка. Попробуйте снова."); // Устанавливаем сообщение об ошибке
            return { success: false };
        }
    };

    const handleModeusLogin = async (email, password) => {
        try {
            // Шаг 1: Вход в Модеус
            let modeusResponse = await loginModeus(email, password);

            if (modeusResponse.status === 200) {
                localStorage.setItem('jwt-token', modeusResponse.data);

                // Шаг 2: Вход в LMS
                let lmsResponse = await loginLms(email, password);

                if (lmsResponse.status === 200) {
                    // Сохраняем id и token от LMS
                    localStorage.setItem('lms-id', lmsResponse.data.id);
                    localStorage.setItem('lms-token', lmsResponse.data.token);

                    // Переходим на главную страницу после успешного входа
                    setError(""); // Очищаем ошибку
                    navigate("/");
                    return { success: true };
                } if (lmsResponse.status === 401) {
                    return {success: false, message: "Неверный логин или пароль."};
                } if (lmsResponse.status === 400 || lmsResponse.status === 422) {
                    return { success: false, message: "Были переданы неверный данные, проверьте правильность введенной почты."}
                } else {
                    return {success: false, message: "Произошла ошибка. Попробуйте снова."};
                }


            } if (modeusResponse.status === 401) {
                    return {success: false, message: "Неверный логин или пароль."};
            } if (modeusResponse.status === 400 || modeusResponse.status === 422) {
                return { success: false, message: "Были переданы неверный данные, проверьте правильность введенной почты."}
            } else {
                return {success: false, message: "Произошла ошибка. Попробуйте снова."};
            }
        } catch (error) {
            setError("Произошла ошибка. Попробуйте снова."); // Устанавливаем сообщение об ошибке
            return { success: false };
        }
    };

    // Определяем, какой маршрут активен
    const isNetologyRoute = location.pathname === "/login";
    const isModeusRoute = location.pathname === "/login/modeus";

    return (
        <div className="login-container">
            <h2 className="login-container__title shedule-login">Мое расписание</h2>

            {/* Форма для входа в Нетологию */}
            {isNetologyRoute && (
                <Login
                    onLogin={handleNetologyLogin}
                    title="Введите логин и пароль от Нетологии, чтобы увидеть свое расписание"
                    name="Нетологии"
                    error={error} // Передаем ошибку в компонент Login
                />
            )}

            {/* Форма для входа в Модеус */}
            {isModeusRoute && isNetologyLoggedIn && (
                <Login
                    onLogin={handleModeusLogin}
                    title="Введите логин и пароль от Модеус, чтобы увидеть lms в своем расписании"
                    name="Модеус"
                    error={error} // Передаем ошибку в компонент Login
                />
            )}
        </div>
    );
};

export default LoginPage;