import React, {useContext, useEffect, useState} from "react";
import { getNetologyCourse, bulkEvents } from "../services/api";
import {AuthContext} from "../context/AuthContext"; // Импортируем API функции

const CalendarRoute = () => {
    const { authData } = useContext(AuthContext); // Достаем данные из контекста

    const [calendarId, setCalendarId] = useState(null); // Хранение calendarId
    const [courses, setCourses] = useState({ homework: [], webinars: [] }); // Для хранения курсов
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

                // Сохраняем курсы (домашние задания и вебинары)
                if (courseData?.netology) {
                    setCourses(courseData.netology);
                }


                if (fetchedCalendarId) {
                    // дату получаем события для календаря
                    const eventsResponse = await bulkEvents(
                        authData.email, // username
                        authData.password, // password
                        sessionToken, // Токен сессии
                        fetchedCalendarId, // Извлеченный ID календаря
                        "2024-10-07T00:00:00+03:00", // Начало диапазона дат
                        "2024-10-13T23:59:59+03:00", // Конец диапазона дат
                        authData.personId // ID участника
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

            <h3>Курсы</h3>
            <h4>Домашние задания</h4>
            {courses.homework.length > 0 ? (
                <ul>
                    {courses.homework.map((homework, index) => (
                        <li key={index}>
                            <a href={homework.url} target="_blank" rel="noopener noreferrer">
                                {homework.title} (дедлайн: {new Date(homework.deadline).toLocaleString()})
                            </a>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Нет домашних заданий</p>
            )}

            <h4>Вебинары</h4>
            {courses.webinars.length > 0 ? (
                <ul>
                    {courses.webinars.map((webinar, index) => (
                        <li key={index}>
                            <a href={webinar.webinar_url} target="_blank" rel="noopener noreferrer">
                                {webinar.title} (время: {new Date(webinar.starts_at).toLocaleString()} - {new Date(webinar.ends_at).toLocaleString()})
                            </a> — Ведущий: {webinar.experts[0].full_name}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Нет вебинаров</p>
            )}
        </div>
    );
};

export default CalendarRoute;


