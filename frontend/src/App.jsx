// import React, {useState} from 'react';
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import CalendarPage from './pages/CalendarPage';
import ModeusDaySchedulePage from './pages/ModeusDaySchedulePage';
import TutorLoginPage from './pages/TutorLoginPage';
import AboutPage from './pages/AboutPage';
import FeedbackPage from './pages/FeedbackPage';
import NotFoundPage from './pages/NotFoundPage';
import PrivateRoute from "./elements/PrivateRoute";
import TutorPrivateRoute from "./elements/TutorPrivateRoute";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
    // const [authData, setAuthData] = useState({
    //     email: '',
    //     password: '',
    // });

    return (
        <Router>
            <Routes>
                <Route path="/login" element={ <LoginPage /> }/>
                {/* Маршрут для входа в Модеус */}
                <Route path="/login/modeus" element={<LoginPage />} />
                <Route path="/"
                    element={
                        <PrivateRoute>
                            <CalendarPage />
                        </PrivateRoute>
                    }
                />
                {/* Вход для преподавателей */}
                <Route path="/admin/login" element={<TutorLoginPage />} />
                {/* Маршрут для расписания Modeus на день */}
                <Route path="/admin/calendar-links"
                    element={
                        <TutorPrivateRoute>
                            <ModeusDaySchedulePage />
                        </TutorPrivateRoute>
                    }
                />
                {/* About page */}
                <Route path="/about" element={<AboutPage />} />
                {/* Feedback page */}
                <Route path="/feedback" element={<FeedbackPage />} />
                {/* 404 страница */}
                <Route path="/404" element={<NotFoundPage />} />
                {/* Дефолтный маршрут, который перенаправляет на /login */}
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
            <ToastContainer position="top-center" autoClose={3000} />
        </Router>
    );
};

export default App;
