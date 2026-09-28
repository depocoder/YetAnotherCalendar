import React from 'react';
import '../../style/grades-btn.scss';

// Академическая шапочка — тот же стиль, что у значков отметок на плитках пар.
const CapIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M2.5 9.5L12 5l9.5 4.5L12 14z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M6.5 11.8V16c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.2M21.5 9.5V15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

/**
 * «Мои оценки» в шапке календаря: оценки и посещаемость из Модеуса и домашки
 * Нетологии — самое востребованное, поэтому не в меню «Ещё», а на виду.
 * Работает для всех: что нужно «Запомнить меня» для Модеуса, объяснит само окно.
 */
const GradesBtn = ({ onClick, className = '' }) => (
    <button
        type="button"
        className={`grades-btn ${className}`}
        onClick={onClick}
        title="Оценки и посещаемость из Модеуса, домашние задания Нетологии"
        aria-label="Мои оценки"
    >
        <CapIcon />
        <span>Мои оценки</span>
    </button>
);

export default GradesBtn;
