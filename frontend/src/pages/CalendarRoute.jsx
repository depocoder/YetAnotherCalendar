import React, { useEffect, useState } from 'react';
import { getNetologyCourse, bulkEvents } from '../services/api'; // Ваши API-запросы
import Calendar from "../components/Calendar/Calendar";
// import Header from "../components/Header/Header";

const CalendarRoute = ({ email, password, personId, token }) => {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

   // Функция для загрузки событий из localStorage
  const loadEventsFromLocalStorage = () => {
    const savedEvents = localStorage.getItem('events');
    if (savedEvents) {
      return JSON.parse(savedEvents);
    }
    return null;
  };

  // Сохраняем события в localStorage
  const saveEventsToLocalStorage = (eventsData) => {
    localStorage.setItem('events', JSON.stringify(eventsData));
  };

  useEffect(() => {
    const fetchCourseAndEvents = async () => {
      // Попытка загрузки событий из localStorage
      const cachedEvents = loadEventsFromLocalStorage();
      if (cachedEvents) {
        console.log("События загружены из localStorage:", cachedEvents);
        setEvents(cachedEvents);
        setLoading(false);
        return;
      }

      if (!token || !email || !password || !personId) {
        console.error('Ошибка авторизации. Проверьте введенные данные.');
        return;
      }

      try {
        const courseData = await getNetologyCourse(token);
        console.log('Данные курса:', courseData);

        const fetchedCalendarId = courseData?.id;

        if (fetchedCalendarId) {
          const eventsResponse = await bulkEvents(
            email, // Email пользователя
            password, // Пароль пользователя
            token, // Токен сессии
            fetchedCalendarId, // ID календаря
            "2024-10-14T00:00:00+03:00", // Дата начала
            "2024-10-20T23:59:59+03:00", // Дата окончания
            personId // ID участника
          );
          console.log('События:', eventsResponse.data);
          setEvents(eventsResponse.data);

          // Сохраняем события в localStorage
          saveEventsToLocalStorage(eventsResponse.data);
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
      <div className="calendar-page">
        <Calendar events={events}/>
        {/*<Header />*/}
      </div>
  );
};

export default CalendarRoute;
