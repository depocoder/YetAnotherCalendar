import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getLessonGrades } from '../../services/modeusGrades';
import { ATTENDANCE, formatGradeValue } from '../../utils/grades';
import '../../style/grades-modal.scss';

const ATTENDANCE_ROW = {
    PRESENT: '✅ Был на паре',
    ABSENT: '❌ Не был на паре',
};

/**
 * Посещаемость и оценки за пару Модеуса в ее карточке.
 *
 * Только для прошедших пар: у будущих отметок еще нет. Данные — из общего
 * кэша «Моих оценок» (их тянем фоном после загрузки календаря), «обновить»
 * перечитывает их из Модеуса. Если Модеус не ответил — блок просто не виден.
 */
const LessonGrade = ({ event }) => {
    const [state, setState] = useState({ status: 'loading' });
    // Карточка могла переключиться на другую пару, пока грузилась прежняя.
    const currentEventId = useRef(event?.id);
    currentEventId.current = event?.id;
    const isPast = Boolean(event?.start) && new Date(event.end || event.start) < new Date();

    const load = useCallback(async (force) => {
        const eventId = event.id;
        setState((prev) => ({ ...prev, status: 'loading' }));
        let result;
        try {
            result = await getLessonGrades(event, { force });
        } catch (e) {
            result = { status: 'error' };
        }
        if (currentEventId.current === eventId) setState(result);
    }, [event]);

    useEffect(() => {
        setState({ status: 'loading' });
        if (isPast) load(false);
    }, [isPast, load]);

    if (!isPast || state.status === 'error' || state.status === 'unknown-period') return null;

    if (state.status === 'no-vault') {
        return (
            <div className="lesson-grade lesson-grade--hint">
                🎓 Включите «Запомнить меня» при входе, чтобы видеть здесь посещаемость и оценки за пару.
            </div>
        );
    }
    if (state.status === 'rejected') {
        return (
            <div className="lesson-grade lesson-grade--hint">
                🎓 Модеус не принял сохраненный пароль — войдите заново с «Запомнить меня», чтобы видеть оценки.
            </div>
        );
    }

    const loading = state.status === 'loading';
    const lesson = state.lesson;
    const attendance = lesson?.attendance;

    return (
        <div className="lesson-grade">
            <div className="lesson-grade__head">
                <span className="lesson-grade__title">🎓 Посещаемость и оценки</span>
                <button
                    className="lesson-grade__refresh"
                    onClick={() => load(true)}
                    disabled={loading}
                    title="Перечитать из Модеуса"
                >
                    {loading ? '…' : '↻ обновить'}
                </button>
            </div>
            {loading && !('lesson' in state) ? (
                <span className="lesson-grade__muted">Загружаем из Модеуса…</span>
            ) : (
                <>
                    <span className={`grades-attendance lesson-grade__attendance ${attendance ? ATTENDANCE[attendance]?.className || '' : ''}`}>
                        {attendance
                            ? ATTENDANCE_ROW[attendance] || `Отметка: ${attendance.toLowerCase()}`
                            : 'Посещаемость не отмечена'}
                    </span>
                    {lesson?.results?.length > 0 ? (
                        <div className="lesson-grade__results">
                            {lesson.results.map((result, index) => (
                                <span className="grades-chip grades-chip--small" key={index} title={result.name}>
                                    <span className="grades-chip__name">{result.name}</span>
                                    <strong>{formatGradeValue(result.value)}</strong>
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span className="lesson-grade__muted">Оценок за пару нет</span>
                    )}
                </>
            )}
        </div>
    );
};

export default LessonGrade;
