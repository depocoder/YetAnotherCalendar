import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getDayEvents, saveLinkToEvent, getTutorTokenFromLocalStorage, getMtsLinks, getWeeklyUsersCount } from '../services/api';
import Loader from "../elements/Loader";
import ExitBtn from "../components/Calendar/ExitBtn";

import '../style/header.scss';
import '../style/calendar.scss';
import '../style/modeus.scss';
import { debug } from '../utils/debug';



const ModeusDaySchedulePage = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedYear, setSelectedYear] = useState(() => {
        try {
            const saved = localStorage.getItem('modeusSelectedYear');
            return saved ? JSON.parse(saved) : [2024];
        } catch (error) {
            debug.error('Error parsing modeusSelectedYear from localStorage:', error);
            localStorage.removeItem('modeusSelectedYear');
            return [2024];
        }
    });
    const [profileName, setProfileName] = useState(["Разработка ИТ-продуктов и информационных систем"]);
    const [specialtyCode, setSpecialtyCode] = useState(["09.03.02"]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [linkInputs, setLinkInputs] = useState({});
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [mtsUrls, setMtsUrls] = useState({});
    const [expandedGroups, setExpandedGroups] = useState({});
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [generatedMessage, setGeneratedMessage] = useState('');
    const [autoGenerateMessage, setAutoGenerateMessage] = useState(() => {
        try {
            const saved = localStorage.getItem('autoGenerateMessage');
            return saved ? JSON.parse(saved) : false;
        } catch (error) {
            debug.error('Error parsing autoGenerateMessage from localStorage:', error);
            return false;
        }
    });
    const [weeklyUsers, setWeeklyUsers] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Генерируем список годов (2023-2026)
    const yearOptions = [];
    for (let year = 2023; year <= 2026; year++) {
        yearOptions.push(year);
    }

    // Опции для профилей (можно расширить)
    const profileOptions = [
        "Разработка ИТ-продуктов и информационных систем",
        "Информационные системы и технологии",
        "Программная инженерия",
        "Компьютерная безопасность"
    ];

    // Опции для специальностей (можно расширить)
    const specialtyOptions = [
        "09.03.02",
        "09.03.01", 
        "09.03.04",
        "10.03.01"
    ];

    const fetchEvents = useCallback(async () => {
        const tutorToken = getTutorTokenFromLocalStorage();
        debug.log('Проверка токена преподавателя:', !!tutorToken);
        
        if (!tutorToken) {
            toast.error("Отсутствует токен авторизации. Войдите в систему.");
            debug.error('Токен преподавателя не найден в localStorage');
            return;
        }

        setLoading(true);
        try {
            const response = await getDayEvents(
                selectedDate,
                selectedYear,
                profileName,
                specialtyCode
            );

            if (response?.data) {
                // Убеждаемся, что данные - это массив и сортируем по времени
                const eventsData = Array.isArray(response.data) ? response.data : [];
                const sortedEvents = eventsData.sort((a, b) => {
                    if (!a.start || !b.start) return 0;
                    return new Date(a.start) - new Date(b.start);
                });
                setEvents(sortedEvents);
                
                // Инициализируем поля для ссылок (только для событий с ID)
                const initialLinks = {};
                const lessonIds = [];
                sortedEvents.filter(event => event && event.id).forEach(event => {
                    initialLinks[event.id] = '';
                    lessonIds.push(event.id);
                });
                setLinkInputs(initialLinks);
                
                // Загружаем существующие MTS ссылки
                if (lessonIds.length > 0) {
                    try {
                        const mtsResponse = await getMtsLinks(lessonIds);
                        if (mtsResponse?.status === 200 && mtsResponse.data?.links) {
                            setMtsUrls(mtsResponse.data.links);
                            
                            // Предзаполняем поля ввода существующими ссылками
                            const updatedLinks = { ...initialLinks };
                            Object.keys(mtsResponse.data.links).forEach(lessonId => {
                                updatedLinks[lessonId] = mtsResponse.data.links[lessonId];
                            });
                            setLinkInputs(updatedLinks);
                        }
                    } catch (error) {
                        debug.error('Error loading MTS URLs:', error);
                        // Не показываем ошибку пользователю, так как это не критично
                    }
                }
                
                debug.log("Загружено событий:", sortedEvents.length);
                debug.log("Тип данных events:", typeof sortedEvents, sortedEvents);
            } else {
                toast.error("Не удалось загрузить события. Повторите попытку.");
                debug.error("Пустой ответ от getDayEvents:", response);
                debug.error("Тип response.data:", typeof response?.data, response?.data);
                setEvents([]); // Устанавливаем пустой массив
            }
        } catch (error) {
            debug.error('Ошибка при получении событий:', error);
            toast.error("Ошибка при загрузке расписания. Проверьте токен Modeus.");
            setEvents([]); // Устанавливаем пустой массив при ошибке
        } finally {
            setLoading(false);
        }
    }, [selectedDate, selectedYear, profileName, specialtyCode]);

    useEffect(() => {
        fetchEvents();
    }, [selectedDate, selectedYear, profileName, specialtyCode, fetchEvents]);

    // Fetch weekly users count on component mount
    useEffect(() => {
        const fetchWeeklyUsers = async () => {
            const tutorToken = getTutorTokenFromLocalStorage();
            if (!tutorToken) {
                return; // Don't fetch if no tutor token
            }

            setLoadingStats(true);
            try {
                const data = await getWeeklyUsersCount();
                // Handle both formats: {weekly_users: N} or just N
                const count = typeof data === 'number' ? data : (data.weekly_users || 0);
                setWeeklyUsers(count);
                debug.log('Weekly users count:', count);
            } catch (error) {
                debug.error('Error fetching weekly users:', error);
                setWeeklyUsers(0);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchWeeklyUsers();
    }, []); // Only run once on mount

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const handleYearChange = (e) => {
        const value = Array.from(e.target.selectedOptions, option => parseInt(option.value));
        setSelectedYear(value);
        localStorage.setItem('modeusSelectedYear', JSON.stringify(value));
    };

    const handleProfileChange = (e) => {
        const value = Array.from(e.target.selectedOptions, option => option.value);
        setProfileName(value);
    };

    const handleSpecialtyChange = (e) => {
        const value = Array.from(e.target.selectedOptions, option => option.value);
        setSpecialtyCode(value);
    };

    const handleAutoGenerateChange = (e) => {
        const isChecked = e.target.checked;
        setAutoGenerateMessage(isChecked);
        
        try {
            if (isChecked) {
                localStorage.setItem('autoGenerateMessage', JSON.stringify(true));
            } else {
                localStorage.removeItem('autoGenerateMessage');
            }
        } catch (error) {
            debug.error('Error saving autoGenerateMessage to localStorage:', error);
        }
    };

    const handleLinkInputChange = (eventId, value) => {
        setLinkInputs(prev => {
            const updated = { ...prev, [eventId]: value };
            
            // Найдем группу этого события и синхронизируем ссылку для всех событий в группе
            const event = events.find(e => e.id === eventId);
            if (event?.cycle_realization?.code && event.cycle_realization.code !== 'unknown') {
                const groupEvents = events.filter(e => 
                    e?.cycle_realization?.code === event.cycle_realization.code && 
                    e.cycle_realization.code !== 'unknown'
                );
                
                if (groupEvents.length > 1) {
                    groupEvents.forEach(groupEvent => {
                        updated[groupEvent.id] = value;
                    });
                }
            }
            
            return updated;
        });
    };

    const toggleGroupExpansion = (groupCode) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupCode]: !prev[groupCode]
        }));
    };

    const handleBulkSaveLinks = async () => {
        const linksToSave = Object.entries(linkInputs).filter(([eventId, url]) => url.trim());
        
        if (linksToSave.length === 0) {
            toast.error("Нет ссылок для сохранения");
            return;
        }

        // Проверяем все URL
        for (const [eventId, url] of linksToSave) {
            try {
                new URL(url);
            } catch {
                toast.error(`Некорректная ссылка для события: ${events.find(e => e.id === eventId)?.name || eventId}`);
                return;
            }
        }

        let successCount = 0;
        let errorCount = 0;

        toast.info(`Сохраняем ${linksToSave.length} ссылок...`);

        for (const [eventId, url] of linksToSave) {
            try {
                const response = await saveLinkToEvent(eventId, url);
                if (response?.status === 200) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                debug.error(`Ошибка при сохранении ссылки для события ${eventId}:`, error);
                errorCount++;
            }
        }

        // Не очищаем ссылки после сохранения, чтобы пользователь мог генерировать сообщение повторно
        // if (successCount > 0) {
        //     setLinkInputs(prev => {
        //         const newInputs = { ...prev };
        //         for (const [eventId] of linksToSave) {
        //             newInputs[eventId] = '';
        //         }
        //         return newInputs;
        //     });
        // }

        // Показываем результат
        if (successCount > 0 && errorCount === 0) {
            toast.success(`✅ Все ссылки сохранены! (${successCount})`);
            
            // Generate and show message only if auto-generate is enabled
            if (autoGenerateMessage) {
                const message = generateScheduleMessage(events, linkInputs);
                setGeneratedMessage(message);
                setShowMessageModal(true);
            }
            
        } else if (successCount > 0 && errorCount > 0) {
            toast.warning(`⚠️ Сохранено: ${successCount}, ошибок: ${errorCount}`);
        } else {
            toast.error(`❌ Не удалось сохранить ссылки (${errorCount} ошибок)`);
        }
    };


    const formatTime = (dateTimeString) => {
        return new Date(dateTimeString).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatDateForMessage = (dateString) => {
        const date = new Date(dateString);
        const months = [
            'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
        ];
        const weekdays = [
            'воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'
        ];
        
        const day = date.getDate();
        const month = months[date.getMonth()];
        const weekday = weekdays[date.getDay()];
        
        return `${day} ${month}, ${weekday}`;
    };

    const generateScheduleMessage = (eventsData, linksData) => {
        // Input validation
        if (!eventsData || !Array.isArray(eventsData)) {
            return "Ошибка: нет данных о событиях";
        }
        
        // Helper function to safely get event properties
        const getEventProperty = (event, path, fallback = '') => {
            try {
                return path.split('.').reduce((obj, key) => obj?.[key], event) || fallback;
            } catch {
                return fallback;
            }
        };
        
        // Helper function to format teacher names (Фамилия Имя Отчество -> Фамилия И. О.)
        const formatTeacherName = (fullName) => {
            if (!fullName || typeof fullName !== 'string') return '';
            
            const nameParts = fullName.trim().split(/\s+/);
            if (nameParts.length < 2) return fullName; // Return as is if less than 2 parts
            
            const [lastName, firstName, middleName] = nameParts;
            let formattedName = lastName;
            
            if (firstName) {
                formattedName += ` ${firstName.charAt(0).toUpperCase()}.`;
            }
            
            if (middleName) {
                formattedName += ` ${middleName.charAt(0).toUpperCase()}.`;
            }
            
            return formattedName;
        };
        
        // Separate LXP and regular events
        const regularEvents = eventsData.filter(event => 
            event?.id && !event.is_lxp
        );
        const lxpEvents = eventsData.filter(event => 
            event?.id && event.is_lxp
        );
        
        if (regularEvents.length === 0 && lxpEvents.length === 0) {
            return "На выбранную дату событий не найдено.";
        }
        
        // Sort events by start time
        const sortedRegularEvents = regularEvents.sort((a, b) => 
            new Date(a.start || 0) - new Date(b.start || 0)
        );
        
        // Group by cycle_realization.id for consecutive time grouping
        const cycleGroups = new Map();
        for (const event of sortedRegularEvents) {
            const cycleId = getEventProperty(event, 'cycle_realization.id') || `no-cycle-${event.id}`;
            if (!cycleGroups.has(cycleId)) {
                cycleGroups.set(cycleId, []);
            }
            cycleGroups.get(cycleId).push(event);
        }
        
        const processedGroups = [];
        
        // Process each cycle group
        for (const [cycleId, events] of cycleGroups.entries()) {
            const isNoCycle = cycleId.startsWith('no-cycle-');
            
            if (isNoCycle || events.length === 1) {
                // Handle individual events
                events.forEach(event => {
                    processedGroups.push({
                        events: [event],
                        isConsecutive: false,
                        startTime: event.start
                    });
                });
            } else {
                // Group by course + type within the same cycle
                const sortedCycleEvents = events.sort((a, b) => 
                    new Date(a.start || 0) - new Date(b.start || 0)
                );
                
                const courseTypeGroups = new Map();
                
                for (const event of sortedCycleEvents) {
                    const courseName = getEventProperty(event, 'course_name', 'Неизвестная дисциплина');
                    const typeName = getEventProperty(event, 'cycle_realization.name', 'Занятие');
                    const courseTypeKey = `${courseName}_${typeName}`;
                    
                    if (!courseTypeGroups.has(courseTypeKey)) {
                        courseTypeGroups.set(courseTypeKey, []);
                    }
                    courseTypeGroups.get(courseTypeKey).push(event);
                }
                
                // Process each course+type group
                for (const groupEvents of courseTypeGroups.values()) {
                    processedGroups.push({
                        events: groupEvents,
                        isConsecutive: groupEvents.length > 1,
                        startTime: groupEvents[0].start
                    });
                }
            }
        }
        
        // Sort all groups by start time
        processedGroups.sort((a, b) => 
            new Date(a.startTime || 0) - new Date(b.startTime || 0)
        );
        
        // Generate message
        let message = "Студенты, доброе утро!\nУчебные мероприятия на сегодня:\n\n ";
        message += "**" + formatDateForMessage(selectedDate) + "**" + ": \n";
        
        // Process each group for message formatting
        for (const group of processedGroups) {
            const firstEvent = group.events[0];
            const eventType = getEventProperty(firstEvent, 'cycle_realization.name', 'Занятие');
            const isLecture = eventType.includes('Лекционное');
            const icon = isLecture ? '🔷' : '🔺';
            const disciplineName = getEventProperty(firstEvent, 'course_name', 'Неизвестная дисциплина');
            
            if (group.isConsecutive && group.events.length > 1) {
                // Consecutive/grouped time slots
                const timeSlots = group.events
                    .map(e => formatTime(e.start || '00:00'))
                    .join(' и ');
                
                const teachers = [...new Set(
                    group.events
                        .map(e => formatTeacherName(getEventProperty(e, 'teacher_full_name')))
                        .filter(Boolean)
                )];
                
                let line = `${icon}**${timeSlots} (мск)** — ${eventType} по дисциплине «${disciplineName}»`;
                
                // Show teacher names for both lectures and other events
                if (teachers.length === 1 && teachers[0]) {
                    line += `. Преподаватель ${teachers[0]}`;
                } else if (teachers.length > 1) {
                    line += `. Для групп преподавателей ${teachers.join(' и ')}`;
                }
                
                message += line + '\n';
                
                // Add unique links
                const uniqueLinks = [...new Set(
                    group.events
                        .map(e => linksData[e.id])
                        .filter(Boolean)
                )];
                
                if (uniqueLinks.length > 0) {
                    message += uniqueLinks.join(' ') + '\n';
                }
                
            } else {
                // Individual events
                group.events.forEach(event => {
                    const timeStr = `**${formatTime(event.start || '00:00')} (мск)**`;
                    const link = linksData[event.id] || '';
                    const teacherName = formatTeacherName(getEventProperty(event, 'teacher_full_name'));
                    
                    let line = `${icon}${timeStr} — ${eventType} по дисциплине «${disciplineName}»`;
                    
                    // Show teacher name for all events (including lectures)
                    if (teacherName) {
                        line += `. Преподаватель ${teacherName}`;
                    }
                    
                    message += line + '\n';
                    if (link) {
                        message += `${link}\n`;
                    }
                });
            }
        }
        
        // Add LXP events
        if (lxpEvents.length > 0) {
            message += '\nLXP:\n';
            for (const event of lxpEvents) {
                const eventType = event.cycle_realization?.name || 'Занятие';
                const disciplineName = event.course_name || 'Неизвестная дисциплина';
                message += `🔵 ${eventType} по дисциплине «${disciplineName}» на платформе LXP.\n`;
            }
        }
        
        // Add legend
        message += '\n🔷 - обязательны для всех; \n🔺- обязательны по группам.';
        if (lxpEvents.length > 0) {
            message += '\n🔵 - LXP/LMS';
        }
        
        return message;
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Сообщение скопировано в буфер обмена!');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                toast.success('Сообщение скопировано в буфер обмена!');
            } catch (fallbackErr) {
                toast.error('Не удалось скопировать в буфер обмена');
            }
            document.body.removeChild(textArea);
        }
    };

    // Группировка событий по cycle_realization.code
    const groupEventsByCode = (events) => {
        const filtered = events.filter(event => event && event.id && !event.is_lxp);
        const grouped = {};
        const individual = [];

        filtered.forEach(event => {
            const code = event.cycle_realization?.code;
            if (!code || code === 'unknown') {
                individual.push(event);
            } else {
                if (!grouped[code]) {
                    grouped[code] = [];
                }
                grouped[code].push(event);
            }
        });

        // Разделяем на группы (>1 события) и индивидуальные события
        const groups = Object.entries(grouped).filter(([_, events]) => events.length > 1);
        const singleEvents = [
            ...individual,
            ...Object.entries(grouped).filter(([_, events]) => events.length === 1).flatMap(([_, events]) => events)
        ];

        return { groups, singleEvents };
    };

    const { groups, singleEvents } = groupEventsByCode(events);

    return (
        <div className="modeus-page">
            <div className="wrapper">
                <header className="header">
                    <div className="header-line">
                        <div className="shedule-export">
                            <span className="modeus-page-title">Расписание Modeus на день</span>
                        </div>
                        {weeklyUsers !== null && (
                            <div className="weekly-users-badge">
                                <div className="badge-content">
                                    <span className="badge-icon">👥</span>
                                    <div className="badge-info">
                                        <span className="badge-label">Пользователей за неделю</span>
                                        <span className="badge-count">
                                            {loadingStats ? '...' : weeklyUsers.toLocaleString('ru-RU')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <ExitBtn />
                    </div>





                    <div className="modeus-filters-container">
                        
                        {/* Заголовок */}
                        <div className="filters-header">
                            <h3>🎯 <span className="gradient-text">Настройки расписания</span></h3>
                            <p>Выберите параметры для поиска занятий в Modeus</p>
                        </div>

                        {/* Основные фильтры */}
                        <div className="filters-main-grid">
                            <div className="modern-input-group">
                                <label htmlFor="date-input">📅 Выберите дату</label>
                                <div className="input-container">
                                    <input
                                        id="date-input"
                                        type="date"
                                        value={selectedDate}
                                        onChange={handleDateChange}
                                    />
                                </div>
                            </div>

                            <div className="modern-input-group">
                                <label htmlFor="year-select">🎓 Год поступления</label>
                                <div className="input-container">
                                    <select
                                        id="year-select"
                                        multiple
                                        value={selectedYear.map(String)}
                                        onChange={handleYearChange}
                                        title="Удерживайте Ctrl для выбора нескольких лет"
                                    >
                                        {yearOptions.map(year => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <small>💡 Ctrl+клик для множественного выбора</small>
                            </div>

                            <div className="filter-buttons">
                                <button
                                    onClick={fetchEvents}
                                    disabled={loading}
                                    className="primary"
                                >
                                    {loading ? '⏳ Загрузка...' : '🚀 Найти события'}
                                </button>

                                <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                                    {showAdvancedFilters ? '🔼 Основные настройки' : '⚙️ Расширенные настройки'}
                                </button>
                            </div>
                            
                            <div className="auto-generate-setting">
                                <label className="auto-generate-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={autoGenerateMessage}
                                        onChange={handleAutoGenerateChange}
                                    />
                                    <span>📋 Генерировать расписание автоматически</span>
                                </label>
                            </div>
                        </div>

                        {/* Расширенные фильтры */}
                        {showAdvancedFilters && (
                            <div className="filters-advanced">
                                <div className="modern-input-group wide">
                                    <label htmlFor="profile-select">💼 Профиль подготовки</label>
                                    <div className="input-container">
                                        <select
                                            id="profile-select"
                                            multiple
                                            value={profileName}
                                            onChange={handleProfileChange}
                                            className="large"
                                            title="Удерживайте Ctrl для выбора нескольких профилей"
                                        >
                                            {profileOptions.map(profile => (
                                                <option key={profile} value={profile}>
                                                    {profile}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="modern-input-group">
                                    <label htmlFor="specialty-select">📚 Код специальности</label>
                                    <div className="input-container">
                                        <select
                                            id="specialty-select"
                                            multiple
                                            value={specialtyCode}
                                            onChange={handleSpecialtyChange}
                                            className="large"
                                            title="Удерживайте Ctrl для выбора нескольких специальностей"
                                        >
                                            {specialtyOptions.map(specialty => (
                                                <option key={specialty} value={specialty} className="monospace">
                                                    {specialty}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                <div className={`schedule-content ${loading ? 'calendar-loading' : 'calendar-loaded'}`}>
                    {loading ? (
                        <Loader />
                    ) : (
                        <div className="events-list modeus-events-list">

                            
                            <div className="modeus-schedule-header">
                                <h2>📅 <span className="schedule-gradient-text">Расписание на {formatDate(selectedDate)}</span></h2>
                                <p>
                                    {(() => {
                                        const totalEvents = groups.reduce((sum, [_, events]) => sum + events.length, 0) + singleEvents.length;
                                        const totalGroups = groups.length;
                                        const lxpEvents = events.filter(event => event && event.id && event.is_lxp);
                                        
                                        if (totalEvents > 0) {
                                            const eventText = totalEvents === 1 ? 'событие' : 'события';
                                            const groupText = totalGroups > 0 ? ` (${totalGroups} групп, ${singleEvents.length} отдельных)` : '';
                                            const lxpText = lxpEvents.length > 0 ? ` (скрыто ${lxpEvents.length} LXP)` : '';
                                            return `Найдено ${totalEvents} ${eventText}${groupText}${lxpText}`;
                                        } else if (events.length > 0) {
                                            return 'Все события отфильтрованы (только LXP события)';
                                        } else {
                                            return 'Выберите дату для поиска событий';
                                        }
                                    })()}
                                </p>
                            </div>
                            
                            {!Array.isArray(events) || (groups.length === 0 && singleEvents.length === 0) ? (
                                <div className="modeus-no-events">
                                    <div className="icon">📅</div>
                                    <h3>
                                        {!Array.isArray(events) 
                                            ? 'Ошибка загрузки данных' 
                                            : events.length === 0 
                                                ? 'События не найдены' 
                                                : 'Все события отфильтрованы'}
                                    </h3>
                                    <p>
                                        {!Array.isArray(events) 
                                            ? 'Попробуйте обновить страницу или проверьте подключение'
                                            : events.length === 0 
                                                ? 'На выбранную дату и фильтры событий не найдено. Попробуйте изменить параметры поиска.'
                                                : 'Все найденные события являются LXP событиями и были скрыты. Попробуйте выбрать другую дату.'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Кнопка bulk save */}
                                    <div className="modeus-bulk-save">
                                        <button
                                            onClick={handleBulkSaveLinks}
                                            disabled={!Object.values(linkInputs).some(url => url.trim())}
                                        >
                                            💾 Сохранить все ссылки
                                        </button>
                                    </div>

                                    <div className="modeus-events-grid">
                                    {/* Рендеринг групповых карточек */}
                                    {groups.map(([groupCode, groupEvents]) => (
                                        <div key={`group-${groupCode}`} className="modeus-event-card grouped-card">
                                            <div className="group-indicator">
                                                <span className="group-badge">
                                                    👥 Группа ({groupEvents.length} {groupEvents.length === 1 ? 'событие' : 'события'})
                                                </span>
                                                <button 
                                                    className="expand-group-btn"
                                                    onClick={() => toggleGroupExpansion(groupCode)}
                                                    title="Редактировать события по отдельности"
                                                >
                                                    {expandedGroups[groupCode] ? '📋 Свернуть' : '✏️ Редактировать'}
                                                </button>
                                            </div>
                                            
                                            {!expandedGroups[groupCode] ? (
                                                // Групповое отображение
                                                <>
                                                    <div className={`event-color-strip ${
                                                        groupEvents[0].cycle_realization?.name?.includes('Лекционное') ? 'lecture' :
                                                        groupEvents[0].cycle_realization?.name?.includes('Практическое') ? 'practice' :
                                                        groupEvents[0].cycle_realization?.name?.includes('Лабораторное') ? 'lab' :
                                                        groupEvents[0].cycle_realization?.name?.includes('Семинар') ? 'seminar' :
                                                        'default'
                                                    }`}></div>

                                                    <div className="event-header">
                                                        <h4>
                                                            📚 {groupEvents[0].name || 'Без названия'}
                                                            {groupEvents[0].nameShort && (
                                                                <span className="short-name">
                                                                    ({groupEvents[0].nameShort})
                                                                </span>
                                                            )}
                                                        </h4>
                                                        <div className="event-time">
                                                            🕐 {groupEvents.map(e => 
                                                                `${formatTime(e.start)} - ${formatTime(e.end)}`
                                                            ).join(', ')}
                                                        </div>
                                                    </div>

                                                    <div className="event-details">
                                                        <div className="info-block course">
                                                            <div className="label">📚 КУРС</div>
                                                            <div className="content">
                                                                {groupEvents[0].course_name || 'Курс не указан'}
                                                            </div>
                                                        </div>

                                                        <div className="info-block teacher">
                                                            <div className="label">👨‍🏫 ПРЕПОДАВАТЕЛЬ</div>
                                                            <div className="content">
                                                                {groupEvents[0].teacher_profile?.avatar_profile && (
                                                                    <a 
                                                                        href={groupEvents[0].teacher_profile.profile_url} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        title="Профиль преподавателя"
                                                                    >
                                                                        <img 
                                                                            src={groupEvents[0].teacher_profile.avatar_profile} 
                                                                            alt={groupEvents[0].teacher_full_name || 'Преподаватель'}
                                                                            className="teacher-avatar"
                                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                                        />
                                                                    </a>
                                                                )}
                                                                {groupEvents[0].teacher_full_name || 'Преподаватель не указан'}
                                                            </div>
                                                        </div>

                                                        <div className="event-info-grid">
                                                            <div className={`info-block type ${
                                                                groupEvents[0].cycle_realization?.name?.includes('Лекционное') ? 'lecture' :
                                                                groupEvents[0].cycle_realization?.name?.includes('Практическое') ? 'practice' :
                                                                groupEvents[0].cycle_realization?.name?.includes('Лабораторное') ? 'lab' :
                                                                groupEvents[0].cycle_realization?.name?.includes('Семинар') ? 'seminar' :
                                                                'default'
                                                            }`}>
                                                                <div className="label">ТИП ЗАНЯТИЯ</div>
                                                                <div className="content">
                                                                    {
                                                                        groupEvents[0].cycle_realization?.name?.includes('Лекционное') ? '📖 ' :
                                                                        groupEvents[0].cycle_realization?.name?.includes('Практическое') ? '✏️ ' :
                                                                        groupEvents[0].cycle_realization?.name?.includes('Лабораторное') ? '🧪 ' :
                                                                        groupEvents[0].cycle_realization?.name?.includes('Семинар') ? '💬 ' :
                                                                        '📚 '
                                                                    }{groupEvents[0].cycle_realization?.name || 'Не указано'}
                                                                </div>
                                                            </div>

                                                            <div className="info-block code">
                                                                <div className="label">КОД ЦИКЛА</div>
                                                                <div className="content">
                                                                    📋 {groupEvents[0].cycle_realization?.code || 'Не указано'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {groupEvents[0].description && (
                                                            <div className="info-block description">
                                                                <div className="label">ОПИСАНИЕ</div>
                                                                <div className="content">
                                                                    📝 {groupEvents[0].description}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="modeus-link-section">
                                                        <label>
                                                            🔗 Добавить ссылку на вебинар для всей группы:
                                                            {mtsUrls[groupEvents[0].id] && (
                                                                <span className="cloud-badge" title="Ссылка уже сохранена в системе">
                                                                    ☁️ Сохранено
                                                                </span>
                                                            )}
                                                        </label>
                                                        <div className="link-input-container">
                                                            <input
                                                                type="url"
                                                                placeholder="https://my.mts-link.ru/j/58117453/74387679/session/72309048"
                                                                value={linkInputs[groupEvents[0].id] || ''}
                                                                onChange={(e) => handleLinkInputChange(groupEvents[0].id, e.target.value)}
                                                                className={mtsUrls[groupEvents[0].id] ? 'has-saved-link' : ''}
                                                            />
                                                        </div>
                                                        <small>💡 Ссылка будет применена ко всем {groupEvents.length} {groupEvents.length === 1 ? 'событию' : 'событиям'} в группе</small>
                                                    </div>
                                                </>
                                            ) : (
                                                // Развернутое отображение для редактирования
                                                <div className="expanded-group-events">
                                                    {groupEvents.map((event, index) => (
                                                        <div key={event.id} className="individual-event-in-group">
                                                            <div className="event-index">#{index + 1}</div>
                                                            <div className={`event-color-strip ${
                                                                event.cycle_realization?.name?.includes('Лекционное') ? 'lecture' :
                                                                event.cycle_realization?.name?.includes('Практическое') ? 'practice' :
                                                                event.cycle_realization?.name?.includes('Лабораторное') ? 'lab' :
                                                                event.cycle_realization?.name?.includes('Семинар') ? 'seminar' :
                                                                'default'
                                                            }`}></div>

                                                            <div className="event-header">
                                                                <h5>
                                                                    📚 {event.name || 'Без названия'}
                                                                    {event.nameShort && (
                                                                        <span className="short-name">
                                                                            ({event.nameShort})
                                                                        </span>
                                                                    )}
                                                                </h5>
                                                                <div className="event-time">
                                                                    🕐 {event.start ? formatTime(event.start) : '--:--'} - {event.end ? formatTime(event.end) : '--:--'}
                                                                    <span className="duration-badge">
                                                                        {event.start && event.end ? Math.round((new Date(event.end) - new Date(event.start)) / (1000 * 60)) : '?'} мин
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="event-details">
                                                                <div className="info-block course">
                                                                    <div className="label">📚 КУРС</div>
                                                                    <div className="content">
                                                                        {event.course_name || 'Курс не указан'}
                                                                    </div>
                                                                </div>

                                                                <div className="info-block teacher">
                                                                    <div className="label">👨‍🏫 ПРЕПОДАВАТЕЛЬ</div>
                                                                    <div className="content">
                                                                        {event.teacher_profile?.avatar_profile && (
                                                                            <a 
                                                                                href={event.teacher_profile.profile_url} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer"
                                                                                title="Профиль преподавателя"
                                                                            >
                                                                                <img 
                                                                                    src={event.teacher_profile.avatar_profile} 
                                                                                    alt={event.teacher_full_name || 'Преподаватель'}
                                                                                    className="teacher-avatar"
                                                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                                                />
                                                                            </a>
                                                                        )}
                                                                        {event.teacher_full_name || 'Преподаватель не указан'}
                                                                    </div>
                                                                </div>

                                                                <div className="event-info-grid">
                                                                    <div className={`info-block type ${
                                                                        event.cycle_realization?.name?.includes('Лекционное') ? 'lecture' :
                                                                        event.cycle_realization?.name?.includes('Практическое') ? 'practice' :
                                                                        event.cycle_realization?.name?.includes('Лабораторное') ? 'lab' :
                                                                        event.cycle_realization?.name?.includes('Семинар') ? 'seminar' :
                                                                        'default'
                                                                    }`}>
                                                                        <div className="label">ТИП ЗАНЯТИЯ</div>
                                                                        <div className="content">
                                                                            {
                                                                                event.cycle_realization?.name?.includes('Лекционное') ? '📖 ' :
                                                                                event.cycle_realization?.name?.includes('Практическое') ? '✏️ ' :
                                                                                event.cycle_realization?.name?.includes('Лабораторное') ? '🧪 ' :
                                                                                event.cycle_realization?.name?.includes('Семинар') ? '💬 ' :
                                                                                '📚 '
                                                                            }{event.cycle_realization?.name || 'Не указано'}
                                                                        </div>
                                                                    </div>

                                                                    <div className="info-block code">
                                                                        <div className="label">КОД ЦИКЛА</div>
                                                                        <div className="content">
                                                                            📋 {event.cycle_realization?.code || 'Не указано'}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {event.description && (
                                                                    <div className="info-block description">
                                                                        <div className="label">ОПИСАНИЕ</div>
                                                                        <div className="content">
                                                                            📝 {event.description}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="modeus-link-section">
                                                                <label>
                                                                    🔗 Добавить ссылку на вебинар:
                                                                    {mtsUrls[event.id] && (
                                                                        <span className="cloud-badge" title="Ссылка уже сохранена в системе">
                                                                            ☁️ Сохранено
                                                                        </span>
                                                                    )}
                                                                </label>
                                                                <div className="link-input-container">
                                                                    <input
                                                                        type="url"
                                                                        placeholder="https://my.mts-link.ru/j/58117453/74387679/session/72309048"
                                                                        value={linkInputs[event.id] || ''}
                                                                        onChange={(e) => handleLinkInputChange(event.id, e.target.value)}
                                                                        className={mtsUrls[event.id] ? 'has-saved-link' : ''}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    
                                    {/* Рендеринг индивидуальных карточек */}
                                    {singleEvents.map((event) => (
                                        <div key={event.id} className="modeus-event-card">
                                            {/* Цветная полоска слева - зависит от типа занятия */}
                                            <div className={`event-color-strip ${
                                                event.cycle_realization?.name?.includes('Лекционное') ? 'lecture' :
                                                event.cycle_realization?.name?.includes('Практическое') ? 'practice' :
                                                event.cycle_realization?.name?.includes('Лабораторное') ? 'lab' :
                                                event.cycle_realization?.name?.includes('Семинар') ? 'seminar' :
                                                'default'
                                            }`}></div>

                                            <div className="event-header">
                                                <h4>
                                                    📚 {event.name || 'Без названия'}
                                                    {event.nameShort && (
                                                        <span className="short-name">
                                                            ({event.nameShort})
                                                        </span>
                                                    )}
                                                </h4>
                                                <div className="event-time">
                                                    🕐 {event.start ? formatTime(event.start) : '--:--'} - {event.end ? formatTime(event.end) : '--:--'}
                                                    <span className="duration-badge">
                                                        {event.start && event.end ? Math.round((new Date(event.end) - new Date(event.start)) / (1000 * 60)) : '?'} мин
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="event-details">
                                                {/* Блок курса - полная ширина, фиксированный размер */}
                                                <div className="info-block course">
                                                    <div className="label">📚 КУРС</div>
                                                    <div className="content">
                                                        {event.course_name || 'Курс не указан'}
                                                    </div>
                                                </div>

                                                {/* Блок преподавателя - полная ширина, фиксированный размер */}
                                                <div className="info-block teacher">
                                                    <div className="label">👨‍🏫 ПРЕПОДАВАТЕЛЬ</div>
                                                    <div className="content">
                                                        {event.teacher_profile?.avatar_profile && (
                                                            <a 
                                                                href={event.teacher_profile.profile_url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                title="Профиль преподавателя"
                                                            >
                                                                <img 
                                                                    src={event.teacher_profile.avatar_profile} 
                                                                    alt={event.teacher_full_name || 'Преподаватель'}
                                                                    className="teacher-avatar"
                                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                                />
                                                            </a>
                                                        )}
                                                        {event.teacher_full_name || 'Преподаватель не указан'}
                                                    </div>
                                                </div>

                                                {/* Остальные блоки в ряд */}
                                                <div className="event-info-grid">
                                                
                                                <div className={`info-block type ${
                                                    event.cycle_realization?.name?.includes('Лекционное') ? 'lecture' :
                                                    event.cycle_realization?.name?.includes('Практическое') ? 'practice' :
                                                    event.cycle_realization?.name?.includes('Лабораторное') ? 'lab' :
                                                    event.cycle_realization?.name?.includes('Семинар') ? 'seminar' :
                                                    'default'
                                                }`}>
                                                    <div className="label">ТИП ЗАНЯТИЯ</div>
                                                    <div className="content">
                                                        {
                                                            event.cycle_realization?.name?.includes('Лекционное') ? '📖 ' :
                                                            event.cycle_realization?.name?.includes('Практическое') ? '✏️ ' :
                                                            event.cycle_realization?.name?.includes('Лабораторное') ? '🧪 ' :
                                                            event.cycle_realization?.name?.includes('Семинар') ? '💬 ' :
                                                            '📚 '
                                                        }{event.cycle_realization?.name || 'Не указано'}
                                                    </div>
                                                </div>

                                                <div className="info-block code">
                                                    <div className="label">КОД ЦИКЛА</div>
                                                    <div className="content">
                                                        📋 {event.cycle_realization?.code || 'Не указано'}
                                                    </div>
                                                </div>
                                                </div>




                                                {event.description && (
                                                    <div className="info-block description">
                                                        <div className="label">ОПИСАНИЕ</div>
                                                        <div className="content">
                                                            📝 {event.description}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="modeus-link-section">
                                                <label>
                                                    🔗 Добавить ссылку на вебинар:
                                                    {mtsUrls[event.id] && (
                                                        <span className="cloud-badge" title="Ссылка уже сохранена в системе">
                                                            ☁️ Сохранено
                                                        </span>
                                                    )}
                                                </label>
                                                <div className="link-input-container">
                                                    <input
                                                        type="url"
                                                        placeholder="https://my.mts-link.ru/j/58117453/74387679/session/72309048"
                                                        value={linkInputs[event.id] || ''}
                                                        onChange={(e) => handleLinkInputChange(event.id, e.target.value)}
                                                        className={mtsUrls[event.id] ? 'has-saved-link' : ''}
                                                    />
                                                </div>
                                                <small>💡 Заполните ссылки для всех событий и нажмите "Сохранить все ссылки"</small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                </>
                            
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Message Modal */}
            {showMessageModal && (
                <div className="modal-overlay" onClick={() => setShowMessageModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📋 Сгенерированное сообщение</h3>
                            <button 
                                className="modal-close-btn"
                                onClick={() => setShowMessageModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <textarea
                                value={generatedMessage}
                                readOnly
                                className="message-textarea"
                                rows={15}
                            />
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="copy-btn"
                                onClick={() => copyToClipboard(generatedMessage)}
                            >
                                📋 Скопировать в буфер обмена
                            </button>
                            <button 
                                className="close-btn"
                                onClick={() => setShowMessageModal(false)}
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModeusDaySchedulePage;
