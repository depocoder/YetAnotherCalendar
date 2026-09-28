// «Сервис обновляется»: во время деплоя бэкенд перезапускается, и прокси
// отвечает 502/503/504 своей HTML-страницей (или соединения нет вовсе).
// Это не ошибка, которую надо показывать красным: через минуту все вернется.
//
// Отличаем от настоящих ошибок: наш бэкенд на сбой внешнего сервиса отвечает
// JSON с полем detail ({"detail": "LMS is unavailable"}), а сбой сервиса при
// сборке недели вообще уходит в 200 с failures (ServiceStatusBanner). Так что
// «перезапуск» — это 502/503/504 без JSON-detail либо ответ не пришел совсем
// (axios: error.request есть, error.response нет), хотя сеть у пользователя есть.

const RESTART_STATUSES = [502, 503, 504];

const isBackendError = (data) => Boolean(data) && typeof data === 'object' && 'detail' in data;

export function isServiceRestarting(error) {
    const response = error?.response;
    if (response) {
        return RESTART_STATUSES.includes(response.status) && !isBackendError(response.data);
    }
    const online = typeof navigator === 'undefined' || navigator.onLine !== false;
    return Boolean(error?.request) && online;
}

// Паузы между повторами календаря: сначала часто, потом реже — всего около четырех минут.
export const RESTART_RETRY_DELAYS = [5000, 10000, 15000, 30000, 30000, 60000, 60000];

export const RESTART_TITLE = 'Вы попали на редкое событие: сервис обновляется';
export const RESTART_TEXT = 'Как раз время повторить конспект 📚 — через минуту все вернется.';
// Для окон с кнопкой «Повторить».
export const RESTART_HINT = `${RESTART_TITLE}. ${RESTART_TEXT} Нажмите «Повторить» чуть позже.`;
