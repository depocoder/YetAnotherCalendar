import React, { useCallback, useEffect, useState } from 'react';
import { fetchGrades } from '../../services/modeusGrades';
import { ATTENDANCE, formatGradeValue as formatValue } from '../../utils/grades';
import InlineLoader from '../../elements/InlineLoader';
import NetologyGrades from './NetologyGrades';
import { debug } from '../../utils/debug';
import '../../style/subscription-modal.scss';
import '../../style/grades-modal.scss';

const formatPercent = (rate) => `${Math.round((rate || 0) * 100)}%`;

// Ни одной отметки «был/не был» — показывать 0% было бы неправдой.
const isMarked = (rate) => Boolean(rate) && (rate.present || 0) + (rate.absent || 0) > 0;

// starts_at — время по часам самого занятия (как в Модеусе), без пояса: не пересчитываем.
const formatLessonDate = (value) => {
    if (!value) return '';
    const [date, time = ''] = value.split('T');
    const [, month, day] = date.split('-');
    return `${day}.${month}${time ? ` ${time.slice(0, 5)}` : ''}`;
};

const formatPeriodDate = (value) => {
    const [year, month] = value.split('-');
    return `${month}.${year}`;
};

const periodLabel = (period) => (
    period.number
        ? `${period.number}-й семестр (${formatPeriodDate(period.start_date)} – ${formatPeriodDate(period.end_date)})`
        : period.name
);

const RatingTile = ({ title, rating }) => (
    <div className="grades-tile">
        <span className="grades-tile__title">{title}</span>
        <span className="grades-tile__value">
            {rating?.score != null ? rating.score.toFixed(2) : '—'}
        </span>
        {rating?.position != null && rating?.total != null && (
            <span className="grades-tile__hint">{rating.position} место из {rating.total} на потоке</span>
        )}
    </div>
);

const AttendanceBar = ({ rate }) => (
    <div
        className="grades-attendance-bar"
        title={`Был: ${formatPercent(rate.present)}, не был: ${formatPercent(rate.absent)}, не отмечено: ${formatPercent(rate.undefined)}`}
    >
        <span className="grades-attendance-bar__present" style={{ width: formatPercent(rate.present) }} />
        <span className="grades-attendance-bar__absent" style={{ width: formatPercent(rate.absent) }} />
    </div>
);

const CourseCard = ({ course }) => {
    const [open, setOpen] = useState(false);
    const showAcademicCourse = course.academic_course && course.academic_course !== course.name;

    return (
        <div className="grades-course">
            <div className="grades-course__head">
                <div className="grades-course__titles">
                    <span className="grades-course__name">{course.name}</span>
                    {showAcademicCourse && <span className="grades-course__parent">{course.academic_course}</span>}
                </div>
                <div className="grades-course__results">
                    {course.results.length === 0 && <span className="grades-chip grades-chip--empty">нет оценок</span>}
                    {course.results.map((result) => (
                        <span className="grades-chip" key={`${result.code}-${result.name}`} title={result.name}>
                            <span className="grades-chip__name">{result.name}</span>
                            <strong>{formatValue(result.value)}</strong>
                        </span>
                    ))}
                </div>
            </div>
            {isMarked(course.attendance) && (
                <div className="grades-course__attendance">
                    <AttendanceBar rate={course.attendance} />
                    <span>посещаемость {formatPercent(course.attendance.present)}</span>
                </div>
            )}
            {course.lessons.length > 0 && (
                <>
                    <button className="grades-course__toggle" onClick={() => setOpen((prev) => !prev)}>
                        {open ? '▾' : '▸'} Занятия с оценками и отметками ({course.lessons.length})
                    </button>
                    {open && (
                        <ul className="grades-lessons">
                            {course.lessons.map((lesson) => {
                                const attendance = ATTENDANCE[lesson.attendance];
                                return (
                                    <li className="grades-lesson" key={lesson.id}>
                                        <span className="grades-lesson__date">{formatLessonDate(lesson.starts_at)}</span>
                                        <span className="grades-lesson__name">
                                            {lesson.name}
                                            {lesson.type_name && <span className="grades-lesson__type">{lesson.type_name}</span>}
                                        </span>
                                        <span className="grades-lesson__marks">
                                            {lesson.attendance && (
                                                <span className={`grades-attendance ${attendance?.className || ''}`}>
                                                    {attendance?.label || lesson.attendance.toLowerCase()}
                                                </span>
                                            )}
                                            {lesson.results.map((result, index) => (
                                                <span className="grades-chip grades-chip--small" key={index} title={result.name}>
                                                    <span className="grades-chip__name">{result.name}</span>
                                                    <strong>{formatValue(result.value)}</strong>
                                                </span>
                                            ))}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
};

/**
 * Оценки из Модеуса: итоги по дисциплинам, баллы за занятия, рейтинг и посещаемость.
 *
 * Модеус показывает их только самому студенту, поэтому сервер читает их
 * токеном студента, а его получает по паролю из «Запомнить меня».
 */
const GradesModal = ({ isOpen, onClose }) => {
    const [state, setState] = useState({ status: 'loading', data: null });
    const [periodId, setPeriodId] = useState(null);
    const [tab, setTab] = useState('modeus');
    // Вкладку Нетологии монтируем при первом открытии и дальше не размонтируем:
    // ее запрос медленный, при переключении вкладок повторять его незачем.
    const [netologyVisited, setNetologyVisited] = useState(false);

    const load = useCallback(async (requestedPeriodId) => {
        setState((prev) => ({ status: 'loading', data: prev.data }));
        // Модалка всегда читает свежее — заодно обновляя кэш карточек пар.
        const response = await fetchGrades(requestedPeriodId, { force: true });
        if (response?.status === 200) {
            setState({ status: 'ok', data: response.data });
            setPeriodId(response.data.period_id);
        } else if (response?.status === 401) {
            setState({ status: 'no-vault', data: null });
        } else if (response?.status === 403) {
            setState({ status: 'rejected', data: null });
        } else {
            debug.error('Не удалось загрузить оценки:', response?.status);
            setState({ status: 'error', data: null });
        }
    }, []);

    useEffect(() => {
        if (isOpen) load(periodId);
        // periodId меняется только через select, который сам вызывает load
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, load]);

    if (!isOpen) return null;

    const { status, data } = state;

    const renderBody = () => {
        if (status === 'loading' && !data) {
            return <div className="grades-loading"><InlineLoader /> Загружаем оценки из Модеуса…</div>;
        }
        if (status === 'no-vault') {
            return (
                <div className="subscription-policy">
                    <span className="subscription-policy-icon">🔐</span>
                    <p>
                        Оценки в Модеусе видит только сам студент, поэтому для них нужен ваш вход.
                        Выйдите и войдите снова, отметив <strong>«Запомнить меня»</strong>: пароль хранится
                        только в зашифрованном виде, а ключ к нему — в cookie вашего браузера.
                    </p>
                </div>
            );
        }
        if (status === 'rejected') {
            return (
                <div className="subscription-policy">
                    <span className="subscription-policy-icon">⚠️</span>
                    <p>
                        Модеус не принял сохраненный пароль. Если вы его меняли — выйдите и войдите
                        снова с <strong>«Запомнить меня»</strong>.
                    </p>
                </div>
            );
        }
        if (status === 'error') {
            return (
                <div className="grades-error">
                    <p>Модеус сейчас не отвечает. Попробуйте чуть позже.</p>
                    <button className="subscription-create-btn" onClick={() => load(periodId)}>Повторить</button>
                </div>
            );
        }
        return (
            <>
                {data.periods.length > 0 && (
                    <div className="grades-period">
                        <select
                            value={periodId || ''}
                            onChange={(event) => {
                                setPeriodId(event.target.value);
                                load(event.target.value);
                            }}
                            disabled={status === 'loading'}
                        >
                            {data.periods.map((period) => (
                                <option key={period.id} value={period.id}>{periodLabel(period)}</option>
                            ))}
                        </select>
                        {status === 'loading' && <InlineLoader />}
                    </div>
                )}
                <div className="grades-tiles">
                    <RatingTile title="Средний балл за семестр" rating={data.gpa} />
                    <RatingTile title="Средний балл за все время" rating={data.cgpa} />
                    <div className="grades-tile">
                        <span className="grades-tile__title">Посещаемость за семестр</span>
                        <span className="grades-tile__value">
                            {isMarked(data.attendance) ? formatPercent(data.attendance.present) : '—'}
                        </span>
                        {isMarked(data.attendance) && <AttendanceBar rate={data.attendance} />}
                    </div>
                </div>
                {data.courses.length === 0 ? (
                    <p className="grades-empty">В этом семестре оценок пока нет.</p>
                ) : (
                    data.courses.map((course) => <CourseCard course={course} key={course.id} />)
                )}
            </>
        );
    };

    return (
        <div className="subscription-overlay" onClick={onClose}>
            <div className="subscription-modal grades-modal" onClick={(event) => event.stopPropagation()}>
                <div className="subscription-header">
                    <div>
                        <h2>🎓 Мои оценки</h2>
                        <p className="subscription-subtitle">Из Модеуса и Нетологии — видны только вам</p>
                    </div>
                    <button className="subscription-close" onClick={onClose} title="Закрыть">×</button>
                </div>
                <div className="subscription-body">
                    <div className="grades-tabs" role="tablist">
                        <button
                            role="tab" aria-selected={tab === 'modeus'}
                            className={`grades-tabs__tab ${tab === 'modeus' ? 'grades-tabs__tab--active' : ''}`}
                            onClick={() => setTab('modeus')}
                        >
                            Модеус
                        </button>
                        <button
                            role="tab" aria-selected={tab === 'netology'}
                            className={`grades-tabs__tab ${tab === 'netology' ? 'grades-tabs__tab--active' : ''}`}
                            onClick={() => {
                                setTab('netology');
                                setNetologyVisited(true);
                            }}
                        >
                            Нетология
                        </button>
                    </div>
                    {tab === 'modeus' && renderBody()}
                    {netologyVisited && (
                        <div style={{ display: tab === 'netology' ? 'block' : 'none' }}>
                            <NetologyGrades />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GradesModal;
