import React, {useCallback, useEffect, useState} from 'react';
import {
  getNetologyCourse,
  bulkEvents,
  getTokenFromLocalStorage,
  getPersonIdLocalStorage, getCalendarIdLocalStorage, refreshBulkEvents,
  // refreshBulkEvents
} from '../services/api'; // Ваши API-запросы
import Calendar from "../components/Calendar/Calendar";
import Loader from "../elements/Loader";
// import Header from "../components/Header/Header";

const CalendarRoute = () => {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cacheUpdated, setCacheUpdated] = useState(false);

  const timeOffset = parseInt(process.env.REACT_APP_TIME_OFFSET, 10) || 6;

  // Создаем состояние для дат
  const [date] = useState({
    start: "2024-10-21T00:00:00+03:00",   // Дата начала
    end: "2024-10-27T23:59:59+03:00"    // Дата окончания
  });

  // Преобразование дат в формат UTC (без временной зоны +03:00)
  const convertToUTC = (dateString) => {
    const date = new Date(dateString);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .replace('Z', '+00:00');
  };

  const fetchCourseAndEvents = useCallback(async () => {
      try {
        const courseData = await getNetologyCourse(getTokenFromLocalStorage());
        const calendarId = courseData?.id;
        localStorage.setItem('calendarId', calendarId);

        // console.log("Current time zone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
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

      }, [date.start, date.end])
  const handleRefreshEvents = useCallback(async () => {
      // const startUTC = new Date().toISOString();
      // const endUTC = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Дата через 7 дней
      const startUTC = convertToUTC(date.start); // Преобразуем дату начала в UTC
      const endUTC = convertToUTC(date.end);     // Преобразуем дату окончания в UTC

      try {
        const refreshEventsResponse = await refreshBulkEvents({
          calendarId: getCalendarIdLocalStorage(), // ID календаря
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Часовой пояс
          attendeePersonId: getPersonIdLocalStorage(), // ID участника
          timeMin: startUTC, // Дата начала в формате UTC
          timeMax: endUTC, // Дата окончания в формате UTC
          sessionToken: getTokenFromLocalStorage(),
        });

        console.log('Обновленные события:', refreshEventsResponse.data);
        setEvents(refreshEventsResponse.data); // Обновляем события

        // Показываем сообщение и скрываем его через 3 секунды
        setCacheUpdated(true);
        setTimeout(() => {
          setCacheUpdated(false);
        }, 3000); // Скрыть через 3 секунды

      } catch (error) {
        console.error('Ошибка при обновлении событий:', error);
      }
     }, [date.start, date.end])

  useEffect(() => {
    const intervalTime = timeOffset * 60 * 60 * 1000; // Преобразуем время из часов в миллисекунды
    fetchCourseAndEvents();

    // Автоматический вызов функции обновления
    const intervalId = setInterval(() => {
      handleRefreshEvents();
      console.log('handleRefreshEvents')
    }, intervalTime); // 6 часов
    return () => clearInterval(intervalId);

  }, [fetchCourseAndEvents, handleRefreshEvents, timeOffset]);

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
        <Calendar events={events} date={date} onRefresh={handleRefreshEvents} cacheUpdated={cacheUpdated} />
        {/*<Header />*/}
      </div>
  );
};

export default CalendarRoute;
