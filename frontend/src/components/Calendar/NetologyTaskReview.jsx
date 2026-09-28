import React from 'react';
import { NETOLOGY_CHECK, NETOLOGY_SCORE, netologyProgramLinks, netologyStatusOf } from '../../utils/grades';
import ExternalLink from './ExternalLink';
import '../../style/grades-modal.scss';

/**
 * Кто проверяет домашку Нетологии, что с ней и какая оценка — для ее карточки.
 *
 * Данные приходят вместе с календарем (task_type, review_status, score),
 * отдельных запросов нет. В календаре, закэшированном до этого, типа
 * проверки нет — тогда показываем только статус.
 */
const NetologyTaskReview = ({ event, variant = 'modal' }) => {
    const check = NETOLOGY_CHECK[event.task_type];
    // Старый кэш без review_status: остается только признак «пройдено».
    const reviewStatus = event.review_status !== undefined ? event.review_status : (event.passed ? 'submitted' : null);
    // Дедлайн из названия — это начало дня; сдать можно до его конца.
    const deadline = event.deadline ? new Date(new Date(event.deadline).getTime() + 24 * 60 * 60 * 1000) : null;
    const status = netologyStatusOf({ status: reviewStatus, deadline });
    const score = event.score ? NETOLOGY_SCORE[event.score] || event.score : null;
    const practiceUrl = netologyProgramLinks(event.url).practice;
    const practice = practiceUrl && (
        <ExternalLink href={practiceUrl} className="ext-link--action" title="Все задания программы в Нетологии">
            Практика
        </ExternalLink>
    );
    let note = null;
    if (event.task_type === 'independent') {
        note = 'Оценки не будет: самопроверка засчитывается, как только решение отправлено.';
    } else if (event.task_type === 'common' && !score) {
        note = reviewStatus === 'review'
            ? 'Решение у эксперта — оценка появится после проверки.'
            : 'Эксперт проверит решение и поставит оценку.';
    }

    if (variant === 'detail') {
        return (
            <div className="netology-review netology-review--detail">
                {check && <span className={`grades-check grades-check--${event.task_type}`}>{check.label}</span>}
                <span className={`grades-status ${status.className}`}>{status.label}</span>
                {score && (
                    <span className="grades-chip grades-chip--small">
                        <span className="grades-chip__name">оценка</span>
                        <strong>{score}</strong>
                    </span>
                )}
                {practice}
                {note && <span className="netology-review__note">{note}</span>}
            </div>
        );
    }

    return (
        <>
            {check && (
                <div className="event-info-row">
                    <span className="info-icon">{event.task_type === 'common' ? '🧑‍🏫' : '🔁'}</span>
                    <div className="info-content">
                        <span className="info-label">Проверка:</span>
                        <span className="info-value">{check.label}</span>
                    </div>
                </div>
            )}
            <div className="event-info-row">
                <span className="info-icon">✅</span>
                <div className="info-content">
                    <span className="info-label">Статус:</span>
                    <span className="netology-review__status-row">
                        <span className={`grades-status ${status.className}`}>{status.label}</span>
                        {!score && practice}
                    </span>
                </div>
            </div>
            {score && (
                <div className="event-info-row">
                    <span className="info-icon">🎓</span>
                    <div className="info-content">
                        <span className="info-label">Оценка:</span>
                        <span className="netology-review__status-row">
                            <span className="info-value">{score}</span>
                            {practice}
                        </span>
                    </div>
                </div>
            )}
            {note && <p className="netology-review__note">{note}</p>}
        </>
    );
};

export default NetologyTaskReview;
