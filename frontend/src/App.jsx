import React, {useState} from 'react';
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import LoginRoute from './pages/LoginRoute';
import CalendarRoute from './pages/CalendarRoute';
import {loginModeus, searchModeus} from './services/api';
import PrivateRoute from "./components/Calendar/PrivateRoute"; // Ваши API-запросы

const App = () => {
    const [authData, setAuthData] = useState({
        email: '',
        password: '',
    });

    // Функция для обработки логина
    const handleLogin = async (email, password) => {
        try {
            let response = await loginModeus(email, password);

            if (response.status === 200) {
                setAuthData({email, password});
                localStorage.setItem('token', response.data["_netology-on-rails_session"]);

                return {success: true};
            } else {
                return {success: false, message: "Неверный логин или пароль."};
            }
        } catch (error) {
            return {success: false, message: "Произошла ошибка. Попробуйте снова."};
        }
    };

    // Функция для поиска пользователя по ФИО
    const handleSearch = async (fullName) => {
        try {
            let response = await searchModeus(fullName);
            console.log('fullname response', response.data)

            if (response.status === 200) {
                return {success: true, data: response.data};
            } else {
                return {success: false, message: "Неверное ФИО. Попробуйте снова."};
            }
        } catch (error) {
            return {success: false, message: "Произошла ошибка. Попробуйте снова."};
        }
    };

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<LoginRoute onLogin={handleLogin} onSearch={handleSearch}/>}/>
                <Route
                    path="/calendar"
                    element={
                        <PrivateRoute>
                            <CalendarRoute
                                email={authData.email}
                                password={authData.password}
                            />
                        </PrivateRoute>
                    }
                />
                {/* Дефолтный маршрут, который перенаправляет на /login */}
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </Router>
    );
};

export default App;
