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
    return localStorage.getItem('modeus_person_id')
}
export function getCalendarIdLocalStorage() {
    return localStorage.getItem('calendarId')
}
// Выбранные курсы Нетологии (массив id). Мигрирует со старого одиночного calendarId.
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
    const legacyId = Number(localStorage.getItem('calendarId'));
    return Number.isFinite(legacyId) && legacyId > 0 ? [legacyId] : [];
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
    debug.log('bulkEvents', params);
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
            profileName: profileName || ["Разработка IT-продуктов и информационных систем"],
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