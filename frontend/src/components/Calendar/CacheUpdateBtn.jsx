import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
    getCalendarIdLocalStorage,
    getTokenFromLocalStorage,
    refreshBulkEvents,
    getModeusPersonIdFromLocalStorage,
    getLMSTokenFromLocalStorage,
    getLMSIdFromLocalStorage
} from "../../services/api";
import InlineLoader from '../../elements/InlineLoader';
import { debug } from '../../utils/debug';

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
        debug.log(`📅 Week check: ${date.end} >= ${today.toISOString().split('T')[0]} = ${isFuture}`);
        return isFuture;
    }, [date]);

    // ✅ Проверка устаревания кэша (теперь используя API timestamp)
    const isCacheStale = useCallback(() => {
        if (!cachedAt) {
            debug.log('📦 No cache timestamp from API, assuming fresh');
            return false;
        }
        const now = new Date();
        const cachedDate = new Date(cachedAt);
        
        debug.log('🕐 Current time (now):', now.toISOString());
        debug.log('🕐 Cached time from API:', cachedAt);
        debug.log('🕐 Parsed cached date:', cachedDate.toISOString());
        
        const diffInHours = (now - cachedDate) / (1000 * 60 * 60);
        const isStale = diffInHours >= timeOffset;
        debug.log(`📦 Cache: Age ${diffInHours.toFixed(1)}h, threshold ${timeOffset}h - ${isStale ? 'STALE' : 'FRESH'}`);
        return isStale;
    }, [cachedAt, timeOffset]);

    const refreshingRef = useRef(false);

    const handleRefreshEvents = useCallback(async () => {
        const modeusPersonId = getModeusPersonIdFromLocalStorage();
        if (localStorage.getItem("refresh_in_progress") === "true" || refreshingRef.current) return;
        localStorage.setItem("refresh_in_progress", "true");
        refreshingRef.current = true;
        const calendarId = getCalendarIdLocalStorage();


        if (!calendarId) {
            debug.warn("Попытка обновить кэш без calendarId. Пропущено.");
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
                modeusPersonId,
                lxpToken: getLMSTokenFromLocalStorage(),
                lxpId: getLMSIdFromLocalStorage()
            });

            if (refreshEventsResponse && refreshEventsResponse.data) {
                debug.log('✅ Cache refresh successful - updated data received');
                onDataUpdate(refreshEventsResponse.data);
                setCacheUpdated(true);
                setTimeout(() => setCacheUpdated(false), 3000);
            } else {
                throw new Error('Не удалось обновить события');
            }

        } catch (error) {
            debug.error('❌ Cache refresh failed:', error);
            setCacheUpdated(false); // Убираем анимацию загрузки при ошибке
            
            const cacheError = "Не удалось обновить кэш расписания.";
            toast.error(
                <div>
                    {cacheError} <a href="/feedback" style={{color: '#7b61ff', textDecoration: 'underline'}}>Нужна помощь?</a>
                </div>
            );
        } finally {
            refreshingRef.current = false;
            localStorage.setItem("refresh_in_progress", "false");
        }
    }, [date, onDataUpdate]);


    // ⏱ Автоматическое обновление кэша (только для текущих/будущих недель)
    const autoRefreshTimerRef = useRef(null);
    
    useEffect(() => {
        debug.log('🎯 Auto-refresh effect triggered - calendarReady:', calendarReady);
        
        // Очищаем предыдущий таймер при смене недели
        if (autoRefreshTimerRef.current) {
            debug.log('🧹 Clearing previous auto-refresh timer');
            clearTimeout(autoRefreshTimerRef.current);
            autoRefreshTimerRef.current = null;
        }
        
        if (!calendarReady) {
            debug.log('⏳ Calendar not ready yet - waiting...');
            return;
        }
        
        if (!isCurrentOrFutureWeek()) {
            debug.log('📅 Past week detected - auto-refresh disabled');
            return;
        }
        
        debug.log('✅ Calendar ready + current/future week - starting 10s timer...');
        
        autoRefreshTimerRef.current = setTimeout(() => {
            debug.log('⏰ 10 seconds elapsed - checking cache...');
            
            const modeusPersonId = getModeusPersonIdFromLocalStorage();
            const calendarId = getCalendarIdLocalStorage();
            
            if (!modeusPersonId) {
                debug.log('❌ Auto-refresh skipped - no person ID');
                return;
            }
            if (!calendarId) {
                debug.log('❌ Auto-refresh skipped - no calendarId');
                return;
            }
            if (isCacheStale()) {
                debug.log('🚀 Cache is stale - triggering auto-refresh!');
                handleRefreshEvents();
            } else {
                debug.log('✨ Cache is fresh - no refresh needed');
            }
        }, 10000); // 10 seconds
        
        return () => {
            if (autoRefreshTimerRef.current) {
                debug.log('🧹 Cleaning up auto-refresh timer');
                clearTimeout(autoRefreshTimerRef.current);
                autoRefreshTimerRef.current = null;
            }
        };
    }, [calendarReady, isCurrentOrFutureWeek, isCacheStale, handleRefreshEvents]);

    const isPastWeek = !isCurrentOrFutureWeek();
    
    debug.log('🖲️ CacheUpdateBtn render - isPastWeek:', isPastWeek, 'cachedAt:', cachedAt, 'calendarReady:', calendarReady);
    
    return (
        <button
            onClick={handleRefreshEvents}
            className={`cache-btn ${cacheUpdated === true ? 'updated' : ''} ${isPastWeek ? 'past-week' : ''}`}
            title='Так как мы не храним логины и пароли, все расписание находится в кэше, а его рано или поздно надо обновлять для актуальности. Само расписание обновляется автоматически, но вы можете обновить его вручную, если вам это нужно.'
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
