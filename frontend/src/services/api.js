import axios from 'axios';

// env variable
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
// const BACKEND_URL = 'http://localhost:8000';


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
    console.log('sessionToken', sessionToken)
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

// export file
export async function exportICS(sessionToken, calendarId, timeMin, timeMax, attendeePersonId) {
    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/bulk/export_ics/?calendar_id=${calendarId}`, // URL с calendar_id в параметрах
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
                    "time_zone": "Europe/Moscow", // Добавляем time_zone в заголовки
                },
            }
        );
        return response;
    } catch (e) {
        return e.response;
    }
}

