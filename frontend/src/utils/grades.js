// Общее для «Моих оценок» и карточек пар.

export const ATTENDANCE = {
    PRESENT: { label: 'был', className: 'grades-attendance--present' },
    ABSENT: { label: 'не был', className: 'grades-attendance--absent' },
};

// «86.00» → «86», «2.26» остается как есть, «отл.» — тоже.
export const formatGradeValue = (value) => (/^-?\d+\.0+$/.test(value) ? value.replace(/\.0+$/, '') : value);

// Домашки Нетологии: статусы проверки (accepted/rework ставит эксперт,
// остальные выводит бэкенд — см. netology.schema.review_status).
export const NETOLOGY_STATUS = {
    accepted: { label: 'принято', className: 'grades-status--accepted' },
    submitted: { label: 'сдано', className: 'grades-status--accepted' },
    passed: { label: 'пройден', className: 'grades-status--accepted' },
    review: { label: 'на проверке', className: 'grades-status--review' },
    rework: { label: 'на доработке', className: 'grades-status--rework' },
};

export const NETOLOGY_SCORE = {
    excellent: 'отлично',
    good: 'хорошо',
    satisfactory: 'удовлетворительно',
};

// Кто проверяет: эксперт ставит статус и оценку, самопроверка засчитывается по сдаче.
export const NETOLOGY_CHECK = {
    common: { label: 'проверяет эксперт', hint: 'Эксперт примет задание или вернет на доработку и поставит оценку' },
    independent: { label: 'самопроверка', hint: 'Засчитывается, как только вы отправили решение — оценки не будет' },
};

// Статус задания, у которого еще ничего не отправлено, зависит от срока.
export const netologyStatusOf = ({ status, deadline }) => {
    if (status) return NETOLOGY_STATUS[status] || { label: status, className: '' };
    const overdue = !deadline || new Date(deadline) < new Date();
    return overdue
        ? { label: 'не сдано', className: 'grades-status--missed' }
        : { label: 'впереди', className: '' };
};
