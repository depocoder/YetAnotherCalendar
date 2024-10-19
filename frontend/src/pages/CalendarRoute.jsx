import React, { useEffect, useState } from 'react';
import {getNetologyCourse, bulkEvents, getTokenFromLocalStorage, getPersonIdLocalStorage} from '../services/api'; // Ваши API-запросы
import Calendar from "../components/Calendar/Calendar";
// import Header from "../components/Header/Header";

const CalendarRoute = () => {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

   // Функция для загрузки событий из localStorage
  // const loadEventsFromLocalStorage = () => {
  //   const savedEvents = localStorage.getItem('events');
  //   if (savedEvents) {
  //     return JSON.parse(savedEvents);
  //   }
  //   return null;
  // };

  // Сохраняем события в localStorage
  // const saveEventsToLocalStorage = (eventsData) => {
  //   localStorage.setItem('events', JSON.stringify(eventsData));
  // };

  useEffect(() => {
    const fetchCourseAndEvents = async () => {
      // Попытка загрузки событий из localStorage
      // const cachedEvents = loadEventsFromLocalStorage();
      // if (cachedEvents) {
      //   console.log("События загружены из localStorage:", cachedEvents);
      //   setEvents(cachedEvents);
      //   setLoading(false);
      //   return;

      try {
        const courseData = await getNetologyCourse(getTokenFromLocalStorage());
        // console.log('Данные курса:', courseData);
        const calendarId = courseData?.id;
        // console.log('calendarId add storage', calendarId)
        localStorage.setItem('calendarId', calendarId);


        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log("Current time zone:", timeZone);


        // console.log("Session Token:", getTokenFromLocalStorage());
        // console.log("Calendar ID:", calendarId);
        // console.log("Person ID:", getPersonIdLocalStorage());

        if (calendarId) {
          const eventsResponse = await bulkEvents(
            getTokenFromLocalStorage(), // Токен сессии
            calendarId, // ID календаря
            "2024-10-21T00:00:00+03:00", // Дата начала
            "2024-10-27T23:59:59+03:00", // Дата окончания
            getPersonIdLocalStorage(), // ID участника
              Intl.DateTimeFormat().resolvedOptions().timeZone
          );

          // if (eventsResponse.)
          console.log('События:', eventsResponse.data);
          setEvents(eventsResponse.data);
          // cached_at
          // localStorage.setItem('cached_at', eventsResponse.data.cached_at); // Сохраняем cached_at localstorage
          // console.log('eventsResponse.data.cached_at', eventsResponse.data.cached_at)
          // Сохраняем события в localStorage
          // saveEventsToLocalStorage(eventsResponse.data);
        }
      } catch (error) {
        console.error('Ошибка при получении данных с сервера:', error);
        setError("Ошибка при получении данных с сервера.");
      } finally {
        setLoading(false);
      }

      }




      // if (getTokenFromLocalStorage() || getPersonIdLocalStorage()) {

        // console.error('Ошибка авторизации. Проверьте введенные данные.');
        // return;
      // }
    fetchCourseAndEvents();

  }, []);

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
