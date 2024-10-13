import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginRoute from './pages/LoginRoute';
import CalendarRoute from './pages/CalendarRoute';
import { loginModeus, searchModeus } from './services/api'; // Ваши API-запросы

const App = () => {
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    personId: ''
  });

  // Функция для обработки логина
  const handleLogin = async (email, password, personId) => {
    console.log('handleLogin personId', personId)
    try {
      let response = await loginModeus(email, password);

      console.log('response handleLogin', response)

      if (response.status === 200) {
        setAuthData({ email, password, personId });
        localStorage.setItem('token', response.data["_netology-on-rails_session"]);
        return { success: true };
      } else {
        return { success: false, message: "Неверный логин или пароль." };
      }
    } catch (error) {
      return { success: false, message: "Произошла ошибка. Попробуйте снова." };
    }
  };

  // Функция для поиска пользователя по ФИО
  const handleSearch = async (fullName) => {
    try {
      let response = await searchModeus(fullName);

      if (response.status === 200) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: "Неверное ФИО. Попробуйте снова." };
      }
    } catch (error) {
      return { success: false, message: "Произошла ошибка. Попробуйте снова." };
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginRoute onLogin={handleLogin} onSearch={handleSearch} />} />
        <Route
          path="/calendar"
          element={
            <CalendarRoute
              email={authData.email}
              password={authData.password}
              personId={authData.personId}
              token={localStorage.getItem('token')}
            />
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
