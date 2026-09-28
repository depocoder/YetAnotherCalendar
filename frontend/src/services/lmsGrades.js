import { getLmsGrades } from './api';

/**
 * Баллы из журнала LMS для карточек заданий.
 *
 * Журнал читаем по курсу и лениво — когда открыли карточку его задания; держим
 * только в памяти вкладки (оценки личные, в localStorage им не место). Ключ —
 * course_id. Кэшируем только удачные ответы (в том числе пустой журнал закрытого
 * курса); ошибки и 401 не кэшируем — следующая карточка попробует снова.
 */
const courses = new Map();

export function fetchLmsCourseGrades(courseId, { force = false } = {}) {
    const key = String(courseId);
    if (!force && courses.has(key)) {
        return courses.get(key);
    }
    const promise = getLmsGrades(courseId).then((response) => {
        if (response?.status !== 200) {
            courses.delete(key);
        }
        return response;
    });
    courses.set(key, promise);
    return promise;
}

/**
 * Баллы за конкретный элемент курса (event.id — module id в LMS).
 * {status, grade}: status — 'ok' | 'none' (в журнале нет строки) | 'no-course'
 * (старый кэш календаря без course_id) | 'expired' | 'error'.
 */
export async function getModuleGrade(event) {
    if (!event?.course_id) return { status: 'no-course' };
    const response = await fetchLmsCourseGrades(event.course_id);
    if (response?.status === 401) return { status: 'expired' };
    if (response?.status !== 200) return { status: 'error' };
    const grade = response.data?.[event.id];
    return grade ? { status: 'ok', grade } : { status: 'none' };
}
