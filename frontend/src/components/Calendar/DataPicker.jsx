import React, { useEffect, useState } from "react";
import "flatpickr/dist/flatpickr.css";
// import flatpickr from "flatpickr";
// import { Russian } from "flatpickr/dist/l10n/ru.js";
import "../../style/DatePicker.scss"; // Для стилей компонента

const DatePicker = () => {
  // const datePickerRef = useRef(null);
  const [currentDate, setCurrentDate] = useState(new Date()); // Текущая дата
  const [weekRange, setWeekRange] = useState("");

  // Рассчитать начало и конец недели
  const calculateWeekRange = (date) => {
    const startOfWeek = new Date(date);
    const endOfWeek = new Date(date);

    // Получаем понедельник текущей недели
    startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Понедельник
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Воскресенье

    const formatOptions = { day: "numeric", month: "long" };
    const startFormatted = startOfWeek.toLocaleDateString("ru-RU", formatOptions);
    const endFormatted = endOfWeek.toLocaleDateString("ru-RU", formatOptions);

    return `${startFormatted} – ${endFormatted}`;
  };

  // Обновить диапазон недели при изменении даты
  useEffect(() => {
    setWeekRange(calculateWeekRange(currentDate));
  }, [currentDate]);

  // Обработчик для переключения недель
  const handlePrevWeek = () => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() - 7); // Переключение на предыдущую неделю
      return newDate;
    });
  };

  const handleNextWeek = () => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() + 7); // Переключение на следующую неделю
      return newDate;
    });
  };

  return (
    <div className="date-picker-wrapper">
      <div className="week-display">
        <span className="week-range">{weekRange}</span>
        <div className="week-navigation">
          <button className="prev-week-btn" onClick={handlePrevWeek}>
            &lt;
          </button>
          <button className="next-week-btn" onClick={handleNextWeek}>
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatePicker;
