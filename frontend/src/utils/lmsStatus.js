// Статус выполнения элемента курса LMS (Moodle), как его отдает бэкенд.
// Это "выполнены условия преподавателя", а не "сдано и оценено": задание,
// где условие - только отправить работу, будет выполнено до проверки.
// completion_status === null - преподаватель не включил отслеживание,
// показывать нечего.
const LMS_STATUSES = {
    complete: { label: 'Выполнено', className: 'completed', done: true },
    complete_pass: { label: 'Выполнено (проходной балл)', className: 'completed', done: true },
    complete_fail: { label: 'Не набран проходной балл', className: 'not-passed', done: false },
    incomplete: { label: 'Не выполнено', className: 'in-progress', done: false },
};

// При ручной отметке статус - это галочка студента, а не проверка Moodle.
const LMS_MANUAL_STATUSES = {
    done: { label: 'Отмечено вами', className: 'completed', done: true },
    notDone: { label: 'Не отмечено', className: 'in-progress', done: false },
};

export const getLmsStatus = (event) => {
    if (!event) {
        return null;
    }
    // Старый кэш календаря приходит без completion_status - берем is_completed.
    const status = event.completion_status === undefined
        ? (event.is_completed ? 'complete' : null)
        : event.completion_status;
    const known = LMS_STATUSES[status];
    if (!known) {
        return null;
    }
    if (event.completion_is_manual) {
        return known.done ? LMS_MANUAL_STATUSES.done : LMS_MANUAL_STATUSES.notDone;
    }
    return known;
};

// Выполнено ли задание с дедлайном: домашка Нетологии или элемент LMS.
export const isTaskDone = (event) => {
    if (event?.source === 'netology') {
        return Boolean(event.passed);
    }
    return Boolean(getLmsStatus(event)?.done);
};

export const LMS_REQUIREMENT_MARKS = {
    complete: '✅',
    complete_pass: '✅',
    complete_fail: '❌',
    incomplete: '⏳',
};
