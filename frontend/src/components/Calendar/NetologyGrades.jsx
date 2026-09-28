import React, { useCallback, useEffect, useState } from 'react';
import { getNetologyGrades } from '../../services/api';
import InlineLoader from '../../elements/InlineLoader';
import { debug } from '../../utils/debug';
import { NETOLOGY_CHECK, NETOLOGY_SCORE as SCORE, netologyStatusOf as statusOf } from '../../utils/grades';

// Нетология оценивает домашние задания статусом и словом, баллов у нее нет.
const DONE = ['accepted', 'submitted', 'passed'];

const isOverdue = (task) => !task.status && (!task.deadline || new Date(task.deadline) < new Date());

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('ru-RU') : null);

const ProgramCard = ({ program, initiallyOpen }) => {
    const [open, setOpen] = useState(initiallyOpen);
    const missed = program.tasks.filter(isOverdue).length;
    const rework = program.tasks.filter((task) => task.status === 'rework').length;

    return (
        <div className="grades-course">
            <div className="grades-course__head">
                <span className="grades-course__name">{program.title}</span>
                <div className="grades-course__results">
                    <span className="grades-chip">
                        <span className="grades-chip__name">выполнено</span>
                        <strong>{program.done} из {program.tasks.length}</strong>
                    </span>
                    {rework > 0 && <span className="grades-status grades-status--rework">на доработке: {rework}</span>}
                    {missed > 0 && <span className="grades-status grades-status--missed">не сдано: {missed}</span>}
                </div>
            </div>
            <button className="grades-course__toggle" onClick={() => setOpen((prev) => !prev)}>
                {open ? '▾' : '▸'} Задания и тесты ({program.tasks.length})
            </button>
            {open && (
                <>
                    {!program.complete && (
                        <p className="grades-course__note">
                            Список заданий программы не загрузился — показаны только задания с проверкой экспертом.
                        </p>
                    )}
                    <ul className="grades-lessons">
                        {program.tasks.map((task) => {
                            const taskStatus = statusOf(task);
                            return (
                                <li className="grades-lesson" key={task.id}>
                                    <span className="grades-lesson__date">
                                        {formatDate(task.deadline) ? `до ${formatDate(task.deadline)}` : ''}
                                    </span>
                                    <span className="grades-lesson__name">
                                        {task.url ? (
                                            <a href={task.url} target="_blank" rel="noopener noreferrer">{task.title}</a>
                                        ) : task.title}
                                        {task.type === 'test' && <span className="grades-lesson__type">тест</span>}
                                        {NETOLOGY_CHECK[task.task_type] && (
                                            <span
                                                className={`grades-check grades-check--${task.task_type}`}
                                                title={NETOLOGY_CHECK[task.task_type].hint}
                                            >
                                                {NETOLOGY_CHECK[task.task_type].label}
                                            </span>
                                        )}
                                    </span>
                                    <span className="grades-lesson__marks">
                                        <span className={`grades-status ${taskStatus.className}`}>{taskStatus.label}</span>
                                        {task.score && (
                                            <span className="grades-chip grades-chip--small">
                                                <span className="grades-chip__name">оценка</span>
                                                <strong>{SCORE[task.score] || task.score}</strong>
                                            </span>
                                        )}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </div>
    );
};

/**
 * Вкладка «Нетология» в «Моих оценках»: все домашние задания и тесты по
 * программам со статусами и ссылками, плюс последний отзыв эксперта.
 * Работает на обычной сессии Нетологии — «Запомнить меня» не нужно.
 */
const NetologyGrades = () => {
    const [state, setState] = useState({ status: 'loading', data: null });

    const load = useCallback(async () => {
        setState({ status: 'loading', data: null });
        const response = await getNetologyGrades();
        if (response?.status === 200) {
            setState({ status: 'ok', data: response.data });
        } else if (response?.status === 401 || response?.status === 422) {
            setState({ status: 'expired', data: null });
        } else {
            debug.error('Не удалось загрузить оценки Нетологии:', response?.status);
            setState({ status: 'error', data: null });
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const { status, data } = state;

    if (status === 'loading') {
        return <div className="grades-loading"><InlineLoader /> Загружаем задания из Нетологии…</div>;
    }
    if (status === 'expired') {
        return (
            <div className="subscription-policy">
                <span className="subscription-policy-icon">⚠️</span>
                <p>Сессия Нетологии истекла. Обновите календарь или войдите заново.</p>
            </div>
        );
    }
    if (status === 'error') {
        return (
            <div className="grades-error">
                <p>Нетология сейчас не отвечает. Попробуйте чуть позже.</p>
                <button className="subscription-create-btn" onClick={load}>Повторить</button>
            </div>
        );
    }

    const tasks = data.programs.flatMap((program) => program.tasks);
    const done = tasks.filter((task) => DONE.includes(task.status)).length;
    const pending = tasks.filter((task) => task.status === 'rework' || task.status === 'review').length;
    const missed = tasks.filter(isOverdue).length;
    const currentSemester = Math.max(0, ...data.programs.map((program) => program.semester || 0));
    const feedback = data.feedback;
    const feedbackStatus = feedback?.homework_status ? statusOf({ status: feedback.homework_status }) : null;

    return (
        <>
            <div className="grades-tiles">
                <div className="grades-tile">
                    <span className="grades-tile__title">Выполнено</span>
                    <span className="grades-tile__value">{done} из {tasks.length}</span>
                </div>
                <div className="grades-tile">
                    <span className="grades-tile__title">На проверке и доработке</span>
                    <span className="grades-tile__value">{pending}</span>
                </div>
                <div className="grades-tile">
                    <span className="grades-tile__title">Не сдано в срок</span>
                    <span className="grades-tile__value">{missed}</span>
                </div>
            </div>

            {feedback && (
                <div className="grades-feedback">
                    <div className="grades-feedback__head">
                        <span className="grades-feedback__title">
                            Последний отзыв эксперта
                            {feedback.is_new && <span className="grades-feedback__new">новый</span>}
                        </span>
                        {feedbackStatus && (
                            <span className={`grades-status ${feedbackStatus.className}`}>{feedbackStatus.label}</span>
                        )}
                    </div>
                    {feedback.title && <span className="grades-course__parent">{feedback.title}</span>}
                    {feedback.content && <p className="grades-feedback__content">{feedback.content}</p>}
                    <div className="grades-feedback__footer">
                        {formatDate(feedback.date_time) && <span>{formatDate(feedback.date_time)}</span>}
                        {feedback.homework_url && (
                            <a href={feedback.homework_url} target="_blank" rel="noopener noreferrer">
                                Открыть задание →
                            </a>
                        )}
                    </div>
                </div>
            )}

            {data.programs.length === 0 ? (
                <p className="grades-empty">Домашних заданий пока нет.</p>
            ) : (
                data.programs.map((program) => (
                    <ProgramCard
                        program={program}
                        key={program.title}
                        initiallyOpen={Boolean(program.semester) && program.semester === currentSemester}
                    />
                ))
            )}
        </>
    );
};

export default NetologyGrades;
