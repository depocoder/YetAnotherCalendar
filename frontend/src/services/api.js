import axios from 'axios';

// env variable
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || `https://yetanothercalendar.ru`;


export function getTokenFromLocalStorage() {
    return localStorage.getItem('token')
}
export function getJWTTokenFromLocalStorage() {
    return localStorage.getItem('jwt-token')
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

// login Netology
export async function loginNetology(username, password) {
    try {
        return await axios.post(`${BACKEND_URL}/api/netology/auth`, {username, password});
    } catch (e) {
        return e.response;
    }
}
// login Modeus
export async function loginModeus(username, password) {
    try {
        return await axios.post(`${BACKEND_URL}/api/modeus/auth/`, {username, password});
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
    jwtToken,
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
                    'modeus-jwt-token': jwtToken,
                    'lxp-token': lxpToken, // Добавляем заголовок для LXP
                    'lxp-id': lxpId       // Добавляем заголовок для LXP ID
                },
            }
        );
        return response;
    } catch (error) {
        console.error('Ошибка при получении данных:', error.response ? error.response.data : error.message);
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
        const modeusToken = getJWTTokenFromLocalStorage();
        console.log('Modeus token found:', !!modeusToken, modeusToken ? `${modeusToken.substring(0, 20)}...` : 'null');
        
        if (!modeusToken) {
            throw new Error('Modeus token not found');
        }

        const requestBody = {
            date: date,
            learningStartYear: learningStartYear || [2024],
            profileName: profileName || ["Разработка IT-продуктов и информационных систем"],
            specialtyCode: specialtyCode || ["09.03.02"]
        };

        console.log('Отправляем запрос к Modeus API:', {
            url: `${BACKEND_URL}/api/modeus/day-events/`,
            body: requestBody,
            hasToken: !!modeusToken
        });

        const response = await axios.post(`${BACKEND_URL}/api/modeus/day-events/`, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'modeus-jwt-token': modeusToken
            }
        });

        console.log('Получен ответ от Modeus API:', response.status, response.data);
        return response;
    } catch (e) {
        console.error('Ошибка в getDayEvents:', e.response?.status, e.response?.data, e.message);
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