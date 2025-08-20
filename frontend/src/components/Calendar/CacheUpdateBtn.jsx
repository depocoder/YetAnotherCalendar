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
import InlineLoader from '../../elements/InlineLoader';

const CacheUpdateBtn = ({ date, onDataUpdate }) => {
    const [cacheUpdated, setCacheUpdated] = useState(false);
    const timeOffset = parseInt(process.env.REACT_APP_TIME_OFFSET, 10) || 6;
    const toastShownRef = useRef(false); // ✅ защита от дублирующих уведомлений

    // ✅ Очистка флагов при первом монтировании, если нет кэша
    useEffect(() => {
        if (!localStorage.getItem("cached_at")) {
            localStorage.removeItem("toast_shown");
            localStorage.removeItem("refresh_in_progress");
        }
    }, []);

    // ✅ Проверка устаревания кэша
    const isCacheStale = useCallback(() => {
        const cachedAt = localStorage.getItem("cached_at");
        if (!cachedAt) return true;
        const now = new Date();
        const cachedDate = new Date(cachedAt);
        const diffInHours = (now - cachedDate) / (1000 * 60 * 60);
        return diffInHours >= timeOffset;
    }, [timeOffset]);

    const refreshingRef = useRef(false);

    const handleRefreshEvents = useCallback(async () => {
        const jwtToken = getJWTTokenFromLocalStorage();
        if (localStorage.getItem("refresh_in_progress") === "true" || refreshingRef.current) return;
        localStorage.setItem("refresh_in_progress", "true");
        refreshingRef.current = true;
        const calendarId = getCalendarIdLocalStorage();

        // ✅ Проверка токена с защитой
        if (!jwtToken || isTokenExpired(jwtToken)) {
            if (!localStorage.getItem("toast_shown")) {
                localStorage.setItem("toast_shown", "true");
                toast.error("Сессия истекла. Вы будете перенаправлены на страницу авторизации.");
                setTimeout(() => {
                    // Сохраняем информацию о модальном окне GitHub перед очисткой
                    const githubStarModalShown = localStorage.getItem('githubStarModalShown');
                    const githubStarRemindDate = localStorage.getItem('githubStarRemindDate');
                    
                    localStorage.clear();
                    
                    // Восстанавливаем информацию о модальном окне GitHub после очистки
                    if (githubStarModalShown) {
                        localStorage.setItem('githubStarModalShown', githubStarModalShown);
                    }
                    if (githubStarRemindDate) {
                        localStorage.setItem('githubStarRemindDate', githubStarRemindDate);
                    }
                    
                    window.location.href = "/login";
                }, 5000);
            }
            return;
        }

        if (!calendarId) {
            console.warn("Попытка обновить кэш без calendarId. Пропущено.");
            return;
        }

        setCacheUpdated('loading');

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
                localStorage.setItem("cached_at", new Date().toISOString());
                setCacheUpdated(true);
                setTimeout(() => setCacheUpdated(false), 3000);
            } else {
                throw new Error('Не удалось обновить события');
            }

        } catch (error) {
            console.error('Ошибка при обновлении событий:', error);
            toast.error("Не удалось обновить кэш. Попробуйте позже.");
        } finally {
            refreshingRef.current = false;
            localStorage.setItem("refresh_in_progress", "false");
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
                        // Сохраняем информацию о модальном окне GitHub перед очисткой
                        const githubStarModalShown = localStorage.getItem('githubStarModalShown');
                        const githubStarRemindDate = localStorage.getItem('githubStarRemindDate');
                        
                        localStorage.clear();
                        
                        // Восстанавливаем информацию о модальном окне GitHub после очистки
                        if (githubStarModalShown) {
                            localStorage.setItem('githubStarModalShown', githubStarModalShown);
                        }
                        if (githubStarRemindDate) {
                            localStorage.setItem('githubStarRemindDate', githubStarRemindDate);
                        }
                        
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
        // Проверка просроченности кэша перед обновлением
        const autoRefresh = () => {
            const jwtToken = getJWTTokenFromLocalStorage();
            const calendarId = getCalendarIdLocalStorage();
            if (!jwtToken || isTokenExpired(jwtToken)) return;
            if (!calendarId) return;
            if (isCacheStale()) {
                handleRefreshEvents();
            }
        };
        autoRefresh();
        const intervalId = setInterval(autoRefresh, intervalTime);
        return () => {
            clearInterval(intervalId);
        };
    }, [handleRefreshEvents, timeOffset, isCacheStale]);

    return (
        <button
            onClick={handleRefreshEvents}
            className={`cache-btn ${cacheUpdated === true ? 'updated' : ''}`}
        >
            {cacheUpdated === 'loading' ? (
                <InlineLoader />
            ) : cacheUpdated === true ? (
                'Кэш обновлен'
            ) : (
                'Сбросить кэш расписания'
            )}
        </button>
    );
};

export default CacheUpdateBtn;
