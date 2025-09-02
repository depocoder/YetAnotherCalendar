import { toast } from 'react-toastify';
import { clearWithBackup } from './localStorageBackup';

export const exitApp = (navigate) => {
    toast.info("Вы вышли из системы.");
    setTimeout(() => {
        clearWithBackup();
        navigate("/login");
    }, 100);
};