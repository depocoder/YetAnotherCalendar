// Общее для «Моих оценок» и карточек пар.

export const ATTENDANCE = {
    PRESENT: { label: 'был', className: 'grades-attendance--present' },
    ABSENT: { label: 'не был', className: 'grades-attendance--absent' },
};

// «86.00» → «86», «2.26» остается как есть, «отл.» — тоже.
export const formatGradeValue = (value) => (/^-?\d+\.0+$/.test(value) ? value.replace(/\.0+$/, '') : value);
