import React, { useEffect, useState } from 'react';
import {getNetologyCourse, bulkEvents, getTokenFromLocalStorage, getPersonIdLocalStorage} from '../services/api'; // Ваши API-запросы
import Calendar from "../components/Calendar/Calendar";
import Loader from "../elements/Loader";
// import Header from "../components/Header/Header";

const CalendarRoute = () => {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Создаем состояние для дат
    const [date, setDate] = useState({
        start: "2024-10-21T00:00:00+03:00",   // Дата начала
        end:   "2024-10-27T23:59:59+03:00"    // Дата окончания
    });

  useEffect(() => {
    const fetchCourseAndEvents = async () => {

      try {
        const courseData = await getNetologyCourse(getTokenFromLocalStorage());
        // console.log('Данные курса:', courseData);
        const calendarId = courseData?.id;
        // console.log('calendarId add storage', calendarId)
        localStorage.setItem('calendarId', calendarId);


        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log("Current time zone:", timeZone);

        if (calendarId) {
          const eventsResponse = await bulkEvents(
            getTokenFromLocalStorage(), // Токен сессии
            calendarId, // ID календаря
            date.start, // Дата начала
            date.end, // Дата окончания
            getPersonIdLocalStorage(), // ID участника
              Intl.DateTimeFormat().resolvedOptions().timeZone
          );

          console.log('События:', eventsResponse.data);
          setEvents(eventsResponse.data);
        }
      } catch (error) {
        console.error('Ошибка при получении данных с сервера:', error);
        setError("Ошибка при получении данных с сервера.");
      } finally {
        setLoading(false);
      }

      }
    fetchCourseAndEvents();

  }, [date.start, date.end]);

  if (loading) {
    return (
        <div className="loader-container">
          <Loader />
        </div>
    );
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
      <div className="calendar-page">
        <Calendar events={events} date={date} />
        {/*<Header />*/}
      </div>
  );
};

export default CalendarRoute;
