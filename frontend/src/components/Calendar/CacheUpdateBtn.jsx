import React, {useCallback, useEffect, useState} from 'react';
import {
    getCalendarIdLocalStorage,
    getPersonIdLocalStorage,
    getTokenFromLocalStorage,
    refreshBulkEvents,
    getJWTTokenFromLocalStorage
} from "../../services/api";

const CacheUpdateBtn = ({date, onDataUpdate}) => {
    const [cacheUpdated, setCacheUpdated] = useState(false);
    const [loading, setLoading] = useState(false); // Добавлено состояние Loader
    const timeOffset = parseInt(process.env.REACT_APP_TIME_OFFSET, 10) || 6;
    const handleRefreshEvents = useCallback(async () => {
        const sessionToken = getTokenFromLocalStorage();
        const jwtToken = getJWTTokenFromLocalStorage();
        if (!sessionToken || !jwtToken) {
        console.warn("Токен отсутствует. Перенаправление на логин...");
        window.location.href = '/login';
        return;
        }
        setLoading(true); // Включаем Loader перед запросом
        try {
            const refreshEventsResponse = await refreshBulkEvents({
                calendarId: getCalendarIdLocalStorage(), // ID календаря
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Часовой пояс
                attendeePersonId: getPersonIdLocalStorage(), // ID участника
                timeMin: date.start, // Дата начала
                timeMax: date.end, // Дата окончания
                sessionToken: getTokenFromLocalStorage(),
                jwtToken: getJWTTokenFromLocalStorage()

            });

            if (refreshEventsResponse.status === 401) {
                // Если токен протух, удаляем его и перенаправляем на логин
                localStorage.removeItem('token');
                localStorage.removeItem('jwtToken');
                window.location.href = '/login'; 
                return;
            }

            // Проверяем, что обновленные события получены
            if (refreshEventsResponse && refreshEventsResponse.data) {
                onDataUpdate(refreshEventsResponse.data); // Передаем данные родителю
                setCacheUpdated(true);
                setTimeout(() => setCacheUpdated(false), 3000);
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
        } finally {
            setLoading(false); // Отключаем Loader после завершения запроса
        }
    }, [date, onDataUpdate]);


    useEffect(() => {
        const intervalTime = timeOffset * 60 * 60 * 1000;
        const intervalId = setInterval(() => handleRefreshEvents(), intervalTime);
        return () => clearInterval(intervalId);
    }, [handleRefreshEvents, timeOffset]);

    return (
        <button 
            onClick={handleRefreshEvents} 
            className={`cache-btn ${cacheUpdated ? 'updated' : ''}`}
        >
            {loading ? 'Обновляем кэш...' : cacheUpdated ? 'Кэш обновлен' : 'Сбросить кэш расписания'}
        </button>
    );
};

export default CacheUpdateBtn;