import React, { useEffect, useRef, useState } from 'react';
import {
    getNetologyCourse,
    getNetologyCourses,
    defaultCalendarIds,
    bulkEvents,
    getTokenFromLocalStorage,
    getCalendarIdsLocalStorage,
    setCalendarIdsLocalStorage,
    getNetologyCoursesLocalStorage,
    setNetologyCoursesLocalStorage,
    getModeusPersonIdFromLocalStorage,
    getLMSTokenFromLocalStorage,
    getLMSIdFromLocalStorage,
    getMtsLinks
} from '../services/api';
import CourseSelectorModal from "../components/Calendar/CourseSelectorModal";
import SubscriptionModal from "../components/Calendar/SubscriptionModal";
import { toast } from 'react-toastify';
import Loader from "../elements/Loader";
import '../style/header.scss';
import '../style/calendar.scss';
import DatePicker from "../components/Calendar/DataPicker";
import SimpleDatePicker from "../components/Calendar/SimpleDatePicker";
import ExitBtn from "../components/Calendar/ExitBtn";
import { exitApp } from "../utils/auth";
import CalendarExportMenu from "../components/Calendar/CalendarExportMenu";
import SettingsMenu from "../components/Calendar/SettingsMenu";
import CacheUpdateBtn from "../components/Calendar/CacheUpdateBtn";
import { getCurrentWeekDates } from "../utils/dateUtils";
import EventsDetail from "../components/Calendar/EventsDetail";
import EventModal from "../components/Calendar/EventModal";
import MobileCalendarView from "../components/Calendar/MobileCalendarView";
import DeadLine from "../components/Calendar/DeadLine";
import DaysNumber from "../components/Calendar/DaysNumber";
import LessonTimes from "../components/Calendar/LessonTimes";
import GitHubStarModal from "../components/GitHubStarModal";
import FeaturesModal from "../components/FeaturesModal";
import { debug } from "../utils/debug";
import { useNavigate } from "react-router-dom";
import { handleApiError } from '../utils/errorHandler';

const CalendarPage = () => {
    const [date, setDate] = useState(() => getCurrentWeekDates());
    const [events, setEvents] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [showGithubModal, setShowGithubModal] = useState(false);
    const [showFeaturesModal, setShowFeaturesModal] = useState(false);
    const [mtsUrls, setMtsUrls] = useState({});
    const [calendarIds, setCalendarIds] = useState(() => getCalendarIdsLocalStorage());
    const [netologyCourses, setNetologyCourses] = useState(() => getNetologyCoursesLocalStorage());
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

    const navigate = useNavigate();
    const lastFetchedDate = useRef(null);

    const handleMobileLogout = () => {
        exitApp(navigate);
    };

    // Проверяем наличие всех необходимых токенов при загрузке страницы
    useEffect(() => {
        // calendarIds здесь сознательно не проверяем: у старых пользователей
        // их может не быть, fetchData сам подгрузит список курсов по токену.
        const requiredTokens = {
            'lms-id': getLMSIdFromLocalStorage(),
            'lms-token': getLMSTokenFromLocalStorage(),
            'modeus_person_id': getModeusPersonIdFromLocalStorage(),
            'token': getTokenFromLocalStorage()
        };

        const missingTokens = [];
        for (const [key, value] of Object.entries(requiredTokens)) {
            if (!value) {
                missingTokens.push(key);
            }
        }

        if (missingTokens.length > 0) {
            debug.error('Missing required tokens:', missingTokens);
            toast.error("Отсутствуют данные авторизации. Необходимо войти заново.");
            exitApp(navigate);
            return;
        }
    }, [navigate]);

    // Проверяем, нужно ли показать модальное окно GitHub Star
    useEffect(() => {
        const hasSeenGithubModal = localStorage.getItem('githubStarModalShown');
        const remindDateStr = localStorage.getItem('githubStarRemindDate');
        const firstVisitStr = localStorage.getItem('calendarFirstVisit');
        
        // Сохраняем дату первого визита, если её нет
        if (!firstVisitStr) {
            const firstVisitDate = new Date();
            localStorage.setItem('calendarFirstVisit', firstVisitDate.toISOString());
            return; // Не показываем модальное окно в первый визит
        }
        
        let shouldShowModal = false;
        const firstVisitDate = new Date(firstVisitStr);
        const currentDate = new Date();
        const daysSinceFirstVisit = (currentDate - firstVisitDate) / (1000 * 60 * 60 * 24);
        
        if (!hasSeenGithubModal && !remindDateStr) {
            // Показываем модальное окно только если прошла неделя с первого визита
            if (daysSinceFirstVisit >= 7) {
                shouldShowModal = true;
            }
        } else if (remindDateStr && !hasSeenGithubModal) {
            // Проверяем, прошла ли неделя с момента отложенного напоминания
            const remindDate = new Date(remindDateStr);
            
            if (currentDate >= remindDate) {
                // Время напоминания наступило
                shouldShowModal = true;
                // Удаляем дату напоминания, чтобы не показывать повторно
                localStorage.removeItem('githubStarRemindDate');
            }
        }
        
        if (shouldShowModal) {
            // Показываем модальное окно с небольшой задержкой для лучшего UX
            const timer = setTimeout(() => {
                setShowGithubModal(true);
            }, 2000); // 2 секунды после загрузки страницы
            
            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        const dateKey = `${date.start}_${date.end}_${[...calendarIds].sort().join(',')}`;
        if (lastFetchedDate.current === dateKey) return;
        lastFetchedDate.current = dateKey;

        // Очищаем выбранное событие при смене недели
        setSelectedEvent(null);
        
        // Запускаем анимацию перехода
        setIsTransitioning(true);

        const fetchData = async () => {
            setLoading(true);

            try {
                let ids = calendarIds;

                // Если выбранных курсов нет — подгружаем список и берем все по умолчанию
                if (!ids || ids.length === 0) {
                    const coursesData = await getNetologyCourses(getTokenFromLocalStorage());
                    const programs = coursesData?.programs || [];
                    if (programs.length > 0) {
                        setNetologyCoursesLocalStorage(programs);
                        setNetologyCourses(programs);
                        ids = defaultCalendarIds(programs);
                    } else {
                        // Fallback на старое поведение (один курс)
                        const courseData = await getNetologyCourse(getTokenFromLocalStorage());
                        ids = courseData?.id ? [courseData.id] : [];
                    }
                    setCalendarIdsLocalStorage(ids);
                    setCalendarIds(ids);
                }

                if (!ids || ids.length === 0) {
                    debug.error('Ошибка при получении calendar ids:', ids);
                    toast.error("Не удалось загрузить календарь. Попробуйте снова.");
                    return;
                }

                const eventsResponse = await bulkEvents({
                    calendarIds: ids,
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    timeMin: date.start,
                    timeMax: date.end,
                    sessionToken: getTokenFromLocalStorage(),
                    modeusPersonId: getModeusPersonIdFromLocalStorage(),
                    lxpToken: getLMSTokenFromLocalStorage(),
                    lxpId: getLMSIdFromLocalStorage()
                });

                if (eventsResponse?.data) {
                    setEvents(eventsResponse.data);
                    
                    // Извлекаем timestamp кэша для передачи в CacheUpdateBtn
                    debug.log('📅 Cache timestamp from API:', eventsResponse.data.cached_at);
                    
                    // Получаем все Modeus события и загружаем их MTS ссылки
                    const modeusEvents = eventsResponse.data?.utmn?.modeus_events || [];
                    const lessonIds = modeusEvents.map(event => event.id).filter(Boolean);
                    
                    if (lessonIds.length > 0) {
                        try {
                            const mtsResponse = await getMtsLinks(lessonIds);
                            if (mtsResponse?.status === 200 && mtsResponse.data?.links) {
                                setMtsUrls(mtsResponse.data.links);
                            }
                        } catch (error) {
                            debug.error('Error loading MTS URLs:', error);
                            // Не показываем пользователю ошибку, так как это не критично
                        }
                    }
                } else {
                    toast.error("Не удалось загрузить события. Повторите попытку.");
                    debug.error("Пустой ответ от bulkEvents:", eventsResponse);
                }

            } catch (error) {
                debug.error('Ошибка при получении данных с сервера:', error);

                // Сначала проверяем на 401/403, так как это требует выхода из приложения
                // if (error?.response?.status === 401 || error?.response?.status === 403) {

                // }
                
                // Для всех остальных ошибок используем наш новый обработчик
                handleApiError(error, "Ошибка при загрузке расписания.", navigate);
                
            } finally {
                setLoading(false);
                // Небольшая задержка для завершения анимации
                setTimeout(() => setIsTransitioning(false), 100);
            }
        };

        fetchData();
    }, [date, navigate, calendarIds]); // Перезапрашиваем события при смене недели или набора курсов

    // Открытие модалки выбора курсов (при необходимости подгружаем их список)
    const handleOpenCourseModal = async () => {
        if (netologyCourses.length === 0) {
            const coursesData = await getNetologyCourses(getTokenFromLocalStorage());
            const programs = coursesData?.programs || [];
            if (programs.length > 0) {
                setNetologyCoursesLocalStorage(programs);
                setNetologyCourses(programs);
            }
        }
        setShowCourseModal(true);
    };

    // Сохранение нового набора курсов: обновляем localStorage и перезапрашиваем события
    const handleSaveCourses = (ids) => {
        setCalendarIdsLocalStorage(ids);
        setCalendarIds(ids);
    };

    const handleDataUpdate = (updatedEvents) => {
        setEvents(updatedEvents);
    };

    const handleCloseGithubModal = () => {
        setShowGithubModal(false);
    };

    const handleCloseEventModal = () => {
        setSelectedEvent(null);
    };

    return (
        <div className="calendar-page">
            <GitHubStarModal 
                isOpen={showGithubModal}
                onClose={handleCloseGithubModal}
            />
            <FeaturesModal 
                isOpen={showFeaturesModal}
                onClose={() => setShowFeaturesModal(false)}
                onOpenGithubModal={() => setShowGithubModal(true)}
            />
            <EventModal
                event={selectedEvent}
                isOpen={!!selectedEvent}
                onClose={handleCloseEventModal}
                mtsUrls={mtsUrls}
            />
            <CourseSelectorModal
                isOpen={showCourseModal}
                onClose={() => setShowCourseModal(false)}
                courses={netologyCourses}
                selectedIds={calendarIds}
                onSave={handleSaveCourses}
            />
            <SubscriptionModal
                isOpen={showSubscriptionModal}
                onClose={() => setShowSubscriptionModal(false)}
                courses={netologyCourses}
                selectedIds={calendarIds}
            />
            <div className="wrapper">
                <header className="header">
                    <div className="header-line">
                        <div className="shedule-export">
                            <span className="shedule">Мое расписание <span className="beta-badge">BETA</span></span>
                            <CalendarExportMenu
                                date={date}
                                onOpenSubscription={() => setShowSubscriptionModal(true)}
                            />
                            <CacheUpdateBtn 
                                date={date} 
                                onDataUpdate={handleDataUpdate}
                                cachedAt={events?.cached_at}
                                calendarReady={!loading && !isTransitioning && events !== null}
                            />
                            <SettingsMenu
                                onOpenCourses={handleOpenCourseModal}
                                onOpenFeatures={() => setShowFeaturesModal(true)}
                            />
                        </div>
                        <div className="header-actions">
                            <ExitBtn />
                        </div>
                    </div>


                    <div className="events-container">
                        <EventsDetail event={selectedEvent} mtsUrls={mtsUrls} />
                    </div>
                    <DatePicker setDate={setDate} initialDate={date} disableButtons={loading} />
                </header>

                {/* Mobile Controls Container */}
                <div className="mobile-controls-container">
                    <div className="mobile-header-actions">
                        <div className="mobile-buttons-row">
                            <CalendarExportMenu
                                date={date}
                                onOpenSubscription={() => setShowSubscriptionModal(true)}
                            />
                            <CacheUpdateBtn 
                                date={date} 
                                onDataUpdate={handleDataUpdate}
                                cachedAt={events?.cached_at}
                                calendarReady={!loading && !isTransitioning && events !== null}
                            />
                        </div>
                        <div className="mobile-buttons-row">
                            <SettingsMenu
                                onOpenCourses={handleOpenCourseModal}
                                onOpenFeatures={() => setShowFeaturesModal(true)}
                            />
                            <button
                                className="features-trigger-btn mobile-features-btn"
                                onClick={handleMobileLogout}
                                title="Выйти из системы"
                            >
                                🚪 Выйти
                            </button>
                        </div>
                    </div>
                    <SimpleDatePicker setDate={setDate} initialDate={date} disableButtons={loading} />
                </div>

                <div className={`calendar ${loading || isTransitioning ? 'calendar-loading' : 'calendar-loaded'}`}>
                    {loading ? (
                        <Loader />
                    ) : (
                        <>
                            {/* Desktop Calendar Table */}
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
                            
                            {/* Mobile Calendar View */}
                            <MobileCalendarView
                                events={events}
                                selectedEvent={selectedEvent}
                                setSelectedEvent={setSelectedEvent}
                                date={date}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarPage;