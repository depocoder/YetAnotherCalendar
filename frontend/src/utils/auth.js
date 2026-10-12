import { toast } from 'react-toastify';
import { clearWithBackup } from './localStorageBackup';
import {
    forgetMe,
    getVaultStatus,
    deleteIcsSubscription,
    getIcsSubscriptionUrlLocalStorage,
    setIcsSubscriptionUrlLocalStorage
} from '../services/api';

/**
 * Истекшая сессия: предлагаем повторный вход, сохраняя данные, с которыми
 * можно прочитать предыдущий календарь из Redis при сбое авторизации.
 * Осознанный выход пользователя ниже по-прежнему очищает хранилище.
 */
export const exitApp = (navigate) => {
    setTimeout(() => {
        const calendarKeys = ['modeus_person_id', 'calendarIds', 'calendarId', 'netologyCourses'];
        const savedCalendar = calendarKeys.map(key => [key, localStorage.getItem(key)]);
        clearWithBackup();
        savedCalendar.forEach(([key, value]) => {
            if (value !== null) localStorage.setItem(key, value);
        });
        navigate('/login');
    }, 100);
};

/**
 * Осознанный выход пользователя: сохраненный вход («Запомнить меня»)
 * удаляется всегда, подписка — по выбору пользователя (deleteSubscription).
 */
export const logoutUser = async (navigate, { deleteSubscription = false } = {}) => {
    const subscriptionUrl = getIcsSubscriptionUrlLocalStorage();
    let hadVault = false;
    try {
        hadVault = (await getVaultStatus())?.active === true;
    } catch (e) { /* сервер недоступен — выходим молча */ }

    if (deleteSubscription && subscriptionUrl) {
        deleteIcsSubscription(subscriptionUrl);
    }
    // Удаляем также cookie доступа к кэшу, которая есть и без «Запомнить меня».
    await forgetMe();

    const removedSubscription = deleteSubscription && subscriptionUrl;
    if (hadVault && removedSubscription) {
        toast.info('Вы вышли. Сохраненный вход и подписка на календарь удалены с сервера.');
    } else if (hadVault && subscriptionUrl) {
        toast.info('Вы вышли. Сохраненный вход удален, подписка продолжит работать.');
    } else if (hadVault) {
        toast.info('Вы вышли. Сохраненный вход («Запомнить меня») удален с сервера.');
    } else if (removedSubscription) {
        toast.info('Вы вышли. Подписка на календарь удалена с сервера.');
    } else {
        toast.info('Вы вышли из системы.');
    }

    setTimeout(() => {
        clearWithBackup();
        // Оставленная подписка должна остаться управляемой с этого устройства
        if (!deleteSubscription && subscriptionUrl) {
            setIcsSubscriptionUrlLocalStorage(subscriptionUrl);
        }
        navigate('/login');
    }, 100);
};
