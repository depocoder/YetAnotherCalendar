import React, { useEffect, useState } from 'react';
import { getLessonGrades, subscribeModeusGrades } from '../../services/modeusGrades';
import { formatGradeValue } from '../../utils/grades';
import '../../style/lesson-marks.scss';

// Значки рисуем сами: эмодзи на плитках выглядят чужеродно и по-разному в системах.
const CheckIcon = () => (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M2.6 6.4l2.2 2.2 4.6-4.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CrossIcon = () => (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M3.4 3.4l5.2 5.2M8.6 3.4L3.4 8.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
);

const StarIcon = () => (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M6 1.2l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 9l-3 1.6.6-3.4L1.1 4.8l3.4-.5z" fill="currentColor" />
    </svg>
);

const ATTENDANCE_MARK = {
    PRESENT: { Icon: CheckIcon, label: 'Был', text: 'Был на паре', modifier: 'present' },
    ABSENT: { Icon: CrossIcon, label: 'Не был', text: 'Не был на паре', modifier: 'absent' },
};

/**
 * Отметки прошедшей пары Модеуса прямо на ее плитке: посещение (галочка/крестик)
 * и оценки за пару (звездочка с баллами). Только то, что Модеус знает наверняка:
 * без отметки о посещении значка нет, без оценки нет и баллов. Данные — из общего
 * кэша оценок (только с «Запомнить меня»), без них плитка остается как была.
 * Полный текст — в подсказке и aria-label; на мобильной плитке подписи видны сразу.
 */
const LessonMarks = ({ event, className = '' }) => {
    const [lesson, setLesson] = useState(null);
    const isPast = event?.type === 'modeus' && Boolean(event.start) && new Date(event.end || event.start) < new Date();

    useEffect(() => {
        if (!isPast) return undefined;
        let active = true;
        const lookUp = () => {
            getLessonGrades(event)
                .then((result) => { if (active) setLesson(result.status === 'ok' ? result.lesson : null); })
                .catch(() => { if (active) setLesson(null); });
        };
        lookUp();
        const unsubscribe = subscribeModeusGrades(lookUp);
        return () => {
            active = false;
            unsubscribe();
        };
        // Пару определяют id и дата: объект события пересоздается при каждой отрисовке недели.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPast, event?.id, event?.start]);

    if (!isPast || !lesson) return null;
    const attendance = ATTENDANCE_MARK[lesson.attendance];
    const grades = lesson.results || [];
    if (!attendance && grades.length === 0) return null;

    const description = [
        attendance?.text,
        ...grades.map((result) => `${result.name}: ${formatGradeValue(result.value)}`),
    ].filter(Boolean).join(' · ');

    return (
        <span className={`lesson-marks ${className}`} role="img" aria-label={description} title={description}>
            {attendance && (
                <span className={`lesson-marks__attendance lesson-marks__attendance--${attendance.modifier}`}>
                    <attendance.Icon />
                    <span className="lesson-marks__label">{attendance.label}</span>
                </span>
            )}
            {grades.length > 0 && (
                <span className="lesson-marks__grade">
                    <StarIcon />
                    {grades.map((result) => formatGradeValue(result.value)).join(' · ')}
                </span>
            )}
        </span>
    );
};

export default LessonMarks;
