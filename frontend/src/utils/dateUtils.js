export const getCurrentWeekDates = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const sundayOffset = 7 - dayOfWeek;

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + mondayOffset);
  startOfWeek.setUTCHours(0, 0, 0, 0);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + sundayOffset);
  endOfWeek.setUTCHours(23, 59, 59, 0);

  const formatToRequiredISO = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+00:00`;
  };

  const formattedStart = formatToRequiredISO(startOfWeek);
  const formattedEnd = formatToRequiredISO(endOfWeek);

  // console.log("Formatted Start:", formattedStart);
  // console.log("Formatted End:", formattedEnd);

  return {
    start: formattedStart,
    end: formattedEnd,
  };
};