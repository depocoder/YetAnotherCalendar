import { toast } from 'react-toastify';
import { clearWithBackup } from './localStorageBackup';
import { forgetMe } from '../services/api';

export const exitApp = (navigate) => {
    toast.info("Вы вышли из системы.");
    // Удаляем «Запомнить меня» на сервере (best-effort) и чистим хранилище.
    forgetMe();
    setTimeout(() => {
        clearWithBackup();
        navigate("/login");
    }, 100);
};