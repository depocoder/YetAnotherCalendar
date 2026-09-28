import { getGrades, getVaultStatus } from './api';

/**
 * Общий кэш оценок Модеуса для «Моих оценок» и карточек пар.
 *
 * Держим только в памяти вкладки — оценки личные, в localStorage им не место.
 * Ключ — period_id семестра, 'current' — ответ без period_id (текущий семестр).
 * Кэшируем успешные ответы и 401/403 (без «Запомнить меня» повторять
 * бессмысленно); ошибки Модеуса не кэшируем — следующий запрос повторит.
 */
const responses = new Map();
const CURRENT = 'current';
let vaultPromise = null;

const isCacheable = (status) => status === 200 || status === 401 || status === 403;

// Кто показывает оценки (плитки пар, карточки) узнает о свежих данных.
const listeners = new Set();

export function subscribeModeusGrades(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function fetchGrades(periodId = null, { force = false } = {}) {
    const key = periodId || CURRENT;
    if (!force && responses.has(key)) {
        return responses.get(key);
    }
    const promise = getGrades(periodId).then((response) => {
        if (!isCacheable(response?.status)) {
            responses.delete(key);
        } else if (response.status === 200 && response.data?.period_id) {
            responses.set(response.data.period_id, promise);
        }
        if (response?.status === 200) {
            // После return: слушатели читают кэш, где этот промис уже готов.
            setTimeout(() => listeners.forEach((listener) => listener()), 0);
        }
        return response;
    });
    responses.set(key, promise);
    return promise;
}

function getVault({ force = false } = {}) {
    if (force || !vaultPromise) {
        vaultPromise = getVaultStatus();
    }
    return vaultPromise;
}

/** Фоновая загрузка текущего семестра после загрузки календаря — только с «Запомнить меня». */
export async function prefetchModeusGrades() {
    const vault = await getVault();
    if (vault?.active && !vault.broken) {
        await fetchGrades();
    }
}

// Дата пары (YYYY-MM-DD по часам самой пары): так же записаны границы семестров.
const eventDate = (event) => String(event.start || '').slice(0, 10);

const lessonIndexes = new WeakMap();

function lessonsByEvent(data) {
    if (!lessonIndexes.has(data)) {
        const index = new Map();
        data.courses.forEach((course) => course.lessons.forEach((lesson) => {
            if (lesson.event_id) index.set(lesson.event_id, { lesson, course });
        }));
        lessonIndexes.set(data, index);
    }
    return lessonIndexes.get(data);
}

/**
 * Посещаемость и оценки за конкретную пару календаря.
 *
 * Пара и оценки связаны id события Модеуса. Возвращает {status, lesson, course}:
 * status — 'ok' | 'no-vault' | 'rejected' | 'error' | 'unknown-period';
 * при 'ok' без lesson — отметок за пару нет.
 */
export async function getLessonGrades(event, { force = false } = {}) {
    const vault = await getVault({ force });
    if (!vault?.active) return { status: 'no-vault' };
    if (vault.broken) return { status: 'rejected' };

    const current = await fetchGrades(null, { force });
    if (current?.status === 401) return { status: 'no-vault' };
    if (current?.status === 403) return { status: 'rejected' };
    if (current?.status !== 200) return { status: 'error' };

    const date = eventDate(event);
    const period = current.data.periods.find((item) => item.start_date <= date && date <= item.end_date);
    if (!period) return { status: 'unknown-period' };

    let data = current.data;
    if (period.id !== current.data.period_id) {
        const response = await fetchGrades(period.id, { force });
        if (response?.status !== 200) return { status: 'error' };
        data = response.data;
    }
    const found = lessonsByEvent(data).get(event.id);
    return { status: 'ok', lesson: found?.lesson || null, course: found?.course || null };
}
