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
  const [date] = useState({
    start: "2024-10-21T00:00:00+03:00",   // Дата начала
    end: "2024-10-27T23:59:59+03:00"    // Дата окончания
  });

  useEffect(() => {
    const fetchCourseAndEvents = async () => {

      try {
        const courseData = await getNetologyCourse(getTokenFromLocalStorage());
        const calendarId = courseData?.id;
        localStorage.setItem('calendarId', calendarId);

        console.log("Current time zone:", Intl.DateTimeFormat().resolvedOptions().timeZone);

        // Преобразование дат в формат UTC (без временной зоны +03:00)
        const convertToUTC = (dateString) => {
          const date = new Date(dateString);
          return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
              .toISOString()
              .replace('Z', '+00:00');
        };

        const startUTC = convertToUTC(date.start); // Преобразуем дату начала в UTC
        const endUTC = convertToUTC(date.end);     // Преобразуем дату окончания в UTC

        if (calendarId) {
          const eventsResponse = await bulkEvents({
            calendarId: calendarId, // ID календаря
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Часовой пояс
            attendeePersonId: getPersonIdLocalStorage(), // ID участника
            timeMin: startUTC, // Дата начала в формате UTC
            timeMax: endUTC, // Дата окончания в формате UTC
            sessionToken: getTokenFromLocalStorage(),
          });
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
