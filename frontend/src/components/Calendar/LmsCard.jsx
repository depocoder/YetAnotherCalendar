import React, { useEffect, useState } from 'react';
import { formatDate } from '../../utils/dateUtils';
import { getLmsStatus, lmsRequirementState, LMS_MODULE_TYPES, formatLmsPoints } from '../../utils/lmsStatus';
import { getModuleGrade } from '../../services/lmsGrades';
import { CheckIcon, CrossIcon, StarIcon, PendingIcon } from './icons';
import '../../style/lms-card.scss';

const STATE_ICON = { done: CheckIcon, fail: CrossIcon, pending: PendingIcon };

// Пилюля состояния: выполнено (зеленая), провалено (красная), впереди (серая).
const StatePill = ({ state, children, className = '' }) => {
    const Icon = STATE_ICON[state];
    return (
        <span className={`lms-pill lms-pill--${state} ${className}`}>
            <Icon />
            {children}
        </span>
    );
};

// Баллы из журнала: оценка — главный акцент карточки, до проверки — только максимум.
const PointsPill = ({ grade }) => {
    if (grade.grade != null) {
        return (
            <span className="lms-pill lms-pill--points" title={grade.graded_at ? `Оценено ${formatDate(grade.graded_at)}` : undefined}>
                <StarIcon />
                {grade.text || formatLmsPoints(grade.grade)}
            </span>
        );
    }
    if (grade.grade_max) {
        return (
            <span className="lms-pill lms-pill--pending" title="Баллы появятся, когда работу проверят">
                <PendingIcon />
                не оценено · макс. {formatLmsPoints(grade.grade_max)}
            </span>
        );
    }
    return null;
};

/**
 * Карточка элемента курса LMS (Moodle): курс и тип, статус выполнения, баллы
 * из журнала и условия выполнения — строками «подпись: значение» и пилюлями,
 * как в карточке пары Модеуса. Баллы подгружаются при открытии карточки
 * (по course_id; старый кэш календаря без него — просто без баллов).
 * variant: 'detail' — панель под расписанием, 'modal' — карточка-модалка.
 */
const LmsCard = ({ event, variant = 'detail' }) => {
    const [grade, setGrade] = useState(null);
    const status = getLmsStatus(event);
    const requirements = event?.completion_requirements || [];
    const moduleType = LMS_MODULE_TYPES[event?.modname] || event?.modname;

    useEffect(() => {
        setGrade(null);
        if (!event?.course_id) return undefined;
        let active = true;
        getModuleGrade(event)
            .then((result) => { if (active) setGrade(result.status === 'ok' ? result.grade : null); })
            .catch(() => { if (active) setGrade(null); });
        return () => { active = false; };
        // Задание определяют его id и курс: объект события пересоздается при отрисовке.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event?.id, event?.course_id]);

    const statusPill = status && (
        <StatePill state={status.done ? 'done' : 'fail'}>{status.label}</StatePill>
    );
    const completedAt = status?.done && event.completed_at ? formatDate(event.completed_at) : null;
    const conditionPills = requirements.map((requirement) => (
        <StatePill key={requirement.description} state={lmsRequirementState(requirement.status)}>
            {requirement.description}
        </StatePill>
    ));

    if (variant === 'modal') {
        return (
            <>
                {event.course_name && (
                    <div className="event-info-row">
                        <span className="info-icon">📚</span>
                        <div className="info-content">
                            <span className="info-label">Курс:</span>
                            <span className="info-value">{event.course_name}</span>
                        </div>
                    </div>
                )}
                {moduleType && (
                    <div className="event-info-row">
                        <span className="info-icon">📖</span>
                        <div className="info-content">
                            <span className="info-label">Тип:</span>
                            <span className="info-value">{moduleType}</span>
                        </div>
                    </div>
                )}
                {(status || grade) && (
                    <div className="event-info-row lms-card--modal">
                        <span className="info-icon">🎯</span>
                        <div className="info-content">
                            <span className="info-label">Статус и баллы:</span>
                            <span className="lms-card__pills">
                                {statusPill}
                                {grade && <PointsPill grade={grade} />}
                            </span>
                            {completedAt && <span className="lms-card__note">засчитано {completedAt}</span>}
                        </div>
                    </div>
                )}
                {requirements.length > 0 && (
                    <div className="event-info-row lms-card--modal">
                        <span className="info-icon">📋</span>
                        <div className="info-content">
                            <span className="info-label">Условия выполнения:</span>
                            <span className="lms-card__pills">{conditionPills}</span>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className="lms-card">
            {(event.course_name || moduleType) && (
                <div className="lms-card__row">
                    {event.course_name && (
                        <span className="lms-card__text">
                            <span className="lms-card__label">Курс:</span> {event.course_name}
                        </span>
                    )}
                    {moduleType && <span className="lms-card__type">{moduleType}</span>}
                </div>
            )}
            {(status || grade) && (
                <div className="lms-card__row">
                    {statusPill}
                    {grade && <PointsPill grade={grade} />}
                    {completedAt && <span className="lms-card__note">засчитано {completedAt}</span>}
                </div>
            )}
            {requirements.length > 0 && (
                <div className="lms-card__row">
                    <span className="lms-card__label">Условия:</span>
                    {conditionPills}
                </div>
            )}
        </div>
    );
};

export default LmsCard;
