import React, { useEffect, useRef, useState } from 'react';
import {
    getNetologyCourse,
    bulkEvents,
    getTokenFromLocalStorage,
    getCalendarIdLocalStorage,
    getJWTTokenFromLocalStorage,
    getLMSTokenFromLocalStorage,
    getLMSIdFromLocalStorage
} from '../services/api';
import { toast } from 'react-toastify';
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

const CalendarPage = () => {
    const [date, setDate] = useState(() => getCurrentWeekDates());
    const [events, setEvents] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    const lastFetchedDate = useRef(null);

    //console.log('[CalendarPage render]');

    useEffect(() => {
        const dateKey = `${date.start}_${date.end}`;
        if (lastFetchedDate.current === dateKey) return;
        lastFetchedDate.current = dateKey;

        const fetchData = async () => {
            console.log('[fetchCourseAndEvents called]', dateKey);
            setLoading(true);

            try {
                let calendarId = getCalendarIdLocalStorage();

                if (!calendarId) {
                    const courseData = await getNetologyCourse(getTokenFromLocalStorage());
                    calendarId = courseData?.id;
                    localStorage.setItem('calendarId', calendarId);
                }

                if (!calendarId) {
                    console.error('Ошибка при получении calendar id:', calendarId);
                    toast.error("Не удалось загрузить календарь. Попробуйте снова.");
                    return;
                }

                const eventsResponse = await bulkEvents({
                    calendarId,
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    timeMin: date.start,
                    timeMax: date.end,
                    sessionToken: getTokenFromLocalStorage(),
                    jwtToken: getJWTTokenFromLocalStorage(),
                    lxpToken: getLMSTokenFromLocalStorage(),
                    lxpId: getLMSIdFromLocalStorage()
                });

                if (eventsResponse?.data) {
                    setEvents(eventsResponse.data);
                } else {
                    toast.error("Не удалось загрузить события. Повторите попытку.");
                    console.error("Пустой ответ от bulkEvents:", eventsResponse);
                }

            } catch (error) {
                console.error('Ошибка при получении данных с сервера:', error);
                toast.error("Ошибка при загрузке расписания. Перезагрузите страницу или войдите заново.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [date]);

    const handleDataUpdate = (updatedEvents) => {
        setEvents(updatedEvents);
    };

    return (
        <div className="calendar-page">
            <div className="wrapper">
                <header className="header">
                    <div className="header-line">
                        <div className="shedule-export">
                            <span className="shedule">Мое расписание</span>
                            <ICSExporter date={date} />
                            <CacheUpdateBtn date={date} onDataUpdate={handleDataUpdate} />
                        </div>
                        <ExitBtn />
                    </div>

                    <EventsDetail event={selectedEvent} />
                    <DatePicker setDate={setDate} initialDate={date} disableButtons={loading} />
                </header>

                <div className="calendar">
                    {loading ? (
                        <Loader />
                    ) : (
                        <table className="shedule-table">
                            <thead>
                                <DaysNumber date={date} />
                                <DeadLine date={date} events={events} setSelectedEvent={setSelectedEvent} />
                            </thead>
                            <tbody>
                                <LessonTimes
                                    events={events}
                                    selectedEvent={selectedEvent}
                                    setSelectedEvent={setSelectedEvent}
                                />
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarPage;