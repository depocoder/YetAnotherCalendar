import React, { useRef, useEffect } from 'react';
import Flatpickr from 'flatpickr';
import weekSelect from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';

const DatePicker = ({ value, onChange, options }) => {
  const datePickerRef = useRef(null);
  

  useEffect(() => {
    if (datePickerRef.current) {
      const fp = new Flatpickr(datePickerRef.current, {

      });
    }
  }, []);

  return (
    <div>
      <input type="text" ref={datePickerRef} value={value} />
    </div>
  );
};

export default DatePicker;
