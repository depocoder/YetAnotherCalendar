import React, { useEffect, useState } from 'react';
import '../../style/course-selector.scss';

/**
 * Модальное окно выбора курсов Нетологии.
 * Позволяет выбрать, какие календари подгружать, очистить выбор или заменить его.
 */
const CourseSelectorModal = ({ isOpen, onClose, courses, selectedIds, onSave }) => {
    const [checkedIds, setCheckedIds] = useState(selectedIds || []);

    // Синхронизируем локальный выбор при каждом открытии
    useEffect(() => {
        if (isOpen) {
            setCheckedIds(selectedIds || []);
        }
    }, [isOpen, selectedIds]);

    if (!isOpen) return null;

    const toggleCourse = (id) => {
        setCheckedIds(prev =>
            prev.includes(id) ? prev.filter(checkedId => checkedId !== id) : [...prev, id]
        );
    };

    const selectAll = () => setCheckedIds(courses.map(course => course.id));
    const clearAll = () => setCheckedIds([]);

    const handleSave = () => {
        onSave(checkedIds);
        onClose();
    };

    const nothingSelected = checkedIds.length === 0;

    return (
        <div className="course-selector-overlay" onClick={onClose}>
            <div className="course-selector-modal" onClick={(e) => e.stopPropagation()}>
                <div className="course-selector-header">
                    <div>
                        <h2>📚 Мои курсы</h2>
                        <p className="course-selector-subtitle">
                            Выберите, какие календари Нетологии подгружать в расписание
                        </p>
                    </div>
                    <button className="course-selector-close" onClick={onClose} title="Закрыть">×</button>
                </div>

                <div className="course-selector-body">
                    {courses.length === 0 ? (
                        <p className="course-selector-empty">
                            Не удалось загрузить список курсов. Попробуйте обновить страницу.
                        </p>
                    ) : (
                        <ul className="course-list">
                            {courses.map(course => {
                                const isChecked = checkedIds.includes(course.id);
                                return (
                                    <li key={course.id}>
                                        <label className={`course-card ${isChecked ? 'course-card--selected' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleCourse(course.id)}
                                            />
                                            <span className="course-card__check" aria-hidden="true">
                                                {isChecked ? '✓' : ''}
                                            </span>
                                            <span className="course-card__info">
                                                <span className="course-card__title">{course.title?.trim()}</span>
                                                <span className="course-card__meta">
                                                    {course.urlcode || course.url_code}
                                                    {course.type === 'free' && (
                                                        <span className="course-card__badge">Бесплатный</span>
                                                    )}
                                                </span>
                                            </span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="course-selector-footer">
                    <div className="course-selector-bulk-actions">
                        <button className="course-selector-link-btn" onClick={selectAll}>
                            Выбрать все
                        </button>
                        <button className="course-selector-link-btn" onClick={clearAll}>
                            Очистить
                        </button>
                    </div>
                    <div className="course-selector-actions">
                        <span className="course-selector-count">
                            {nothingSelected
                                ? 'Выберите хотя бы один курс'
                                : `Выбрано: ${checkedIds.length} из ${courses.length}`}
                        </span>
                        <button
                            className="course-selector-save-btn"
                            onClick={handleSave}
                            disabled={nothingSelected}
                        >
                            Сохранить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseSelectorModal;
