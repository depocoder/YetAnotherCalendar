import React from 'react';
import {formatDate} from "../../utils/dateUtils";

const DaysNumber = ({ date }) => {
    return (
        <tr className="days-row">
            <th className="days"></th>
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day, index) => {
                const dayDate = new Date(date.start);
                dayDate.setDate(dayDate.getDate() + index);

                const today = new Date(); // Получаем сегодняшнюю дату
                today.setHours(0, 0, 0, 0); // Устанавливаем время на начало дня для корректного сравнения

                // Сравниваем даты и определяем нужный класс
                let dayClass = "";
                if (dayDate < today) {
                    dayClass = "prev";
                } else if (dayDate.toDateString() === today.toDateString()) {
                    dayClass = "now";
                } else {
                    dayClass = "next";
                }
                const formattedDate = formatDate(dayDate);
                return (
                    <th key={index} className={`days ${dayClass}`}>
                        {`${day} ${formattedDate}`}
                    </th>
                );
            })}
        </tr>
    );
};

export default DaysNumber;