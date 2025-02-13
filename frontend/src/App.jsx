// import React, {useState} from 'react';
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import CalendarPage from './pages/CalendarPage';
import PrivateRoute from "./elements/PrivateRoute";

const App = () => {
    // const [authData, setAuthData] = useState({
    //     email: '',
    //     password: '',
    // });

    return (
        <Router>
            <Routes>
                <Route path="/login" element={
                    <LoginPage
                        // setAuthData={setAuthData}
                    />
                }/>
                <Route
                    path="/"
                    element={
                        <PrivateRoute>
                            <CalendarPage
                                // email={authData.email}
                                // password={authData.password}
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
