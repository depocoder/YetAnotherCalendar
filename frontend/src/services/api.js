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


const apiRequest = async (endpoint, {
    calendarId,
    timeZone,
    timeMin,
    timeMax,
    sessionToken,
    modeusPersonId,
    lxpToken,
    lxpId
}) => {
    // Формируем тело запроса

    try {
        const response = await axios.get(
            `${BACKEND_URL}${endpoint}?calendar_id=${calendarId}&time_zone=${timeZone}&timeMin=${timeMin}&timeMax=${timeMax}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    '_netology-on-rails_session': sessionToken,
                    'modeus-person-id': modeusPersonId,
                    'lxp-token': lxpToken, // Добавляем заголовок для LXP
                    'lxp-id': lxpId       // Добавляем заголовок для LXP ID
                },
            }
        );
        return response;
    } catch (error) {        
        // Handle 401 Unauthorized errors
        if (error.response?.status === 401) {
            if (!localStorage.getItem("toast_shown")) {
                localStorage.setItem("toast_shown", "true");
                toast.error("Сессия истекла. Вы будете перенаправлены на страницу авторизации.");
                setTimeout(() => {
                    clearWithBackup();
                    window.location.href = "/login";
                }, 5000);
            }
            return
        }
        else {
            debug.error('Ошибка при получении данных:', error.response ? error.response.data : error.message);
        }
        
        throw error; // Пробрасываем ошибку, если необходимо
    }
};

export const bulkEvents = (params) => {
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