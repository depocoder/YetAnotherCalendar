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

    // Установка начальной недели при загрузке
    useEffect(() => {
        const initialRange = calculateWeekRange(selectedDate);
        const initialDates = calculateWeekDates(selectedDate);
        setWeekRange(initialRange);
        setDate(initialDates);
    }, [selectedDate, calculateWeekRange, calculateWeekDates, setDate]);

    useEffect(() => {
        const fpInstance = flatpickr(datePickerRef.current, {
            locale: Russian,
            plugins: [weekSelect({})],
            disableMobile: true, // Prevent mobile formatting
            allowInput: false, // Prevent user input
            onChange: function (selectedDates) {
                if (selectedDates.length > 0) {
                    const selectedDate = selectedDates[0];
                    setSelectedDate(selectedDate);
                    const customRange = calculateWeekRange(selectedDate);
                    setWeekRange(customRange);
                    const newDates = calculateWeekDates(selectedDate);
                    setDate(newDates);
                }
            },
            onReady: function() {
                // Force our custom format immediately after flatpickr is ready
                const initialRange = calculateWeekRange(selectedDate);
                if (datePickerRef.current) {
                    datePickerRef.current.value = initialRange;
                }
            },
            onOpen: function() {
                // Restore our custom format when opening
                const currentRange = calculateWeekRange(selectedDate);
                if (datePickerRef.current) {
                    datePickerRef.current.value = currentRange;
                }
            },
            onClose: function() {
                // Force our custom format when closing
                const currentRange = calculateWeekRange(selectedDate);
                if (datePickerRef.current) {
                    datePickerRef.current.value = currentRange;
                }
            }
        });

        return () => {
            if (fpInstance && typeof fpInstance.destroy === 'function') {
                fpInstance.destroy();
            }
        };
    }, [setDate, calculateWeekRange, calculateWeekDates, selectedDate]);

    const handlePrevWeek = () => {
        setSelectedDate((prev) => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() - 7);
            const newRange = calculateWeekRange(newDate);
            const newDates = calculateWeekDates(newDate);
            setWeekRange(newRange);
            setDate(newDates);
            
            // Force update input with our custom format
            if (datePickerRef.current) {
                datePickerRef.current.value = newRange;
            }
            
            return newDate;
        });
    };

    const handleNextWeek = () => {
        setSelectedDate((prev) => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() + 7);
            const newRange = calculateWeekRange(newDate);
            const newDates = calculateWeekDates(newDate);
            setWeekRange(newRange);
            setDate(newDates);
            
            // Force update input with our custom format
            if (datePickerRef.current) {
                datePickerRef.current.value = newRange;
            }
            
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
                name="schedule-week"
                id="schedule-week"
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
