import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getLessonGrades } from '../../services/modeusGrades';
import { MarkPills, describeMarks, hasMarks } from './LessonMarks';
import '../../style/lesson-marks.scss';

const RefreshIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M23 4v6h-6M20.5 15a9 9 0 1 1-2.1-9.4L23 10" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// Почему оценок нет, хотя пара прошла: одной строкой, без лишних слов.
const HINT = {
    'no-vault': 'Оценки за пару видны только со включенным «Запомнить меня» при входе.',
    rejected: 'Модеус не принял сохраненный пароль — войдите заново с «Запомнить меня», чтобы видеть оценки.',
};

/**
 * Посещаемость и оценки за пару Модеуса в ее карточке: те же пилюли, что на
 * плитке, плюс кнопка «перечитать» — оценку могли поставить после загрузки.
 *
 * Только для прошедших пар и только если Модеус что-то отметил: неизвестное —
 * не отметка, карточка без нее остается как была. Данные — из общего кэша
 * «Моих оценок». Если Модеус не ответил — блока просто нет.
 * variant: 'detail' — строка в панели под расписанием, 'modal' — строка карточки-модалки.
 */
const LessonGrade = ({ event, variant = 'detail' }) => {
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

    if (!isPast) return null;

    const hint = HINT[state.status];
    const loading = state.status === 'loading';
    // Пока грузится впервые — ничего: кэш обычно уже теплый, строка появится сразу.
    if (!hint && !hasMarks(state.lesson)) return null;

    const body = hint ? (
        <span className="lesson-grade__hint">{hint}</span>
    ) : (
        // Кнопка — внутри строки пилюль, чтобы при переносе не оставаться одна на строке.
        <MarkPills
            lesson={state.lesson}
            withNames
            className="lesson-marks--labelled"
            role="group"
            aria-label={describeMarks(state.lesson)}
        >
            <button
                type="button"
                className={`lesson-grade__refresh ${loading ? 'lesson-grade__refresh--busy' : ''}`}
                onClick={() => load(true)}
                disabled={loading}
                title="Перечитать из Модеуса"
                aria-label="Перечитать из Модеуса"
            >
                <RefreshIcon />
            </button>
        </MarkPills>
    );

    if (variant === 'modal') {
        return (
            <div className="event-info-row lesson-grade lesson-grade--modal">
                <span className="info-icon">🎓</span>
                <div className="info-content">
                    <span className="info-label">Посещаемость и оценки:</span>
                    <span className="lesson-grade__row">{body}</span>
                </div>
            </div>
        );
    }
    return <div className="lesson-grade lesson-grade--detail">{body}</div>;
};

export default LessonGrade;
