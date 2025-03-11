import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    getNetologyCourse,
    bulkEvents,
    getTokenFromLocalStorage,
    getPersonIdLocalStorage,
    getCalendarIdLocalStorage, getJWTTokenFromLocalStorage,
} from '../services/api';
import Loader from "../elements/Loader";
import '../style/header.scss';
import '../style/calendar.scss';
import DatePicker from "../components/Calendar/DataPicker";
import ExitBtn from "../components/Calendar/ExitBtn";
import ICSExporter from "../components/Calendar/ICSExporter";
import CacheUpdateBtn from "../components/Calendar/CacheUpdateBtn";
import { getCurrentWeekDates } from "../utils/dateUtils";
import EventsDetail from "../components/Calendar/EventsDetail";
import DeadLine from "../components/Calendar/DeadLine";
import DaysNumber from "../components/Calendar/DaysNumber";
import LessonTimes from "../components/Calendar/LessonTimes";
import ErrorMessage from "../elements/ErrorMessage";

const CalendarPage = () => {
    const initialDate = useMemo(() => getCurrentWeekDates(), []);
    const [date, setDate] = useState(initialDate);
    const [events, setEvents] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);

    // console.log('date', date)

    const fetchCourseAndEvents = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let calendarId
            calendarId = getCalendarIdLocalStorage();
            if (!calendarId){
                const courseData = await getNetologyCourse(getTokenFromLocalStorage());
                calendarId = courseData?.id;
                localStorage.setItem('calendarId', calendarId);
            }

            if (!calendarId) {
                console.error('Ошибка при получении calendar id:', calendarId);
            }
            const eventsResponse = await bulkEvents({
                calendarId,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                attendeePersonId: getPersonIdLocalStorage(),
                timeMin: date.start,
                timeMax: date.end,
                sessionToken: getTokenFromLocalStorage(),
                jwtToken: getJWTTokenFromLocalStorage()
            });

            if (eventsResponse?.data) {
                setEvents(eventsResponse.data);
            } else {
                throw new Error('Не удалось получить события');
            }

        } catch (error) {
            console.error('Ошибка при получении данных с сервера:', error);
            setError("Ошибка при получении данных с сервера. Перезагрузите страницу или заново авторизуйтесь!");
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        fetchCourseAndEvents();
    }, [fetchCourseAndEvents]);

    const handleDataUpdate = (updatedEvents) => {
        setEvents(updatedEvents);
    };

    const allEvents = [
        ...(events?.utmn?.modeus_events || []),
        ...(events?.netology?.webinars || []),
    ];

    return (
        <div className="calendar-page">
            <div className="wrapper">
                <header className="header">
                    <div className="header-line">
                        <div className="shedule-export">
                            <span className="shedule">Мое расписание</span>
                            <ICSExporter date={date}/>
                            <CacheUpdateBtn date={date} onDataUpdate={handleDataUpdate}/>
                        </div>
                        <ExitBtn/>
                    </div>

                    <EventsDetail event={selectedEvent}/>
                    <DatePicker setDate={setDate} initialDate={date} disableButtons={loading}/>
                </header>

                <div className="calendar">
                    {loading ? (
                        <Loader/>
                    ) : error ? (
                        <ErrorMessage message={error}/>
                    ) : (
                        <table className="shedule-table">
                            <thead>
                              <DaysNumber date={date}/>
                              <DeadLine date={date} events={events} setSelectedEvent={setSelectedEvent}/>
                            </thead>
                            <tbody>
                               <LessonTimes events={events} selectedEvent={selectedEvent} setSelectedEvent={setSelectedEvent}/>
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarPage;
