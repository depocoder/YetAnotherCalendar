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