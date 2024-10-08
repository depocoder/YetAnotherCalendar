import axios from 'axios';
import { BACKEND_URL } from '../../variables';


export function getTokenFromLocalStorage() {
    return localStorage.getItem('token')
}

export async function loginModeus(username, password) {
    try {
        return await axios.post(`${BACKEND_URL}/api/modeus`, {username, password});
    } catch (e) {
        return e.response;
    }
} 

export async function searchModeus(fullName) {
    try {
        const params = new URLSearchParams();
        params.append('full_name', fullName);
        return await axios.get(`${BACKEND_URL}/api/modeus/search_blank/`, params);
    } catch (e) {
        return e.response;
    }
} 