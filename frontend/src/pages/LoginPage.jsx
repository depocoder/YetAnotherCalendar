import {useState} from "react";
import Login from "../components/login/login";
import {loginModeus, loginNetology} from "../services/api";
import {useNavigate} from "react-router-dom";

import '../style/login.scss';



const LoginPage = () => {
    const [isNetologyLoggedIn, setIsNetologyLoggedIn] = useState(false); // Флаг для первой формы
    const [isModeusLoggedIn, setIsModeusLoggedIn] = useState(false); // Флаг для второй формы
    const navigate = useNavigate(); // Навигация

    const handleNetologyLogin = async (email, password) => {
        try {
            let response = await loginNetology(email, password);

            if (response.status === 200) {
                // setAuthData({email, password});
                localStorage.setItem('token', response.data["_netology-on-rails_session"]);
                setIsNetologyLoggedIn(true); // Успешный вход в Нетологию
                return {success: true};
            } if (response.status === 401) {
                return {success: false, message: "Неверный логин или пароль."};
            } if (response.status === 400 || response.status === 422) {
                return {success: false, message: "Были переданы неверный данные"};
            } else {
                return {success: false, message: "Произошла ошибка. Попробуйте снова."};
            }
        } catch (error) {
            return {success: false, message: "Произошла ошибка. Попробуйте снова."};
        }
    };

    const handleModeusLogin = async (email, password) => {
        try {
            let response = await loginModeus(email, password);

            if (response.status === 200) {
                // setAuthData({email, password});
                localStorage.setItem('jwt-token', response.data);
                setIsModeusLoggedIn(true); // Успешный вход в Модеус
                navigate("/");
                return {success: true};
            } if (response.status === 401) {
                return {success: false, message: "Неверный логин или пароль."};
            } if (response.status === 400 || response.status === 422) {
                return {
                    success: false, message: "Были переданы неверный данные, проверьте правильность введенной почты."};
            } else {
                return {success: false, message: "Произошла ошибка. Попробуйте снова."};
            }
        } catch (error) {
            return {success: false, message: "Произошла ошибка. Попробуйте снова."};
        }
    };

    return (
        <div className="login-container">
            <h2 className="login-container__title shedule-login">Мое расписание</h2>

            {!isNetologyLoggedIn && ( // Показывать форму Нетологии, если вход не выполнен
                <Login
                    onLogin={handleNetologyLogin}
                    title="Введите логин и пароль от Нетологии, чтобы увидеть свое расписание"
                    name="Нетологии"
                />
            )}
            {isNetologyLoggedIn && !isModeusLoggedIn && ( // Показывать форму Модеус только после успешного входа в Нетологию
                <Login
                    onLogin={handleModeusLogin}
                    title="Введите логин и пароль от Модеус, чтобы увидеть lms в своем расписании"
                    name="Модеус"
                />
            )}
        </div>
    );
};

export default LoginPage;
