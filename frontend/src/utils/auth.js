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
 * Принудительный выход (сессия истекла, битые токены): чистим только
 * браузер. Vault и подписку НЕ трогаем — живой vault сам восстановит
 * сессию на странице входа.
 */
export const exitApp = (navigate) => {
    setTimeout(() => {
        clearWithBackup();
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
    if (hadVault) {
        forgetMe();
    }

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
