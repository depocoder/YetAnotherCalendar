import React, { useEffect, useState } from 'react';
import { getNetologyCourse, bulkEvents } from '../services/api'; // Ваши API-запросы
import Calendar from "../components/Calendar/Calendar";

const CalendarRoute = ({ email, password, personId, token }) => {
  console.log('Полученные данные:', { email, password, personId, token });
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    const fetchCourseAndEvents = async () => {
      if (!token || !email || !password || !personId) {
        console.error('Ошибка авторизации. Проверьте введенные данные.');
        return;
      }

      try {
        const courseData = await getNetologyCourse(token);
        console.log('Данные курса:', courseData); // Проверьте, что курс получен

        const fetchedCalendarId = courseData?.id;

        if (fetchedCalendarId) {
          const eventsResponse = await bulkEvents(
            email, // Email пользователя
            password, // Пароль пользователя
            token, // Токен сессии
            fetchedCalendarId, // ID календаря
            "2024-10-07T00:00:00+03:00", // Дата начала
            "2024-10-13T23:59:59+03:00", // Дата окончания
            personId // ID участника
          );
          console.log('События:', eventsResponse.data); // Проверьте, что события получены
          setEvents(eventsResponse.data);
        }
      } catch (error) {
        console.error('Ошибка при получении данных с сервера:', error);
        setError("Ошибка при получении данных с сервера.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourseAndEvents();
  }, [email, password, personId, token]);

  if (loading) {
    return <div>Загрузка данных...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
      <div className="calendar-container">
        <Calendar events={events}/>
      </div>
  );
};

export default CalendarRoute;
