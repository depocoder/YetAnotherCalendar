import React, { useCallback, useEffect, useState } from 'react';
import { getNetologyGrades } from '../../services/api';
import InlineLoader from '../../elements/InlineLoader';
import { debug } from '../../utils/debug';
import ExternalLink from './ExternalLink';
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
                <span className="grades-course__name">
                    <ExternalLink href={program.url} title="Курс в Нетологии">{program.title}</ExternalLink>
                </span>
                <div className="grades-course__results">
                    <span className="grades-chip">
                        <span className="grades-chip__name">выполнено</span>
                        <strong>{program.done} из {program.tasks.length}</strong>
                    </span>
                    {rework > 0 && <span className="grades-status grades-status--rework">на доработке: {rework}</span>}
                    <ExternalLink href={program.practice_url} className="ext-link--action" title="Все задания программы в Нетологии">
                        Практика
                    </ExternalLink>
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
// Семестр программы берется из ее названия («5 семестр: …»); без номера — «Другие курсы».
const ALL = 'all';
const OTHER = 'other';
const semesterKeyOf = (program) => (program.semester ? String(program.semester) : OTHER);

const NetologyGrades = () => {
    const [state, setState] = useState({ status: 'loading', data: null });
    // null — еще не выбран: тогда последний семестр, как во вкладке Модеуса.
    const [semester, setSemester] = useState(null);

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

    const currentSemester = Math.max(0, ...data.programs.map((program) => program.semester || 0));
    const semesters = [...new Set(data.programs.map((program) => program.semester).filter(Boolean))]
        .sort((a, b) => b - a);
    const hasOther = data.programs.some((program) => !program.semester);
    const selected = semester || (currentSemester ? String(currentSemester) : ALL);
    const programs = selected === ALL
        ? data.programs
        : data.programs.filter((program) => semesterKeyOf(program) === selected);

    // Итоги — по выбранному семестру.
    const tasks = programs.flatMap((program) => program.tasks);
    const done = tasks.filter((task) => DONE.includes(task.status)).length;
    const pending = tasks.filter((task) => task.status === 'rework' || task.status === 'review').length;
    const missed = tasks.filter(isOverdue).length;
    // Отзыв — последний вообще, а не за семестр: показываем его в семестре его
    // программы и во «Всех семестрах»; программа не нашлась — только во «Всех».
    const feedbackKey = data.feedback?.semester
        ? String(data.feedback.semester)
        : (data.feedback?.program_title ? OTHER : null);
    const feedback = selected === ALL || feedbackKey === selected ? data.feedback : null;
    const feedbackStatus = feedback?.homework_status ? statusOf({ status: feedback.homework_status }) : null;

    return (
        <>
            {data.programs.length > 0 && (
                <div className="grades-period">
                    <select value={selected} onChange={(event) => setSemester(event.target.value)} aria-label="Семестр">
                        {semesters.map((number) => (
                            <option key={number} value={String(number)}>{number}-й семестр</option>
                        ))}
                        {hasOther && <option value={OTHER}>Другие курсы</option>}
                        <option value={ALL}>Все семестры</option>
                    </select>
                </div>
            )}
            <div className="grades-tiles grades-tiles--netology">
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
                    {feedback.program_title && <span className="grades-course__parent">{feedback.program_title}</span>}
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

            {programs.length === 0 ? (
                <p className="grades-empty">Домашних заданий пока нет.</p>
            ) : (
                programs.map((program) => (
                    <ProgramCard
                        program={program}
                        // Ключ с выбором: при смене семестра карточки пересоздаются и снова
                        // раскрыты по правилу ниже, а не как их оставили в прошлом семестре.
                        key={`${selected}:${program.title}`}
                        // Выбран конкретный семестр — его программ немного, раскрываем все;
                        // во «Всех семестрах» — только текущий (нет нумерованных — все).
                        initiallyOpen={selected !== ALL || !currentSemester || program.semester === currentSemester}
                    />
                ))
            )}
        </>
    );
};

export default NetologyGrades;
