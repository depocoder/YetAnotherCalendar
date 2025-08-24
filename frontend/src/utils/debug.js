/**
 * Debug utility for conditional console logging
 * Logs messages only when 'DebugEnabled' is set to 'true' in localStorage
 */

// Developer info - always shown in console
console.log('%c🎓 YetAnotherCalendar - Ваш персональный помощник по расписанию! 📅', 'color: #2196F3; font-size: 16px; font-weight: bold;');
console.log('%c✨ Исходный код:', 'color: #4CAF50; font-weight: bold;', 'https://github.com/depocoder/YetAnotherCalendar/');
console.log('%c⭐ Понравился проект? Поставьте звездочку на GitHub! 🌟', 'color: #FF9800; font-weight: bold;');
console.log('%c🐛 Нашли баг или есть предложения?', 'color: #9C27B0; font-weight: bold;', 'Создайте issue или внесите свой вклад!');
console.log('%c🔧 Хотите видеть отладочные сообщения? Введите:', 'color: #607D8B;', 'localStorage.setItem("DebugEnabled", "true")');
console.log('%c📝 Приятного использования календаря! 😊', 'color: #E91E63; font-weight: bold;');

/**
 * Checks if debug mode is enabled
 * @returns {boolean} True if debug mode is enabled
 */
const isDebugEnabled = () => {
    return localStorage.getItem('DebugEnabled') === 'true';
};

/**
 * Debug logger that wraps console methods with conditional logging
 */
export const debug = {
    /**
     * Logs a message if debug is enabled
     * @param {...any} args - Arguments to log
     */
    log: (...args) => {
        if (isDebugEnabled()) {
            console.log(...args);
        }
    },

    /**
     * Logs a warning if debug is enabled
     * @param {...any} args - Arguments to log
     */
    warn: (...args) => {
        if (isDebugEnabled()) {
            console.warn(...args);
        }
    },

    /**
     * Logs an error if debug is enabled
     * @param {...any} args - Arguments to log
     */
    error: (...args) => {
        if (isDebugEnabled()) {
            console.error(...args);
        }
    },

    /**
     * Logs an info message if debug is enabled
     * @param {...any} args - Arguments to log
     */
    info: (...args) => {
        if (isDebugEnabled()) {
            console.info(...args);
        }
    },

    /**
     * Enables debug logging by setting localStorage flag
     */
    enable: () => {
        localStorage.setItem('DebugEnabled', 'true');
        console.log('🐛 Debug logging enabled');
    },

    /**
     * Disables debug logging by removing localStorage flag
     */
    disable: () => {
        localStorage.removeItem('DebugEnabled');
        console.log('🔇 Debug logging disabled');
    },

    /**
     * Returns current debug status
     * @returns {boolean} True if debug is enabled
     */
    isEnabled: isDebugEnabled
};