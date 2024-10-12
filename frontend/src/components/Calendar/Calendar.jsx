import flatpickr from "flatpickr";
import { useCallback, useRef } from "react";

const Calendar = () => {
  const fp1 = useRef();

  const inputRef = useCallback((node) => {
    if (node !== null) {
      fp1.current = flatpickr(node, {
        enableTime: true,
        dateFormat: "j, F",
      });
    }
  }, []);

  return <input className="calendar" type="date" ref={inputRef} />;
};

export default Calendar;
