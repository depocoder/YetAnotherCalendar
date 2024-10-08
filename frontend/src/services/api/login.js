import axios from 'axios';
import { BACKEND_URL } from '../../variables';


export function getTokenFromLocalStorage() {
    return localStorage.getItem('token')
}
// login
export async function loginModeus(username, password) {
    try {
        return await axios.post(`${BACKEND_URL}/api/netology/auth`, {username, password});
    } catch (e) {
        return e.response;
    }
} 

export async function searchModeus(fullName) {
    try {
        const params = new URLSearchParams();
        params.append('full_name', fullName);
        return await axios.get(`${BACKEND_URL}/api/modeus/search/?full_name=${fullName}`);

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
// calendar
export async function bulkEvents(username, password, sessionToken, calendarId, timeMin, timeMax, attendeePersonId) {
    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/bulk/events/?calendar_id=${calendarId}`,
            {
                timeMin,
                timeMax,
                size: 50,
                attendeePersonId: [attendeePersonId],
            },
            {
                headers: {
                    "_netology-on-rails_session": sessionToken, // Токен сессии
                    "Content-Type": "application/json",
                },
            }
        );
        return response;
    } catch (e) {
        return e.response;
    }
}
// Refresh calendar
export async function refreshBulkEvents(sessionToken, calendarId, timeMin, timeMax, attendeePersonId) {
    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/bulk/refresh_events/?calendar_id=${calendarId}`,
            {
                timeMin,
                timeMax,
                size: 50,
                attendeePersonId: [attendeePersonId],
            },
            {
                headers: {
                    "_netology-on-rails_session": sessionToken, // Токен сессии
                    "Content-Type": "application/json",
                },
            }
        );
        return response;
    } catch (e) {
        return e.response;
    }
}


