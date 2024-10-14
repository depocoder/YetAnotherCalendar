import LoginRoute from "../../pages/LoginRoute";
// import React, {useEffect} from "react";
// import { useNavigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token"); // Проверяем наличие токена
  // const navigate = useNavigate();

  // useEffect(() => {
  //   if (!token) {
  //   // Если токена нет, перенаправляем на страницу логина
  //   // return <LoginRoute />;
  //    navigate("/login", { replace: true });
  //   }
  //   }, [token, navigate]);

  if (!token) {
    return <LoginRoute />; // Пока идет редирект, не отображаем ничего
  }

  return children; // Если токен есть, отображаем защищённый компонент
};

export default PrivateRoute;
