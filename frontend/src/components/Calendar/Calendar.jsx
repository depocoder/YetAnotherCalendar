import flatpickr from "flatpickr";
import { useCallback, useRef } from "react";

const Calendar = () => {
    const fp1 = useRef();

    const inputRef = useCallback((node) => {
      if (node !== null) {
        fp1.current = flatpickr(node, {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
        });
      }
    }, []);

    return (<input type="date" ref={inputRef} />);
}

export default Calendar;
