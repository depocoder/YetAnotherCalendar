import axios from 'axios';
import { toast } from 'react-toastify';
import { clearWithBackup } from '../utils/localStorageBackup';
import { debug } from '../utils/debug';

// env variable
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || `https://yetanothercalendar.ru`;


export function getTokenFromLocalStorage() {
    return localStorage.getItem('token')
}
export function getModeusPersonIdFromLocalStorage() {
    const personId = localStorage.getItem('modeus_person_id');
    // Самоизлечение: из-за старого бага бэкенда (ошибка со статусом 200)
    // тут мог сохраниться "[object Object]" — считаем такое значение отсутствующим,
    // чтобы пользователя отправило на повторный логин.
    if (!personId || !/^[0-9a-fA-F-]{16,64}$/.test(personId)) {
        return null;
    }
    return personId;
}
export function getCalendarIdLocalStorage() {
    return localStorage.getItem('calendarId')
}
// Выбранные курсы Нетологии (массив id).
// Старый одиночный calendarId сознательно НЕ используется как fallback:
// пользователи, заходившие до мультикурсов, при первом заходе получат
// полный список курсов с автоматическим выбором всех (см. CalendarPage).
export function getCalendarIdsLocalStorage() {
    try {
        const raw = localStorage.getItem('calendarIds');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                const ids = parsed.map(Number).filter(Number.isFinite);
                if (ids.length > 0) return ids;
            }
        }
    } catch (e) {
        debug.error('Не удалось прочитать calendarIds из localStorage:', e);
    }
    return [];
}
export function setCalendarIdsLocalStorage(ids) {
    const cleanIds = (ids || []).map(Number).filter(Number.isFinite);
    localStorage.setItem('calendarIds', JSON.stringify(cleanIds));
    // Поддерживаем старый ключ для обратной совместимости.
    if (cleanIds.length > 0) {
        localStorage.setItem('calendarId', cleanIds[0]);
    }
}
// Список всех доступных курсов Нетологии (для выбора в модалке).
export function getNetologyCoursesLocalStorage() {
    try {
        const parsed = JSON.parse(localStorage.getItem('netologyCourses'));
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}
export function setNetologyCoursesLocalStorage(courses) {
    localStorage.setItem('netologyCourses', JSON.stringify(courses || []));
}

// Дефолтный выбор курсов: все, кроме «вводных» — у них нет расписания
// (Netology отвечает 404), выбирать их по умолчанию бессмысленно.
// Если вдруг все курсы «вводные» — берем все, чтобы не остаться с пустым выбором.
export function defaultCalendarIds(programs) {
    const meaningful = (programs || []).filter(
        program => !(program.title || '').toLowerCase().includes('вводный')
    );
    const chosen = meaningful.length > 0 ? meaningful : (programs || []);
    return chosen.map(program => program.id);
}
export function getLMSTokenFromLocalStorage() {
    return localStorage.getItem('lms-token')
}
export function getLMSIdFromLocalStorage() {
    return localStorage.getItem('lms-id')
}
export function getTutorTokenFromLocalStorage() {
    return localStorage.getItem('tutorToken')
}

// login Netology
export async function loginNetology(username, password) {
    try {
        return await axios.post(`${BACKEND_URL}/api/netology/auth`, {username, password});
    } catch (e) {
        return e.response;
    }
}
// get Modeus person ID
export async function getModeusPersonId(username, password) {
    try {
        return await axios.post(`${BACKEND_URL}/api/modeus/person-id/`, {username, password});
    } catch (e) {
        return e.response;
    }
}
// login lms
export async function loginLms(username, password, service = "test") {
    try {
        return await axios.post(`${BACKEND_URL}/api/lms/auth`, {username, password, service});
    } catch (e) {
        return e.response;
    }
}

// tutor login
export async function tutorLogin(password) {
    const response = await axios.post(`${BACKEND_URL}/api/auth/tutor/login`, {password});
    return response.data;
}


// calendar_id
export async function getNetologyCourse(sessionToken) {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/netology/course/`, {
            headers: {
                "_netology-on-rails_session": sessionToken, // Токен сессии передается в заголовке
                "Content-Type": "application/json"
            }
        });
        return response.data; // Возвращаем данные
    } catch (e) {
        return e.response;
    }
}


// Список всех курсов пользователя в Нетологии
export async function getNetologyCourses(sessionToken) {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/netology/courses/`, {
            headers: {
                "_netology-on-rails_session": sessionToken,
                "Content-Type": "application/json"
            }
        });
        return response.data;
    } catch (e) {
        return e.response;
    }
}


// --- Vault: «Запомнить меня» (httpOnly-cookie, креды зашифрованы на сервере) ---
export async function rememberMe(payload) {
    try {
        return await axios.post(`${BACKEND_URL}/api/vault/`, payload, {withCredentials: true});
    } catch (e) {
        return e.response;
    }
}

export async function getVaultStatus() {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/vault/`, {withCredentials: true});
        return response.data;
    } catch (e) {
        return {active: false};
    }
}

export async function refreshVaultSession(force = false) {
    // Бросает при неуспехе — вызывающий решает, что делать с 401.
    // force=true сбрасывает серверный кэш токенов: используется, когда токены
    // только что не сработали, чтобы не получить обратно те же мертвые.
    const response = await axios.post(
        `${BACKEND_URL}/api/vault/refresh${force ? '?force=true' : ''}`,
        null,
        {withCredentials: true}
    );
    return response.data;
}

export async function forgetMe() {
    try {
        return await axios.delete(`${BACKEND_URL}/api/vault/`, {withCredentials: true});
    } catch (e) {
        return e.response;
    }
}

// Кладем свежие токены из vault в localStorage (формат ответа /api/vault/refresh)
export function applyVaultSession(session) {
    localStorage.setItem('token', session.netology_session);
    localStorage.setItem('lms-id', session.lms_id);
    localStorage.setItem('lms-token', session.lms_token);
    localStorage.setItem('modeus_person_id', session.modeus_person_id);
    if (Array.isArray(session.calendar_ids) && session.calendar_ids.length > 0) {
        setCalendarIdsLocalStorage(session.calendar_ids);
    }
}

// Автопродление: на 401/403 от bulk-запросов пробуем один раз обновить
// сессию через vault и повторить исходный запрос.
let vaultRefreshInFlight = null;
axios.interceptors.response.use(
    response => response,
    async (error) => {
        const status = error?.response?.status;
        const url = error?.config?.url || '';
        const isBulk = url.includes('/api/bulk/');
        if ((status === 401 || status === 403) && isBulk && !error.config.__vaultRetried) {
            try {
                if (!vaultRefreshInFlight) {
                    // Токены только что не сработали — форсируем реаутентификацию.
                    vaultRefreshInFlight = refreshVaultSession(true).finally(() => {
                        vaultRefreshInFlight = null;
                    });
                }
                const session = await vaultRefreshInFlight;
                applyVaultSession(session);
                const retryConfig = {...error.config, __vaultRetried: true};
                retryConfig.headers = {
                    ...retryConfig.headers,
                    '_netology-on-rails_session': session.netology_session,
                    'lxp-token': session.lms_token,
                    'lxp-id': session.lms_id,
                    'modeus-person-id': session.modeus_person_id
                };
                debug.log('🔁 Сессия продлена через vault, повторяем запрос');
                return axios.request(retryConfig);
            } catch (refreshError) {
                debug.log('Vault недоступен или отвязан — обычный выход на логин');
            }
        }
        throw error;
    }
);

// --- ICS-подписка по URL ---
export function getIcsSubscriptionUrlLocalStorage() {
    return localStorage.getItem('icsSubscriptionUrl');
}

export function setIcsSubscriptionUrlLocalStorage(url) {
    if (url) {
        localStorage.setItem('icsSubscriptionUrl', url);
    } else {
        localStorage.removeItem('icsSubscriptionUrl');
    }
}

export async function createIcsSubscription(payload) {
    try {
        // withCredentials: при «Запомнить меня» подписка создается по vault-cookie
        // вообще без паролей в payload.
        return await axios.post(`${BACKEND_URL}/api/subscription/`, payload, {
            headers: {'Content-Type': 'application/json'},
            withCredentials: true
        });
    } catch (e) {
        return e.response;
    }
}

export async function deleteIcsSubscription(subscriptionUrl) {
    // URL подписки: .../api/subscription/{id}/{secret}/calendar.ics
    const deleteUrl = subscriptionUrl.replace(/\/calendar\.ics$/, '');
    try {
        return await axios.delete(deleteUrl);
    } catch (e) {
        return e.response;
    }
}


const apiRequest = async (endpoint, {
    calendarId,
    calendarIds,
    timeZone,
    timeMin,
    timeMax,
    sessionToken,
    modeusPersonId,
    lxpToken,
    lxpId,
    no_cache = true
}) => {
    // Формируем тело запроса
    const headers = {
        'Content-Type': 'application/json',
        '_netology-on-rails_session': sessionToken,
        'modeus-person-id': modeusPersonId,
        'lxp-token': lxpToken, // Добавляем заголовок для LXP
        'lxp-id': lxpId       // Добавляем заголовок для LXP ID
    };

    if (no_cache) {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
    }

    // Один и тот же параметр calendar_id повторяется для каждого выбранного курса
    const params = new URLSearchParams();
    const ids = Array.isArray(calendarIds) && calendarIds.length > 0
        ? calendarIds
        : (calendarId ? [calendarId] : []);
    ids.forEach(id => params.append('calendar_id', id));
    params.append('time_zone', timeZone);
    params.append('timeMin', timeMin);
    params.append('timeMax', timeMax);

    try {
        const response = await axios.get(
            `${BACKEND_URL}${endpoint}?${params.toString()}`,
            {
                headers,
            }
        );
        return response;
    } catch (error) {
        throw error;
    }
};

export const bulkEvents = (params) => {
    // Не логируем params целиком: там токены сессий.
    debug.log('bulkEvents', {
        calendarIds: params.calendarIds,
        timeMin: params.timeMin,
        timeMax: params.timeMax,
        timeZone: params.timeZone
    });
    return apiRequest('/api/bulk/events/', params);
};

export const refreshBulkEvents = (params) => {
    return apiRequest('/api/bulk/refresh_events/', params);
};

export const exportICS = (params) => {
    return apiRequest('/api/bulk/export_ics/', params);
};

// Modeus API functions
export async function getDayEvents(date, learningStartYear, profileName, specialtyCode) {
    try {
        const tutorToken = getTutorTokenFromLocalStorage();
        debug.log('Tutor token found:', !!tutorToken);
        
        if (!tutorToken) {
            throw new Error('Tutor token not found');
        }

        const requestBody = {
            date: date,
            learningStartYear: learningStartYear || [2024],
            profileName: profileName || ["Разработка ИТ-продуктов и информационных систем"],
            specialtyCode: specialtyCode || ["09.03.02"]
        };

        debug.log('Отправляем запрос к Modeus API:', {
            url: `${BACKEND_URL}/api/modeus/day-events/`,
            body: requestBody,
            hasToken: !!tutorToken
        });

        const response = await axios.post(`${BACKEND_URL}/api/modeus/day-events/`, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tutorToken}`
            }
        });

        debug.log('Получен ответ от Modeus API:', response.status, response.data);
        return response;
    } catch (e) {
        debug.error('Ошибка в getDayEvents:', e.response?.status, e.response?.data, e.message);
        return e.response;
    }
}

// MTS API functions
export async function saveLinkToEvent(lessonId, url) {
    try {
        const requestBody = {
            lessonId: lessonId,
            url: url
        };

        return await axios.post(`${BACKEND_URL}/api/mts/link`, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (e) {
        return e.response;
    }
}

export async function getMtsLinks(lessonIds) {
    try {
        const requestBody = {
            lessonIds: lessonIds
        };

        return await axios.post(`${BACKEND_URL}/api/mts/links`, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (e) {
        return e.response;
    }
}

// Statistics API functions
export async function getWeeklyUsersCount() {
    try {
        const tutorToken = getTutorTokenFromLocalStorage();

        if (!tutorToken) {
            throw new Error('Tutor token not found');
        }

        const response = await axios.get(`${BACKEND_URL}/api/bulk/user_metrix/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tutorToken}`
            }
        });

        return response.data;
    } catch (e) {
        debug.error('Error fetching weekly users count:', e);
        return { weekly_users: 0 };
    }
}