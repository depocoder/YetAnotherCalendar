export function isTokenExpired(token) {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now(); // exp в секундах, Date.now() в мс
    } catch (e) {
        return true; // если не удалось декодировать — считаем протухшим
    }
}
