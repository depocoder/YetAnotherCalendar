// import React, { useEffect, useState } from "react";
// import "flatpickr/dist/flatpickr.css";
// // import flatpickr from "flatpickr";
// // import { Russian } from "flatpickr/dist/l10n/ru.js";
// import "../../style/DatePicker.scss"; // Для стилей компонента
//
// const DatePicker = () => {
//   // const datePickerRef = useRef(null);
//   const [currentDate, setCurrentDate] = useState(new Date()); // Текущая дата
//   const [weekRange, setWeekRange] = useState("");
//
//   // Рассчитать начало и конец недели
//   const calculateWeekRange = (date) => {
//     const startOfWeek = new Date(date);
//     const endOfWeek = new Date(date);
//
//     // Получаем понедельник текущей недели
//     startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Понедельник
//     endOfWeek.setDate(startOfWeek.getDate() + 6); // Воскресенье
//
//     const formatOptions = { day: "numeric", month: "long" };
//     const startFormatted = startOfWeek.toLocaleDateString("ru-RU", formatOptions);
//     const endFormatted = endOfWeek.toLocaleDateString("ru-RU", formatOptions);
//
//     return `${startFormatted} – ${endFormatted}`;
//   };
//
//   // Обновить диапазон недели при изменении даты
//   useEffect(() => {
//     setWeekRange(calculateWeekRange(currentDate));
//   }, [currentDate]);
//
//   // Обработчик для переключения недель
//   const handlePrevWeek = () => {
//     setCurrentDate((prevDate) => {
//       const newDate = new Date(prevDate);
//       newDate.setDate(prevDate.getDate() - 7); // Переключение на предыдущую неделю
//       return newDate;
//     });
//   };
//
//   const handleNextWeek = () => {
//     setCurrentDate((prevDate) => {
//       const newDate = new Date(prevDate);
//       newDate.setDate(prevDate.getDate() + 7); // Переключение на следующую неделю
//       return newDate;
//     });
//   };
//
//   return (
//     <div className="date-picker-wrapper">
//       <div className="week-display">
//         <span className="week-range">{weekRange}</span>
//         <div className="week-navigation">
//           <button className="prev-week-btn" onClick={handlePrevWeek}>
//             &lt;
//           </button>
//           <button className="next-week-btn" onClick={handleNextWeek}>
//             &gt;
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };
//
// export default DatePicker;

// import React, { useEffect, useRef, useState } from "react";
// import flatpickr from "flatpickr";
// import "flatpickr/dist/flatpickr.css";
// import { Russian } from "flatpickr/dist/l10n/ru.js";
// import "../../style/DatePicker.scss";
// import weekSelect from "flatpickr/dist/plugins/weekSelect/weekSelect"; // Плагин выбора недели
//
// const DatePicker = () => {
//   const datePickerRef = useRef(null); // Ссылка на input для календаря
//   const [weekRange, setWeekRange] = useState(""); // Диапазон недели
//
//   // Рассчитать начало и конец недели
//   const calculateWeekRange = (date) => {
//     const startOfWeek = new Date(date);
//     const endOfWeek = new Date(date);
//
//     // Получаем понедельник текущей недели
//     startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Понедельник
//     endOfWeek.setDate(startOfWeek.getDate() + 6); // Воскресенье
//
//     const formatOptions = { day: "numeric", month: "long" };
//     const startFormatted = startOfWeek.toLocaleDateString("ru-RU", formatOptions);
//     const endFormatted = endOfWeek.toLocaleDateString("ru-RU", formatOptions);
//
//     return `${startFormatted} – ${endFormatted}`;
//   };
//
//   // Инициализация flatpickr с плагином weekSelect
//   useEffect(() => {
//     const fpInstance = flatpickr(datePickerRef.current, {
//       locale: Russian,
//       plugins: [weekSelect({})], // Плагин выбора недели
//       onChange: function(selectedDates) {
//         if (selectedDates.length > 0) {
//           const weekNumber = this.config.getWeek(selectedDates[0]); // Получение номера недели
//           console.log("Selected week number:", weekNumber);
//
//           // Обновляем диапазон недели
//           setWeekRange(calculateWeekRange(selectedDates[0]));
//         }
//       },
//     });
//
//     return () => {
//       fpInstance.destroy(); // Уничтожение инстанса flatpickr при размонтировании компонента
//     };
//   }, []);
//
//   // Обработчик для переключения недель
//   const handlePrevWeek = () => {
//     setWeekRange((prevWeekRange) => calculateWeekRange(new Date(new Date(prevWeekRange).getDate() - 7)));
//   };
//
//   const handleNextWeek = () => {
//     setWeekRange((prevWeekRange) => calculateWeekRange(new Date(new Date(prevWeekRange).getDate() + 7)));
//   };
//
//   return (
//     <div className="date-picker-wrapper">
//       <input ref={datePickerRef} className="date-picker-input" placeholder="Выберите неделю" readOnly />
//       <div className="week-display">
//         <span className="week-range">{weekRange}</span>
//         <div className="week-navigation">
//           <button className="prev-week-btn" onClick={handlePrevWeek}>
//             &lt;
//           </button>
//           <button className="next-week-btn" onClick={handleNextWeek}>
//             &gt;
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };
//
// export default DatePicker;

//
//
//
// import React, { useEffect, useRef, useState } from "react";
// import flatpickr from "flatpickr";
// import "flatpickr/dist/flatpickr.css";
// import { Russian } from "flatpickr/dist/l10n/ru.js";
// import "../../style/DatePicker.scss";
// import weekSelect from "flatpickr/dist/plugins/weekSelect/weekSelect";
//
// const DatePicker = ({ onWeekChange, disableButtons  }) => {
//     const datePickerRef = useRef(null);
//     const [weekRange, setWeekRange] = useState("");
//     const [selectedDate, setSelectedDate] = useState(new Date());
//
//     const calculateWeekRange = (date) => {
//         const startOfWeek = new Date(date);
//         const endOfWeek = new Date(date);
//         startOfWeek.setDate(date.getDate() - date.getDay() + 1);
//         endOfWeek.setDate(startOfWeek.getDate() + 6);
//
//         const formatOptions = { day: "numeric", month: "long" };
//         const startFormatted = startOfWeek.toLocaleDateString("ru-RU", formatOptions);
//         const endFormatted = endOfWeek.toLocaleDateString("ru-RU", formatOptions);
//
//         return `${startFormatted} – ${endFormatted}`;
//     };
//
//     useEffect(() => {
//         const fpInstance = flatpickr(datePickerRef.current, {
//             locale: Russian,
//             plugins: [weekSelect({})],
//             onChange: function (selectedDates) {
//                 if (selectedDates.length > 0) {
//                     setSelectedDate(selectedDates[0]);
//                     setWeekRange(calculateWeekRange(selectedDates[0]));
//                     if (onWeekChange) {
//                         onWeekChange(selectedDates[0]); // Вызываем переданную функцию
//                     }
//                 }
//             },
//         });
//
//         return () => {
//             fpInstance.destroy();
//         };
//     }, [onWeekChange]);
//
//     useEffect(() => {
//         setWeekRange(calculateWeekRange(selectedDate));
//     }, [selectedDate]);
//
//     const handlePrevWeek = () => {
//         setSelectedDate((prev) => {
//             const newDate = new Date(prev);
//             newDate.setDate(prev.getDate() - 7);
//             setWeekRange(calculateWeekRange(newDate));
//             if (onWeekChange) {
//                 onWeekChange(newDate); // Вызываем переданную функцию
//             }
//             return newDate;
//         });
//     };
//
//     const handleNextWeek = () => {
//         setSelectedDate((prev) => {
//             const newDate = new Date(prev);
//             newDate.setDate(prev.getDate() + 7);
//             setWeekRange(calculateWeekRange(newDate));
//             if (onWeekChange) {
//                 onWeekChange(newDate); // Вызываем переданную функцию
//             }
//             return newDate;
//         });
//     };
//
//     return (
//         <div className="date-picker-wrapper">
//             <input
//                 ref={datePickerRef}
//                 className="date-picker-input"
//                 placeholder="Выберите неделю"
//                 readOnly
//                 value={weekRange}
//             />
//             <div className="week-display">
//                 <span className="week-range">{weekRange}</span>
//                 <div className="week-navigation">
//                     <button className="prev-week-btn" onClick={handlePrevWeek} disabled={disableButtons}>
//                         &lt;
//                     </button>
//                     <button className="next-week-btn" onClick={handleNextWeek} disabled={disableButtons}>
//                         &gt;
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };
//
// export default DatePicker;




//
//
// import React, { useEffect, useRef, useState } from "react";
// import flatpickr from "flatpickr";
// import "flatpickr/dist/flatpickr.css";
// import { Russian } from "flatpickr/dist/l10n/ru.js";
// import "../../style/DatePicker.scss";
// import weekSelect from "flatpickr/dist/plugins/weekSelect/weekSelect";
//
// import leftWeek from "../../img/left-week.png";
// import rightWeek from "../../img/right-week.png";
//
//
// const DatePicker = ({ onWeekChange, disableButtons }) => {
//     const datePickerRef = useRef(null);
//     const [weekRange, setWeekRange] = useState("");
//     const [selectedDate, setSelectedDate] = useState(new Date());
//
//     const calculateWeekRange = (date) => {
//         const startOfWeek = new Date(date);
//         const endOfWeek = new Date(date);
//         startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Пн
//         endOfWeek.setDate(startOfWeek.getDate() + 6); // Вс
//
//         const formatOptions = { day: "numeric", month: "long" };
//         const startFormatted = startOfWeek.toLocaleDateString("ru-RU", formatOptions);
//         const endFormatted = endOfWeek.toLocaleDateString("ru-RU", formatOptions);
//
//         return `${startFormatted} – ${endFormatted}`;
//     };
//
//     useEffect(() => {
//         const fpInstance = flatpickr(datePickerRef.current, {
//             locale: Russian,
//             plugins: [weekSelect({})],
//             onChange: function (selectedDates) {
//                 if (selectedDates.length > 0) {
//                     // Убедитесь, что selectedDates[0] - это правильная дата
//                     setSelectedDate(selectedDates[0]); // Устанавливаем как Date объект
//                     setWeekRange(calculateWeekRange(selectedDates[0]));
//                     if (onWeekChange) {
//                         // Передаем форматированную дату
//                         onWeekChange(selectedDates[0].toISOString());
//                     }
//                 }
//             },
//         });
//
//         return () => {
//             fpInstance.destroy();
//         };
//     }, [onWeekChange]);
//
//     useEffect(() => {
//         setWeekRange(calculateWeekRange(selectedDate));
//     }, [selectedDate]);
//
//     const handlePrevWeek = () => {
//         setSelectedDate((prev) => {
//             const newDate = new Date(prev);
//             newDate.setDate(prev.getDate() - 7);
//             setWeekRange(calculateWeekRange(newDate));
//             if (onWeekChange) {
//                 onWeekChange(newDate.toISOString());
//             }
//             return newDate;
//         });
//     };
//
//     const handleNextWeek = () => {
//         setSelectedDate((prev) => {
//             const newDate = new Date(prev);
//             newDate.setDate(prev.getDate() + 7);
//             setWeekRange(calculateWeekRange(newDate));
//             if (onWeekChange) {
//                 onWeekChange(newDate.toISOString());
//             }
//             return newDate;
//         });
//     };
//
//     return (
//         <div className="date-picker-wrapper">
//             <input
//                 ref={datePickerRef}
//                 className="date-picker-input"
//                 placeholder="Выберите неделю"
//                 readOnly
//                 value={weekRange}
//             />
//             <div className="week-display">
//                 {/*<span className="week-range">{weekRange}</span>*/}
//                 <div className="week-navigation">
//                     <button className="prev-week-btn" onClick={handlePrevWeek} disabled={disableButtons}>
//                         <img src={leftWeek} alt={leftWeek}/>
//                     </button>
//                     <button className="next-week-btn" onClick={handleNextWeek} disabled={disableButtons}>
//                         <img src={rightWeek} alt={rightWeek}/>
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };
//
// export default DatePicker;



import React, { useEffect, useRef, useState } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import "../../style/DatePicker.scss";

import leftWeek from "../../img/left-week.png";
import rightWeek from "../../img/right-week.png";
import weekSelect from "flatpickr/dist/plugins/weekSelect/weekSelect";

const DatePicker = ({ onWeekChange, disableButtons }) => {
    const datePickerRef = useRef(null);
    const [weekRange, setWeekRange] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date());

    const calculateWeekRange = (date) => {
        const startOfWeek = new Date(date);
        const endOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Пн
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Вс

        const formatOptions = { day: "numeric", month: "long" };
        const startFormatted = startOfWeek.toLocaleDateString("ru-RU", formatOptions);
        const endFormatted = endOfWeek.toLocaleDateString("ru-RU", formatOptions);

        return `${startFormatted} – ${endFormatted}`;
    };

    useEffect(() => {
        const fpInstance = flatpickr(datePickerRef.current, {
            locale: Russian,
            plugins: [weekSelect({})],
            // onChange: function (selectedDates) {
            //     if (selectedDates.length > 0) {
            //         console.log("Selected date:", selectedDates[0]); // Это будет объект Date
            //         const selected = selectedDates[0];
            //         setSelectedDate(selected); // Устанавливаем как Date объект
            //         setWeekRange(calculateWeekRange(selected));
            //         if (onWeekChange) {
            //             onWeekChange(selected.toISOString()); // Передаем в формате ISO
            //         }
            //     }
            // },
            onChange: function (selectedDates) {
                if (selectedDates.length > 0) {
                    const selectedDate = selectedDates[0];
                    setSelectedDate(selectedDate); // Установка состояния внутри компонента DatePicker
                    if (onWeekChange) {
                        onWeekChange(selectedDate); // Вызов функции обратного вызова
                    }
                }
            }
        });

        return () => {
            fpInstance.destroy();
        };
    }, [onWeekChange]);

    useEffect(() => {
        setWeekRange(calculateWeekRange(selectedDate));
    }, [selectedDate]);

    const handlePrevWeek = () => {
        setSelectedDate((prev) => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() - 7);
            setWeekRange(calculateWeekRange(newDate));
            if (onWeekChange) {
                onWeekChange(newDate.toISOString()); // Передаем в формате ISO
            }
            return newDate;
        });
    };

    const handleNextWeek = () => {
        setSelectedDate((prev) => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() + 7);
            setWeekRange(calculateWeekRange(newDate));
            if (onWeekChange) {
                onWeekChange(newDate.toISOString()); // Передаем в формате ISO
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
            />
            <div className="week-display">
                {/*<span className="week-range">{weekRange}</span>*/}
                <div className="week-navigation">
                    <button className="prev-week-btn" onClick={handlePrevWeek} disabled={disableButtons}>
                        <img src={leftWeek} alt={leftWeek}/>
                    </button>
                    <button className="next-week-btn" onClick={handleNextWeek} disabled={disableButtons}>
                        <img src={rightWeek} alt={rightWeek}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatePicker;
