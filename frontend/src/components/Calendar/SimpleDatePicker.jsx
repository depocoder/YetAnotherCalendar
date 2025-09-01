import React, { useState, useCallback } from "react";
import "../../style/SimpleDatePicker.scss";

const SimpleDatePicker = ({ setDate, initialDate, disableButtons }) => {
    const [selectedDate, setSelectedDate] = useState(new Date(initialDate.start));

    const calculateWeekDates = useCallback((date) => {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - ((date.getDay() || 7) - 1)); // Пн

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Вс

        return {
            start: `${startOfWeek.getFullYear()}-${(startOfWeek.getMonth() + 1).toString().padStart(2, '0')}-${startOfWeek.getDate().toString().padStart(2, '0')}`,
            end: `${endOfWeek.getFullYear()}-${(endOfWeek.getMonth() + 1).toString().padStart(2, '0')}-${endOfWeek.getDate().toString().padStart(2, '0')}`,
        };
    }, []);

    const calculateWeekRange = useCallback((date) => {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - ((date.getDay() || 7) - 1)); // Пн

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Вс

        const formatDateFull = (date) => {
            const monthNames = [
                'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
            ];
            const day = date.getDate();
            const month = monthNames[date.getMonth()];
            return `${day} ${month}`;
        };

        const startFormatted = formatDateFull(startOfWeek);
        const endFormatted = formatDateFull(endOfWeek);

        return `${startFormatted} – ${endFormatted}`;
    }, []);

    const handlePrevWeek = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() - 7);
        setSelectedDate(newDate);
        const newDates = calculateWeekDates(newDate);
        setDate(newDates);
    };

    const handleNextWeek = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + 7);
        setSelectedDate(newDate);
        const newDates = calculateWeekDates(newDate);
        setDate(newDates);
    };

    const weekRange = calculateWeekRange(selectedDate);

    return (
        <div className="simple-datepicker">
            <button 
                className="simple-datepicker-btn prev-btn"
                onClick={handlePrevWeek}
                disabled={disableButtons}
                aria-label="Предыдущая неделя"
            >
                &#8249;
            </button>
            
            <div className="simple-datepicker-display">
                {weekRange}
            </div>
            
            <button 
                className="simple-datepicker-btn next-btn"
                onClick={handleNextWeek}
                disabled={disableButtons}
                aria-label="Следующая неделя"
            >
                &#8250;
            </button>
        </div>
    );
};

export default SimpleDatePicker;