import React, { useEffect, useState } from 'react';
import { getLessonGrades, subscribeModeusGrades } from '../../services/modeusGrades';
import { formatGradeValue } from '../../utils/grades';
import { CheckIcon, CrossIcon, StarIcon } from './icons';
import '../../style/lesson-marks.scss';

const ATTENDANCE_MARK = {
    PRESENT: { Icon: CheckIcon, label: 'Был', text: 'Был на паре', modifier: 'present' },
    ABSENT: { Icon: CrossIcon, label: 'Не был', text: 'Не был на паре', modifier: 'absent' },
};

// Только то, что Модеус знает наверняка: неотмеченное посещение — не отметка.
export const hasMarks = (lesson) => Boolean(ATTENDANCE_MARK[lesson?.attendance]) || lesson?.results?.length > 0;

// Текст для подсказки и aria-label: «Был на паре · Работа на учебной встрече: 1».
export const describeMarks = (lesson) => [
    ATTENDANCE_MARK[lesson?.attendance]?.text,
    ...(lesson?.results || []).map((result) => `${result.name}: ${formatGradeValue(result.value)}`),
].filter(Boolean).join(' · ');

/**
 * Пилюли отметок: кружок посещения (галочка/крестик) и звездочка с баллами.
 * withNames — по пилюле на каждую оценку с ее названием (карточка пары);
 * без него баллы идут через точку в одной пилюле (плитка в сетке).
 * children встают в ту же строку после пилюль (кнопка «перечитать» в карточке).
 */
export const MarkPills = ({ lesson, withNames = false, className = '', children = null, ...props }) => {
    const attendance = ATTENDANCE_MARK[lesson?.attendance];
    const results = lesson?.results || [];
    if (!attendance && results.length === 0) return null;

    return (
        <span className={`lesson-marks ${className}`} {...props}>
            {attendance && (
                <span className={`lesson-marks__attendance lesson-marks__attendance--${attendance.modifier}`}>
                    <attendance.Icon />
                    <span className="lesson-marks__label">{attendance.label}</span>
                </span>
            )}
            {withNames ? results.map((result, index) => (
                <span className="lesson-marks__grade" key={index} title={result.name}>
                    <StarIcon />
                    <span className="lesson-marks__name">{result.name}</span>
                    {formatGradeValue(result.value)}
                </span>
            )) : results.length > 0 && (
                <span className="lesson-marks__grade">
                    <StarIcon />
                    {results.map((result) => formatGradeValue(result.value)).join(' · ')}
                </span>
            )}
            {children}
        </span>
    );
};

/**
 * Отметки прошедшей пары Модеуса прямо на ее плитке. Данные — из общего кэша
 * оценок (только с «Запомнить меня»), без них плитка остается как была.
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

    if (!isPast || !hasMarks(lesson)) return null;
    const description = describeMarks(lesson);

    return <MarkPills lesson={lesson} className={className} role="img" aria-label={description} title={description} />;
};

export default LessonMarks;
