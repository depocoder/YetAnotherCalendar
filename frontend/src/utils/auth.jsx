/**
 * Проверяет, истёк ли срок действия JWT токена.
 * @param {string} token - JWT в формате header.payload.signature.
 * @param {number} leewaySeconds - Допустимое отклонение времени в секундах для компенсации большого ping (по умолчанию 10 секунд).
 * @returns {boolean} true, если токен недействителен или истёк; false, если он ещё валиден.
 */
export function isTokenExpired(token, leewaySeconds = 10) {
  if (!token) return true; // Нет токена — считаем просроченным

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn(
        `Некорректный JWT: ожидалось 3 части (header.payload.signature), получено ${parts.length}`
      );
      return true;
    }

    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const now = Date.now();
    const leeway = leewaySeconds * 1000;

    // Токен считается просроченным, если его exp + погрешность меньше текущего времени
    return payload.exp * 1000 <= now - leeway;
  } catch (e) {
    console.error("Ошибка декодирования JWT:", e);
    return true;
  }
}

/**
 * Декодирует строку из формата Base64URL в Base64 и расшифровывает её через atob().
 * @param {string} str - Строка в формате Base64URL.
 * @returns {string} Декодированная строка.
 */
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4 !== 0) str += '=';
  return atob(str);
}
