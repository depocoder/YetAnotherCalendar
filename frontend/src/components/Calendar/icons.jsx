import React from 'react';

// Значки отметок (плитки пар, карточки пар и заданий LMS): рисуем сами, чтобы
// они были одинаковыми во всех системах и красились через currentColor.

export const CheckIcon = () => (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M2.6 6.4l2.2 2.2 4.6-4.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const CrossIcon = () => (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M3.4 3.4l5.2 5.2M8.6 3.4L3.4 8.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
);

export const StarIcon = () => (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M6 1.2l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 9l-3 1.6.6-3.4L1.1 4.8l3.4-.5z" fill="currentColor" />
    </svg>
);

// Пустой кружок — условие, которое еще впереди.
export const PendingIcon = () => (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <circle cx="6" cy="6" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
);
