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

const CacheUpdateBtn = ({ date, onDataUpdate, cachedAt, calendarReady = false }) => {
    const [cacheUpdated, setCacheUpdated] = useState(false);
    const timeOffset = parseInt(process.env.REACT_APP_TIME_OFFSET, 10) || 6;
    const toastShownRef = useRef(false); // ✅ защита от дублирующих уведомлений

    // ✅ Очистка флагов при первом монтировании
    useEffect(() => {
        localStorage.removeItem("toast_shown");
        localStorage.removeItem("refresh_in_progress");
    }, []);

    // ✅ Проверка является ли неделя текущей или будущей
    const isCurrentOrFutureWeek = useCallback(() => {
        if (!date?.end) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(date.end);
        weekEnd.setHours(0, 0, 0, 0);
        const isFuture = weekEnd >= today;
        console.log(`📅 Week check: ${date.end} >= ${today.toISOString().split('T')[0]} = ${isFuture}`);
        return isFuture;
    }, [date]);

    // ✅ Проверка устаревания кэша (теперь используя API timestamp)
    const isCacheStale = useCallback(() => {
        if (!cachedAt) {
            console.log('📦 No cache timestamp from API, assuming fresh');
            return false;
        }
        const now = new Date();
        const cachedDate = new Date(cachedAt);
        
        console.log('🕐 Current time (now):', now.toISOString());
        console.log('🕐 Cached time from API:', cachedAt);
        console.log('🕐 Parsed cached date:', cachedDate.toISOString());
        
        const diffInHours = (now - cachedDate) / (1000 * 60 * 60);
        const isStale = diffInHours >= timeOffset;
        console.log(`📦 Cache: Age ${diffInHours.toFixed(1)}h, threshold ${timeOffset}h - ${isStale ? 'STALE' : 'FRESH'}`);
        return isStale;
    }, [cachedAt, timeOffset]);

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
                console.log('✅ Cache refresh successful - updated data received');
                onDataUpdate(refreshEventsResponse.data);
                setCacheUpdated(true);
                setTimeout(() => setCacheUpdated(false), 3000);
            } else {
                throw new Error('Не удалось обновить события');
            }

        } catch (error) {
            console.error('❌ Cache refresh failed:', error);
            toast.error("Не удалось обновить кэш. Попробуйте позже.");
            setCacheUpdated(false); // Убираем анимацию загрузки при ошибке
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

    // ⏱ Автоматическое обновление кэша (только для текущих/будущих недель)
    const autoRefreshTimerRef = useRef(null);
    
    useEffect(() => {
        console.log('🎯 Auto-refresh effect triggered - calendarReady:', calendarReady);
        
        // Очищаем предыдущий таймер при смене недели
        if (autoRefreshTimerRef.current) {
            console.log('🧹 Clearing previous auto-refresh timer');
            clearTimeout(autoRefreshTimerRef.current);
            autoRefreshTimerRef.current = null;
        }
        
        if (!calendarReady) {
            console.log('⏳ Calendar not ready yet - waiting...');
            return;
        }
        
        if (!isCurrentOrFutureWeek()) {
            console.log('📅 Past week detected - auto-refresh disabled');
            return;
        }
        
        console.log('✅ Calendar ready + current/future week - starting 10s timer...');
        
        autoRefreshTimerRef.current = setTimeout(() => {
            console.log('⏰ 10 seconds elapsed - checking cache...');
            
            const jwtToken = getJWTTokenFromLocalStorage();
            const calendarId = getCalendarIdLocalStorage();
            
            if (!jwtToken || isTokenExpired(jwtToken)) {
                console.log('❌ Auto-refresh skipped - invalid token');
                return;
            }
            if (!calendarId) {
                console.log('❌ Auto-refresh skipped - no calendarId');
                return;
            }
            if (isCacheStale()) {
                console.log('🚀 Cache is stale - triggering auto-refresh!');
                handleRefreshEvents();
            } else {
                console.log('✨ Cache is fresh - no refresh needed');
            }
        }, 10000); // 10 seconds
        
        return () => {
            if (autoRefreshTimerRef.current) {
                console.log('🧹 Cleaning up auto-refresh timer');
                clearTimeout(autoRefreshTimerRef.current);
                autoRefreshTimerRef.current = null;
            }
        };
    }, [calendarReady, isCurrentOrFutureWeek, isCacheStale, handleRefreshEvents]);

    const isPastWeek = !isCurrentOrFutureWeek();
    
    console.log('🖲️ CacheUpdateBtn render - isPastWeek:', isPastWeek, 'cachedAt:', cachedAt, 'calendarReady:', calendarReady);
    
    return (
        <button
            onClick={handleRefreshEvents}
            className={`cache-btn ${cacheUpdated === true ? 'updated' : ''} ${isPastWeek ? 'past-week' : ''}`}
            title={isPastWeek ? 'Автообновление отключено для прошедших недель. Нажмите для ручного обновления.' : ''}
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
