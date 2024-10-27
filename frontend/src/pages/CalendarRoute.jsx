// import React, {useCallback, useEffect, useState} from 'react';
// import {
//   getNetologyCourse,
//   bulkEvents,
//   getTokenFromLocalStorage,
//   getPersonIdLocalStorage, getCalendarIdLocalStorage, refreshBulkEvents,
//   // refreshBulkEvents
// } from '../services/api'; // Ваши API-запросы
// import Calendar from "../components/Calendar/Calendar";
// import Loader from "../elements/Loader";
//
// const CalendarRoute = () => {
//   const [events, setEvents] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [cacheUpdated, setCacheUpdated] = useState(false);
//   // const [isFetching, setIsFetching] = useState(false);
//
//   const timeOffset = parseInt(process.env.REACT_APP_TIME_OFFSET, 10) || 6;
//
//   // Создаем состояние для дат
//    const [date, setDate] = useState({
//     start: "2024-10-21T00:00:00+00:00",  // 2024-10-27T00:00:00+00:00
//     end:   "2024-10-27T23:59:59+00:00"  // 2024-11-02T23:59:59+00:00
//   });
//
//   console.log('---date', typeof(date))
//
//   // Преобразование дат в формат UTC (без временной зоны +03:00)
//   // const convertToUTC = (dateString) => {
//   //   const date = new Date(dateString);
//   //   return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
//   //       .toISOString()
//   //       .replace('Z', '+00:00');
//   // };
//
//   const fetchCourseAndEvents = useCallback(async () => {
//     setLoading(true);
//       try {
//         const courseData = await getNetologyCourse(getTokenFromLocalStorage());
//         const calendarId = courseData?.id;
//         localStorage.setItem('calendarId', calendarId);
//
//         if (calendarId) {
//           const eventsResponse = await bulkEvents({
//             calendarId: calendarId, // ID календаря
//             timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Часовой пояс
//             attendeePersonId: getPersonIdLocalStorage(), // ID участника
//             timeMin: date.start, // Дата начала
//             timeMax: date.end, // Дата окончания
//             sessionToken: getTokenFromLocalStorage(),
//           });
//           // console.log('События:', eventsResponse.data);
//           setEvents(eventsResponse.data);
//         }
//       } catch (error) {
//         console.error('Ошибка при получении данных с сервера:', error);
//         setError("Ошибка при получении данных с сервера. Перезагрузите страницу!");
//       } finally {
//         // setLoading(false);
//         setLoading(false);
//       }
//
//       }, [date.start, date.end])
//   const handleRefreshEvents = useCallback(async () => {
//       // const startUTC = new Date().toISOString();
//       // const endUTC = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Дата через 7 дней
//       // const startUTC = convertToUTC(date.start); // Преобразуем дату начала в UTC
//       // const endUTC = convertToUTC(date.end);     // Преобразуем дату окончания в UTC
//
//       try {
//         const refreshEventsResponse = await refreshBulkEvents({
//           calendarId: getCalendarIdLocalStorage(), // ID календаря
//           timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Часовой пояс
//           attendeePersonId: getPersonIdLocalStorage(), // ID участника
//           timeMin: date.start, // Дата начала
//           timeMax: date.end, // Дата окончания
//           sessionToken: getTokenFromLocalStorage(),
//         });
//
//         // console.log('Обновленные события:', refreshEventsResponse.data);
//         setEvents(refreshEventsResponse.data); // Обновляем события
//
//         // Показываем сообщение и скрываем его через 3 секунды
//         setCacheUpdated(true);
//         setTimeout(() => {
//           setCacheUpdated(false);
//         }, 3000); // Скрыть через 3 секунды
//
//       } catch (error) {
//         console.error('Ошибка при обновлении событий:', error);
//       }
//      }, [date.start, date.end])
//
//   useEffect(() => {
//     const intervalTime = timeOffset * 60 * 60 * 1000; // Преобразуем время из часов в миллисекунды
//     fetchCourseAndEvents();
//
//     // Автоматический вызов функции обновления
//     const intervalId = setInterval(() => {
//       handleRefreshEvents();
//       console.log('handleRefreshEvents')
//     }, intervalTime); // 6 часов
//     return () => clearInterval(intervalId);
//
//   }, [fetchCourseAndEvents, handleRefreshEvents, timeOffset]);
//
//   if (loading ) {
//     return (
//         <div className="loader-container">
//           <Loader />
//         </div>
//     );
//   }
//
//   if (error) {
//     return <div>{error}</div>;
//   }
//
//   // const handleWeekChange = (newDate) => {
//   //   // Обновляем дату в формате ISO для начала и конца недели
//   //   const startOfWeek = new Date(newDate);
//   //   startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Пн
//   //   const endOfWeek = new Date(startOfWeek);
//   //   endOfWeek.setDate(startOfWeek.getDate() + 6); // Вс
//   //
//   //   // Получаем текущее время
//   //   const currentTimeStart = date.start.split("T")[1]; // Вытаскиваем время из текущей даты начала
//   //   const currentTimeEnd = date.end.split("T")[1]; // Вытаскиваем время из текущей даты конца
//   //
//   //   setDate({
//   //     start: `${startOfWeek.toISOString().split("T")[0]}T${currentTimeStart}`,
//   //     end: `${endOfWeek.toISOString().split("T")[0]}T${currentTimeEnd}`,
//   //   });
//   //   // setDate({
//   //   //   start: startOfWeek.toISOString(),
//   //   //   end: endOfWeek.toISOString(),
//   //   // });
//   //
//   //   // console.log('---date', typeof(date))
//   //
//   //   // Запускаем fetchCourseAndEvents с новыми датами
//   //   // fetchCourseAndEvents();
//   // };
//
//   const handleWeekChange = (newDate) => {
//     // Ваш код для изменения даты
//     const startOfWeek = new Date(newDate);
//     startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
//     const endOfWeek = new Date(startOfWeek);
//     endOfWeek.setDate(startOfWeek.getDate() + 6);
//
//     const currentTimeStart = date.start.split("T")[1];
//     const currentTimeEnd = date.end.split("T")[1];
//
//     setDate({
//         start: `${startOfWeek.toISOString().split("T")[0]}T${currentTimeStart}`,
//         end: `${endOfWeek.toISOString().split("T")[0]}T${currentTimeEnd}`,
//     });
//
//     fetchCourseAndEvents(); // Обновляем события после изменения даты
//  };
//
//
//
//   return (
//       <div className="calendar-page">
//         <Calendar
//             events={events}
//             date={date}
//             onRefresh={handleRefreshEvents}
//             cacheUpdated={cacheUpdated}
//             onWeekChange={handleWeekChange}
//             disableButtons={loading}
//         />
//       </div>
//   );
// };
//
// export default CalendarRoute;


//
// import React, { useCallback, useEffect, useState } from 'react';
// import {
//   getNetologyCourse,
//   bulkEvents,
//   getTokenFromLocalStorage,
//   getPersonIdLocalStorage,
//   getCalendarIdLocalStorage,
//   refreshBulkEvents,
// } from '../services/api'; // Ваши API-запросы
// import Calendar from "../components/Calendar/Calendar";
// import Loader from "../elements/Loader";
//
// const CalendarRoute = () => {
//   const [events, setEvents] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [cacheUpdated, setCacheUpdated] = useState(false);
//
//   const timeOffset = parseInt(process.env.REACT_APP_TIME_OFFSET, 10) || 6;
//
//   // Создаем состояние для дат
//   const [date, setDate] = useState({
//     start: "2024-10-21T00:00:00+00:00",
//     end: "2024-10-27T23:59:59+00:00"
//   });
//
//   const fetchCourseAndEvents = useCallback(async () => {
//     setLoading(true);
//     try {
//       const courseData = await getNetologyCourse(getTokenFromLocalStorage());
//       const calendarId = courseData?.id;
//       localStorage.setItem('calendarId', calendarId);
//
//       if (calendarId) {
//         const eventsResponse = await bulkEvents({
//           calendarId: calendarId, // ID календаря
//           timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Часовой пояс
//           attendeePersonId: getPersonIdLocalStorage(), // ID участника
//           timeMin: date.start, // Дата начала
//           timeMax: date.end, // Дата окончания
//           sessionToken: getTokenFromLocalStorage(),
//         });
//         setEvents(eventsResponse.data);
//       }
//     } catch (error) {
//       console.error('Ошибка при получении данных с сервера:', error);
//       setError("Ошибка при получении данных с сервера. Перезагрузите страницу!");
//     } finally {
//       setLoading(false);
//     }
//   }, [date]);
//
//   const handleRefreshEvents = useCallback(async () => {
//     try {
//       const refreshEventsResponse = await refreshBulkEvents({
//         calendarId: getCalendarIdLocalStorage(), // ID календаря
//         timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Часовой пояс
//         attendeePersonId: getPersonIdLocalStorage(), // ID участника
//         timeMin: date.start, // Дата начала
//         timeMax: date.end, // Дата окончания
//         sessionToken: getTokenFromLocalStorage(),
//       });
//       setEvents(refreshEventsResponse.data); // Обновляем события
//
//       // Показываем сообщение и скрываем его через 3 секунды
//       setCacheUpdated(true);
//       setTimeout(() => {
//         setCacheUpdated(false);
//       }, 3000); // Скрыть через 3 секунды
//     } catch (error) {
//       console.error('Ошибка при обновлении событий:', error);
//     }
//   }, [date]);
//
//   useEffect(() => {
//     const intervalTime = timeOffset * 60 * 60 * 1000; // Преобразуем время из часов в миллисекунды
//     fetchCourseAndEvents();
//
//     // Автоматический вызов функции обновления
//     const intervalId = setInterval(() => {
//       handleRefreshEvents();
//     }, intervalTime); // 6 часов
//     return () => clearInterval(intervalId);
//   }, [fetchCourseAndEvents, handleRefreshEvents, timeOffset]);
//
//   if (loading) {
//     return (
//       <div className="loader-container">
//         <Loader />
//       </div>
//     );
//   }
//
//   if (error) {
//     return <div>{error}</div>;
//   }
//
//   const handleWeekChange = (newDate) => {
//     // Обновляем дату в формате ISO для начала и конца недели
//     const startOfWeek = new Date(newDate);
//     startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Пн
//     const endOfWeek = new Date(startOfWeek);
//     endOfWeek.setDate(startOfWeek.getDate() + 6); // Вс
//
//     const currentTimeStart = date.start.split("T")[1]; // Вытаскиваем время из текущей даты начала
//     const currentTimeEnd = date.end.split("T")[1]; // Вытаскиваем время из текущей даты конца
//
//     setDate({
//       start: `${startOfWeek.toISOString().split("T")[0]}T${currentTimeStart}`,
//       end: `${endOfWeek.toISOString().split("T")[0]}T${currentTimeEnd}`,
//     });
//
//     fetchCourseAndEvents(); // Обновляем события после изменения даты
//   };
//
//   return (
//     <div className="calendar-page">
//       <Calendar
//         events={events}
//         date={date}
//         onRefresh={handleRefreshEvents}
//         cacheUpdated={cacheUpdated}
//         onWeekChange={handleWeekChange}
//         disableButtons={loading}
//       />
//     </div>
//   );
// };
//
// export default CalendarRoute;


import React, { useCallback, useEffect, useState } from 'react';
import {
  getNetologyCourse,
  bulkEvents,
  getTokenFromLocalStorage,
  getPersonIdLocalStorage,
  getCalendarIdLocalStorage,
  refreshBulkEvents,
} from '../services/api'; // Ваши API-запросы
import Calendar from "../components/Calendar/Calendar";
import Loader from "../elements/Loader";

const CalendarRoute = () => {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cacheUpdated, setCacheUpdated] = useState(false);

  const timeOffset = parseInt(process.env.REACT_APP_TIME_OFFSET, 10) || 6;

  const [date, setDate] = useState({
    start: "2024-10-21T00:00:00+00:00",
    end: "2024-10-27T23:59:59+00:00"
  });

  const fetchCourseAndEvents = useCallback(async () => {
    setLoading(true);
    try {
      const courseData = await getNetologyCourse(getTokenFromLocalStorage());
      const calendarId = courseData?.id;
      localStorage.setItem('calendarId', calendarId);

      if (calendarId) {
        const eventsResponse = await bulkEvents({
          calendarId: calendarId, // ID календаря
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Часовой пояс
          attendeePersonId: getPersonIdLocalStorage(), // ID участника
          timeMin: date.start, // Дата начала
          timeMax: date.end, // Дата окончания
          sessionToken: getTokenFromLocalStorage(),
        });

        // Проверяем, что события получены
        if (eventsResponse && eventsResponse.data) {
          setEvents(eventsResponse.data);
        } else {
          throw new Error('Не удалось получить события'); // Бросаем ошибку, если нет данных
        }
      }
    } catch (error) {
      console.error('Ошибка при получении данных с сервера:', error);
      setError("Ошибка при получении данных с сервера. Перезагрузите страницу!");
    } finally {
      setLoading(false);
    }
  }, [date]);

  const handleRefreshEvents = useCallback(async () => {
    try {
      const refreshEventsResponse = await refreshBulkEvents({
        calendarId: getCalendarIdLocalStorage(), // ID календаря
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Часовой пояс
        attendeePersonId: getPersonIdLocalStorage(), // ID участника
        timeMin: date.start, // Дата начала
        timeMax: date.end, // Дата окончания
        sessionToken: getTokenFromLocalStorage(),
      });

      // Проверяем, что обновленные события получены
      if (refreshEventsResponse && refreshEventsResponse.data) {
        setEvents(refreshEventsResponse.data); // Обновляем события
      } else {
        throw new Error('Не удалось обновить события'); // Бросаем ошибку, если нет данных
      }

      // Показываем сообщение и скрываем его через 3 секунды
      setCacheUpdated(true);
      setTimeout(() => {
        setCacheUpdated(false);
      }, 3000); // Скрыть через 3 секунды
    } catch (error) {
      console.error('Ошибка при обновлении событий:', error);
    }
  }, [date]);

  useEffect(() => {
    const intervalTime = timeOffset * 60 * 60 * 1000; // Преобразуем время из часов в миллисекунды
    fetchCourseAndEvents();

    const intervalId = setInterval(() => {
      handleRefreshEvents();
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

  const handleWeekChange = (newDate) => {
    const startOfWeek = new Date(newDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Пн
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Вс

    const currentTimeStart = date.start.split("T")[1];
    const currentTimeEnd = date.end.split("T")[1];

    setDate({
      start: `${startOfWeek.toISOString().split("T")[0]}T${currentTimeStart}`,
      end: `${endOfWeek.toISOString().split("T")[0]}T${currentTimeEnd}`,
    });

    fetchCourseAndEvents(); // Обновляем события после изменения даты
  };

  return (
    <div className="calendar-page">
      <Calendar
        events={events}
        date={date}
        onRefresh={handleRefreshEvents}
        cacheUpdated={cacheUpdated}
        onWeekChange={handleWeekChange}
        disableButtons={loading}
      />
    </div>
  );
};

export default CalendarRoute;
