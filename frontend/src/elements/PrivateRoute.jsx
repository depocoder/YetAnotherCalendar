import { Navigate, useSearchParams } from "react-router-dom";
import { getCalendarIdsLocalStorage, getModeusPersonIdFromLocalStorage } from '../services/api';

// Компонент для защиты маршрутов
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token"); // Проверяем наличие токена
  const [params] = useSearchParams();
  const cachedAccess = params.get('cache_only') === 'true'
      && getModeusPersonIdFromLocalStorage() && getCalendarIdsLocalStorage().length > 0;

  if (!token && !cachedAccess) {
    // Если токена нет, перенаправляем на страницу логина
    return <Navigate to="/login" />;
  }
  // Если токен есть, отображаем защищённый компонент
  return children;
};

export default PrivateRoute;

