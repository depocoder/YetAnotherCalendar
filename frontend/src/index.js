import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import reportWebVitals from "./reportWebVitals";
import ReactDOM from "react-dom/client";

import DataPicker from "./components/Calendar/DataPicker"
import Header from "./components/Header/Header";
import LoginRoute from "./pages/LoginRoute";
import CalendarRoute from "./pages/CalendarRoute";
import { AuthProvider } from './context/AuthContext';

import "./index.scss";
import PrivateRoute from "./components/Calendar/PrivateRoute";

const checkAuth = () => {
  // Проверка наличия токена в localStorage
  return localStorage.getItem("token");
};

const root = ReactDOM.createRoot(document.getElementById("root"));
const router = createBrowserRouter([
    {
     path: "/",
     element: checkAuth() ? <CalendarRoute /> : <LoginRoute />,
    // Если токен есть — перенаправляем на /calendar, если нет — на /login
  },
  {
    path: "/login",
    element: checkAuth() ? <CalendarRoute /> : <LoginRoute />,
      // Перенаправление на календарь, если уже залогинен
  },
  {
    path: "/calendar",
    element: (
      <>
        <Header />
        <DataPicker />
      </>
      // <PrivateRoute>
        // <CalendarRoute />
      // </PrivateRoute>
    ), // Защищаем страницу календаря
  },
]);

root.render(
  <React.StrictMode>
      <AuthProvider> {/* Оборачиваем в AuthProvider  для контекста */}
        <RouterProvider router={router} />
      </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();
