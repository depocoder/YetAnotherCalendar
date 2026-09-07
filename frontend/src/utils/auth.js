import { toast } from 'react-toastify';
import { clearWithBackup } from './localStorageBackup';
import {
    forgetMe,
    getVaultStatus,
    deleteIcsSubscription,
    getIcsSubscriptionUrlLocalStorage
} from '../services/api';

export const exitApp = async (navigate) => {
    // Выход стирает все серверные данные пользователя: сохраненный вход
    // («Запомнить меня») и подписку на календарь. Сообщаем, что именно удалено.
    const subscriptionUrl = getIcsSubscriptionUrlLocalStorage();
    let hadVault = false;
    try {
        hadVault = (await getVaultStatus())?.active === true;
    } catch (e) { /* сервер недоступен — выходим молча */ }

    if (subscriptionUrl) {
        deleteIcsSubscription(subscriptionUrl);
    }
    if (hadVault) {
        forgetMe();
    }

    if (hadVault && subscriptionUrl) {
        toast.info('Вы вышли. Сохраненный вход и подписка на календарь удалены с сервера.');
    } else if (hadVault) {
        toast.info('Вы вышли. Сохраненный вход («Запомнить меня») удален с сервера.');
    } else if (subscriptionUrl) {
        toast.info('Вы вышли. Подписка на календарь удалена с сервера.');
    } else {
        toast.info('Вы вышли из системы.');
    }

    setTimeout(() => {
        clearWithBackup();
        navigate('/login');
    }, 100);
};
