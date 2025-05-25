import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
    getCalendarIdLocalStorage,
    getTokenFromLocalStorage,
    refreshBulkEvents,
    getJWTTokenFromLocalStorage,
    getLMSTokenFromLocalStorage,
    getLMSIdFromLocalStorage
} from "../../services/api";
import { isTokenExpired } from '../../utils/auth';

const CacheUpdateBtn = ({ date, onDataUpdate }) => {
    const [cacheUpdated, setCacheUpdated] = useState(false);
    const timeOffset = parseInt(process.env.REACT_APP_TIME_OFFSET, 10) || 6;
    const toastShownRef = useRef(false); // ✅ защита от дублирующих уведомлений

    const handleRefreshEvents = useCallback(async () => {
        const jwtToken = getJWTTokenFromLocalStorage();

        // ✅ Проверка токена с защитой
        if (!jwtToken || isTokenExpired(jwtToken)) {
            if (!toastShownRef.current) {
                toastShownRef.current = true;
                toast.error("Сессия истекла. Вы будете перенаправлены на страницу авторизации.");
                setTimeout(() => {
                    localStorage.clear();
                    window.location.href = "/login";
                }, 5000);
            }
            return;
        }

        try {
            const refreshEventsResponse = await refreshBulkEvents({
                calendarId: getCalendarIdLocalStorage(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timeMin: date.start,
                timeMax: date.end,
                sessionToken: getTokenFromLocalStorage(),
                jwtToken,
                lxpToken: getLMSTokenFromLocalStorage(),
                lxpId: getLMSIdFromLocalStorage()
            });

            if (refreshEventsResponse && refreshEventsResponse.data) {
                onDataUpdate(refreshEventsResponse.data);
                setCacheUpdated(true);
                setTimeout(() => setCacheUpdated(false), 3000);
            } else {
                throw new Error('Не удалось обновить события');
            }

        } catch (error) {
            console.error('Ошибка при обновлении событий:', error);
            toast.error("Не удалось обновить кэш. Попробуйте позже.");
        }
    }, [date, onDataUpdate]);

    // ✅ Фоновая проверка токена
    useEffect(() => {
        const checkTokenValidity = () => {
            const jwtToken = getJWTTokenFromLocalStorage();
            if (!jwtToken || isTokenExpired(jwtToken)) {
                if (!toastShownRef.current) {
                    toastShownRef.current = true;
                    toast.error("Сессия истекла. Вы будете перенаправлены на страницу авторизации.");
                    setTimeout(() => {
                        localStorage.clear();
                        window.location.href = "/login";
                    }, 5000);
                }
            }
        };

        checkTokenValidity();
        const intervalId = setInterval(checkTokenValidity, 5 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, []);

    // ⏱ Автоматическое обновление кэша по таймеру
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
            {cacheUpdated ? 'Кэш обновлен' : 'Сбросить кэш расписания'}
        </button>
    );
};

export default CacheUpdateBtn;
