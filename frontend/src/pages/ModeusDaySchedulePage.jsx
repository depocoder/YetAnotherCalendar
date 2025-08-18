import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getDayEvents, saveLinkToEvent, getJWTTokenFromLocalStorage } from '../services/api';
import Loader from "../elements/Loader";
import ExitBtn from "../components/Calendar/ExitBtn";

import '../style/header.scss';
import '../style/calendar.scss';
import '../style/modeus.scss';



const ModeusDaySchedulePage = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedYear, setSelectedYear] = useState([2024]);
    const [profileName, setProfileName] = useState(["Разработка IT-продуктов и информационных систем"]);
    const [specialtyCode, setSpecialtyCode] = useState(["09.03.02"]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [linkInputs, setLinkInputs] = useState({});
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Генерируем список годов (2023-2026)
    const yearOptions = [];
    for (let year = 2023; year <= 2026; year++) {
        yearOptions.push(year);
    }

    // Опции для профилей (можно расширить)
    const profileOptions = [
        "Разработка IT-продуктов и информационных систем",
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

    const fetchEvents = async () => {
        const token = getJWTTokenFromLocalStorage();
        console.log('Проверка токена Modeus:', !!token);
        
        if (!token) {
            toast.error("Отсутствует токен Modeus. Войдите в систему.");
            console.error('Токен Modeus не найден в localStorage');
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
                sortedEvents.filter(event => event && event.id).forEach(event => {
                    initialLinks[event.id] = '';
                });
                setLinkInputs(initialLinks);
                
                console.log("Загружено событий:", sortedEvents.length);
                console.log("Тип данных events:", typeof sortedEvents, sortedEvents);
            } else {
                toast.error("Не удалось загрузить события. Повторите попытку.");
                console.error("Пустой ответ от getDayEvents:", response);
                console.error("Тип response.data:", typeof response?.data, response?.data);
                setEvents([]); // Устанавливаем пустой массив
            }
        } catch (error) {
            console.error('Ошибка при получении событий:', error);
            toast.error("Ошибка при загрузке расписания. Проверьте токен Modeus.");
            setEvents([]); // Устанавливаем пустой массив при ошибке
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [selectedDate, selectedYear, profileName, specialtyCode]);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const handleYearChange = (e) => {
        const value = Array.from(e.target.selectedOptions, option => parseInt(option.value));
        setSelectedYear(value);
    };

    const handleProfileChange = (e) => {
        const value = Array.from(e.target.selectedOptions, option => option.value);
        setProfileName(value);
    };

    const handleSpecialtyChange = (e) => {
        const value = Array.from(e.target.selectedOptions, option => option.value);
        setSpecialtyCode(value);
    };

    const handleLinkInputChange = (eventId, value) => {
        setLinkInputs(prev => ({
            ...prev,
            [eventId]: value
        }));
    };

    const handleSaveLink = async (eventId) => {
        const url = linkInputs[eventId];
        if (!url.trim()) {
            toast.error("Введите ссылку");
            return;
        }

        // Проверяем формат URL
        try {
            new URL(url);
        } catch {
            toast.error("Введите корректную ссылку (с http:// или https://)");
            return;
        }

        try {
            const response = await saveLinkToEvent(eventId, url);
            if (response?.status === 200) {
                toast.success("Ссылка успешно сохранена!");
                setLinkInputs(prev => ({
                    ...prev,
                    [eventId]: ''
                }));
            } else {
                toast.error("Не удалось сохранить ссылку");
            }
        } catch (error) {
            console.error('Ошибка при сохранении ссылки:', error);
            toast.error("Ошибка при сохранении ссылки");
        }
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
                console.error(`Ошибка при сохранении ссылки для события ${eventId}:`, error);
                errorCount++;
            }
        }

        // Очищаем успешно сохраненные ссылки
        if (successCount > 0) {
            setLinkInputs(prev => {
                const newInputs = { ...prev };
                for (const [eventId, url] of linksToSave) {
                    newInputs[eventId] = '';
                }
                return newInputs;
            });
        }

        // Показываем результат
        if (successCount > 0 && errorCount === 0) {
            toast.success(`✅ Все ссылки сохранены! (${successCount})`);
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

    return (
        <div className="modeus-page">
            <div className="wrapper">
                <header className="header">
                    <div className="header-line">
                        <div className="shedule-export">
                            <span className="modeus-page-title">Расписание Modeus на день</span>
                        </div>
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
                                        const filteredEvents = events.filter(event => event && event.id && !event.is_lxp);
                                        const lxpEvents = events.filter(event => event && event.id && event.is_lxp);
                                        
                                        if (filteredEvents.length > 0) {
                                            const eventText = filteredEvents.length === 1 ? 'событие' : filteredEvents.length < 5 ? 'события' : 'событий';
                                            const lxpText = lxpEvents.length > 0 ? ` (скрыто ${lxpEvents.length} LXP)` : '';
                                            return `Найдено ${filteredEvents.length} ${eventText}${lxpText}`;
                                        } else if (events.length > 0) {
                                            return 'Все события отфильтрованы (только LXP события)';
                                        } else {
                                            return 'Выберите дату для поиска событий';
                                        }
                                    })()}
                                </p>
                            </div>
                            
                            {!Array.isArray(events) || events.filter(event => event && event.id && !event.is_lxp).length === 0 ? (
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
                                    {events.filter(event => event && event.id && !event.is_lxp).map((event) => (
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
                                                <label>🔗 Добавить ссылку на вебинар:</label>
                                                <div className="link-input-container">
                                                    <input
                                                        type="url"
                                                        placeholder="https://my.mts-link.ru/j/58117453/74387679/session/72309048"
                                                        value={linkInputs[event.id] || ''}
                                                        onChange={(e) => handleLinkInputChange(event.id, e.target.value)}
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
        </div>
    );
};

export default ModeusDaySchedulePage;
