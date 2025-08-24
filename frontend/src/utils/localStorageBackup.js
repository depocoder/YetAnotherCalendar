/**
 * Utility для резервного копирования и восстановления важных данных localStorage
 * перед очисткой всего хранилища
 */
import { debug } from './debug';

// Список ключей, которые нужно сохранять при очистке localStorage
const PERSISTENT_KEYS = [
    'githubStarModalShown',    // Флаг показа модального окна GitHub
    'githubStarRemindDate',    // Дата напоминания о GitHub звезде
    'calendarFirstVisit',       // Дата первого визита в календарь
    'deadlinesVisible',        // Флаг видимости дедлайнов
    'DebugEnabled'            // Флаг включения отладочных сообщений
];

/**
 * Создает резервную копию важных данных localStorage
 * @returns {Object} Объект с сохраненными данными
 */
export const backupPersistentData = () => {
    const backup = {};
    
    PERSISTENT_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
            backup[key] = value;
        }
    });
    
    debug.log('💾 Backup created:', backup);
    return backup;
};

/**
 * Восстанавливает данные из резервной копии в localStorage
 * @param {Object} backup - Объект с данными для восстановления
 */
export const restorePersistentData = (backup) => {
    if (!backup || typeof backup !== 'object') {
        debug.warn('⚠️ Invalid backup data provided');
        return;
    }
    
    PERSISTENT_KEYS.forEach(key => {
        if (backup[key] !== undefined) {
            localStorage.setItem(key, backup[key]);
        }
    });
    
    debug.log('🔄 Persistent data restored:', backup);
};

/**
 * Очищает localStorage с сохранением важных данных
 * Удобная функция для использования вместо прямого localStorage.clear()
 */
export const clearWithBackup = () => {
    const backup = backupPersistentData();
    localStorage.clear();
    restorePersistentData(backup);
    debug.log('🧹 localStorage cleared with persistent data backup');
};

/**
 * Добавляет новый ключ в список для сохранения
 * @param {string} key - Ключ для добавления в persistent список
 */
export const addPersistentKey = (key) => {
    if (!PERSISTENT_KEYS.includes(key)) {
        PERSISTENT_KEYS.push(key);
        debug.log(`📝 Added persistent key: ${key}`);
    }
};

/**
 * Получает список всех persistent ключей
 * @returns {Array} Массив ключей
 */
export const getPersistentKeys = () => {
    return [...PERSISTENT_KEYS];
};