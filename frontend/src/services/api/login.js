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
