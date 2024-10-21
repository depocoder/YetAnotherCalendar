import axios from 'axios';

// env variable
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || `https://yetanothercalendar.ru`;
// const BACKEND_URL = 'http://localhost:8000';


export function getTokenFromLocalStorage() {
    return localStorage.getItem('token')
}
export function getCalendarIdLocalStorage() {
    return localStorage.getItem('calendarId')
}
export function getPersonIdLocalStorage() {
    return localStorage.getItem('personId')
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
        // const params = new URLSearchParams();
        // params.append('full_name', fullName);
        // return await axios.get(`${BACKEND_URL}/api/modeus/search/?full_name=${fullName}`);
        const response = await axios.get(`${BACKEND_URL}/api/modeus/search/`, {
            params: {
                full_name: fullName // Параметр передается через объект `params`
            },
            headers: {
                "Content-Type": "application/json"
            }
        });
        return response; // Возвращаем данные
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
export async function bulkEvents(sessionToken, calendarId, timeMin, timeMax, attendeePersonId, timeZone) {
    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/bulk/events/?calendar_id=${calendarId}&time_zone=${timeZone}`,
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
export async function refreshBulkEvents(sessionToken, calendarId, timeMin, timeMax, attendeePersonId, timeZone) {
    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/bulk/refresh_events/?calendar_id=${calendarId}&time_zone=${timeZone}`,
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
export async function exportICS(sessionToken, calendarId, timeMin, timeMax, attendeePersonId, timeZone) {
    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/bulk/export_ics/?calendar_id=${calendarId}&time_zone=${timeZone}`,
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

