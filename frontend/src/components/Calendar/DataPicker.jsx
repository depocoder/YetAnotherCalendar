import React, { useRef, useEffect, useState } from 'react';
import Flatpickr from 'flatpickr';
import weekSelect from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import flatpickr from 'flatpickr';

const DatePicker = () => {
  const datePickerRef = useRef(null);
  
  const [dateOnCalendar, setDateOnCalendar] = useState("2024-09-19")
  const [weekNumber, setWeekNumber] = useState(null)

  useEffect(() => {
    flatpickr(datePickerRef.current, {
      "onChange": [() => {
        setWeekNumber(this.selectedDates[0] ? setWeekNumber(this.selectedDates[0]) : null)
        console.log(weekNumber);
    }]
    });
  }, []);

  return (
    <div>
      <input type="text" ref={datePickerRef} value={dateOnCalendar} onChange={(e) => setDateOnCalendar(e.target.value)}/>
    </div>
  );
};

export default DatePicker;
