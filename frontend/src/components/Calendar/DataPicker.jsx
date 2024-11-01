import React, { useEffect, useRef, useState, useCallback } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import "../../style/DatePicker.scss";
import leftWeek from "../../img/left-week.png";
import rightWeek from "../../img/right-week.png";
import weekSelect from "flatpickr/dist/plugins/weekSelect/weekSelect";

const DatePicker = ({ setDate, initialDate, disableButtons }) => {
    const datePickerRef = useRef(null);
    const [weekRange, setWeekRange] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date(initialDate.start));

    // Функция для вычисления начала и конца недели
    const calculateWeekDates = useCallback((date) => {
        const startOfWeek = new Date(date);
        const endOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1)); // Пн
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Вс

        // Форматируем даты в нужный формат
        return {
            start: `${startOfWeek.toISOString().split("T")[0]}T00:00:00+00:00`,
            end: `${endOfWeek.toISOString().split("T")[0]}T23:59:59+00:00`,
        };
    }, []);

    const calculateWeekRange = useCallback((date) => {
        const startOfWeek = new Date(date);
        const endOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1)); // Пн
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Вс

        const formatOptions = { day: "numeric", month: "long" };
        const startFormatted = startOfWeek.toLocaleDateString("ru-RU", formatOptions);
        const endFormatted = endOfWeek.toLocaleDateString("ru-RU", formatOptions);

        return `${startFormatted} – ${endFormatted}`;
    }, []);

    useEffect(() => {
        const fpInstance = flatpickr(datePickerRef.current, {
            locale: Russian,
            plugins: [weekSelect({})],
            onChange: function (selectedDates) {
                if (selectedDates.length > 0) {
                    const selectedDate = selectedDates[0];
                    setSelectedDate(selectedDate);
                    setWeekRange(calculateWeekRange(selectedDate));
                    const newDates = calculateWeekDates(selectedDate); // Обновляем даты
                    setDate(newDates); // Устанавливаем новые даты в родительском компоненте
                }
            }
        });

        return () => {
            fpInstance.destroy();
        };
    }, [setDate, initialDate.start, calculateWeekRange, calculateWeekDates]);

    useEffect(() => {
        setWeekRange(calculateWeekRange(selectedDate));
    }, [selectedDate, calculateWeekRange]);

    const handlePrevWeek = () => {
        setSelectedDate((prev) => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() - 7);
            setWeekRange(calculateWeekRange(newDate));
            const newDates = calculateWeekDates(newDate);
            setDate(newDates);
            return newDate;
        });
    };

    const handleNextWeek = () => {
        setSelectedDate((prev) => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() + 7);
            setWeekRange(calculateWeekRange(newDate));
            const newDates = calculateWeekDates(newDate);
            setDate(newDates);
            return newDate;
        });
    };

    return (
        <div className="date-picker-wrapper">
            <input
                ref={datePickerRef}
                className="date-picker-input"
                placeholder="Выберите неделю"
                readOnly
                value={weekRange}
            />
            <div className="week-display">
                <div className="week-navigation">
                    <button className="prev-week-btn" onClick={handlePrevWeek} disabled={disableButtons}>
                        <img src={leftWeek} alt="Previous Week" />
                    </button>
                    <button className="next-week-btn" onClick={handleNextWeek} disabled={disableButtons}>
                        <img src={rightWeek} alt="Next Week" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatePicker;
