// export const getCurrentWeekDates = () => {
//     const today = new Date();
//     const dayOfWeek = today.getDay(); // 0 (вс) - 6 (сб)
//
//     // Смещение для понедельника
//     const mondayOffset = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek); // Смещаем на 0 или -6 для начала с понедельника
//     const sundayOffset = 7 - dayOfWeek; // Конец недели (вс) - смещаем на 0 или 6
//
//     const startOfWeek = new Date(today);
//     startOfWeek.setDate(today.getDate() + mondayOffset);
//     startOfWeek.setUTCHours(0, 0, 0, 0); // Начало дня (00:00:00)
//
//     const endOfWeek = new Date(today);
//     endOfWeek.setDate(today.getDate() + sundayOffset);
//     endOfWeek.setUTCHours(23, 59, 59, 999); // Конец дня (23:59:59.999)
//
//     const formatToRequiredISO = (date) => {
//         const year = date.getUTCFullYear();
//         const month = String(date.getUTCMonth() + 1).padStart(2, '0');
//         const day = String(date.getUTCDate()).padStart(2, '0');
//         const hours = String(date.getUTCHours()).padStart(2, '0');
//         const minutes = String(date.getUTCMinutes()).padStart(2, '0');
//         const seconds = String(date.getUTCSeconds()).padStart(2, '0');
//
//         return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+00:00`;
//     };
//
//     const formattedStart = formatToRequiredISO(startOfWeek);
//     const formattedEnd = formatToRequiredISO(endOfWeek);
//
//     // Возвращаем начальную и конечную даты недели
//     return {
//         start: formattedStart,
//         end: formattedEnd,
//     };
// };

export const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getUTCDay(); // 0 (вс) - 6 (сб)

    // Смещение к началу недели (понедельнику)
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const sundayOffset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

    const startOfWeek = new Date(today);
    startOfWeek.setUTCDate(today.getUTCDate() + mondayOffset);
    startOfWeek.setUTCHours(0, 0, 0, 0); // Начало дня (00:00:00)

    const endOfWeek = new Date(today);
    endOfWeek.setUTCDate(today.getUTCDate() + sundayOffset);

    const formatToRequiredISO = (date) => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    };

    const formattedStart = formatToRequiredISO(startOfWeek);
    const formattedEnd = formatToRequiredISO(endOfWeek);

    return {
        start: formattedStart,
        end: formattedEnd,
    };
};


export const formatDate = (dateString) => {
    const dateObj = new Date(dateString);
    const day = dateObj.getUTCDate().toString().padStart(2, '0');
    const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`; // Возвращаем строку в формате "дд.мм"
};

export const formatHours = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
};
