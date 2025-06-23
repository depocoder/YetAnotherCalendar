import { Navigate } from "react-router-dom";

// Компонент для защиты маршрутов
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token"); // Проверяем наличие токена

  if (!token) {
    // Если токена нет, перенаправляем на страницу логина
    return <Navigate to="/login" />;
  }
  // Если токен есть, отображаем защищённый компонент
  return children;
};

export default PrivateRoute;

