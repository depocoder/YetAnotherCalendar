import React, {useContext, useEffect, useState} from "react";
import { getNetologyCourse, bulkEvents } from "../services/api/login";
import {AuthContext} from "../context/AuthContext"; // Импортируем API функции

const CalendarRoute = () => {
    const { authData } = useContext(AuthContext); // Достаем данные из контекста

    const [calendarId, setCalendarId] = useState(null); // Хранение calendarId
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log("Данные пользователя:", authData);

        const fetchCourseAndEvents = async () => {
            const sessionToken = localStorage.getItem("token"); // Получаем токен из localStorage

            try {
                // Получаем данные курса, чтобы извлечь calendarId
                const courseData = await getNetologyCourse(sessionToken);
                const fetchedCalendarId = courseData?.id; // Предполагаем, что calendarId есть в данных курса
                setCalendarId(fetchedCalendarId);

                if (fetchedCalendarId) {
                    // дату получаем события для календаря
                    const eventsResponse = await bulkEvents(
                        "authData.email", // username
                        "authData.password", // password
                        sessionToken, // Токен сессии
                        fetchedCalendarId, // Извлеченный ID календаря
                        "2024-10-07T00:00:00+03:00", // Начало диапазона дат
                        "2024-10-13T23:59:59+03:00", // Конец диапазона дат
                        "authData.personId" // ID участника
                    );

                    setEvents(eventsResponse.data); // Записываем события в состояние
                }
            } catch (error) {
                setError("Ошибка получения данных с сервера");
            } finally {
                setLoading(false);
            }
        };

        fetchCourseAndEvents();
    }, [authData]);

    if (loading) {
        return <div>Загрузка...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div>
            <h2>Календарь</h2>
            {calendarId ? <p>ID Календаря: {calendarId}</p> : <p>Календарь не найден</p>}

            <h3>События:</h3>
            {events.length > 0 ? (
                <ul>
                    {events.map((event, index) => (
                        <li key={index}>
                            {event.title} — {event.date}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Нет доступных событий</p>
            )}
        </div>
    );
};

export default CalendarRoute;


