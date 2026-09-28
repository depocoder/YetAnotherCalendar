import React from 'react';
import { toast } from 'react-toastify';
import { exitApp } from "../utils/auth";
import { isServiceRestarting, RESTART_TITLE, RESTART_TEXT } from "./serviceRestart";

/**
 * Handles API errors by displaying a formatted toast message.
 * @param {Error} error - The error object (usually from axios).
 * @param {string} defaultTitle - A context-specific default error title.
 * @param {function|null} navigate - The navigate function from react-router-dom.
 * @param {object} options - restartAware: перезапуск бэкенда (деплой) показывать
 *   спокойным уведомлением, а не ошибкой; false — когда вызывающий уже сам ждал.
 */
export const handleApiError = (error, defaultTitle = "Произошла ошибка", navigate = null, { restartAware = true } = {}) => {
    let title = defaultTitle;
    let details = "";

    if (restartAware && isServiceRestarting(error)) {
        toast.info(
            <div>
                <strong style={{ display: 'block', marginBottom: '4px' }}>{RESTART_TITLE}</strong>
                <span style={{ fontSize: '0.9em' }}>{RESTART_TEXT} Попробуйте еще раз.</span>
            </div>,
            { toastId: 'service-restart', autoClose: 8000 },
        );
        return;
    }
    // if (error.message === "Refresh token exception!"){
    //     // When we refresh token we don't use this func
    //     return
    // }

    if (error.response) {
        // Server responded with a status code (4xx, 5xx)
        const status = error.response.status;
        // Try to get message from { message: "..." } or use data as string
        const responseMessage = error.response.data?.message || error.response.data;

        switch (status) {
            case 500:
                title = "Внутренняя ошибка сервера (500).";
                details = "Сервер столкнулся с проблемой. Попробуйте позже.";
                break;
            case 503:
                title = "Сервис временно недоступен (503).";
                details = "Ведутся технические работы или сервер перегружен.";
                break;
            case 401:
            case 403:
                if (navigate) {
                    exitApp(navigate);
                }
                toast.error("Сессия истекла. Необходимо войти заново.");
                return;
            case 404:
                title = "Не найдено (404).";
                details = "Не удалось найти запрашиваемый ресурс.";
                break;
            default:
                // Use the defaultTitle for other server errors
                title = `${defaultTitle} (Ошибка ${status}).`;
        }

        // Overwrite generic details with specific server message if available
        
    } else if (error.request) {
        // Request was made but no response received (network error)
        title = "Ошибка сети.";
        details = "Не удалось подключиться к серверу. Проверьте интернет-соединение.";
    } else {
        // Other errors (e.g., JS error in `try` block)
        title = "Ошибка приложения.";
        details = error.message;
    }

    toast.error(
        <div>
            <strong style={{ display: 'block', marginBottom: '4px' }}>{title}</strong>
            {details && <span style={{ fontSize: '0.9em' }}>{details}</span>}
            <br />
            <a href="/feedback" style={{ color: '#7b61ff', textDecoration: 'underline', marginTop: '8px', display: 'inline-block' }}>
                Нужна помощь?
            </a>
        </div>
    );
};