import React from 'react';

const ICSExporter = ({ events }) => {
    const generateICSFile = (events) => {
        // Убедитесь, что events — это массив
        if (!Array.isArray(events)) {
            console.error('Events is not an array:', events);
            return ''; // Возвращаем пустую строку, если это не массив
        }

        const icsHeader = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Your Company//Your Product//EN\nCALSCALE:GREGORIAN\n";
        const icsFooter = "END:VCALENDAR\n";
        let icsBody = "";

        events.forEach(event => {
            const startDate = new Date(event.start);
            const endDate = new Date(event.end);

            // Проверка на допустимость дат
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.error('Invalid date for event:', event);
                return; // Пропустить это событие, если дата недопустима
            }

            const formattedStartDate = startDate.toISOString().replace(/-|:|\.\d+/g, ""); // Форматирование даты
            const formattedEndDate = endDate.toISOString().replace(/-|:|\.\d+/g, "");

            const eventString = `BEGIN:VEVENT\n` +
                `UID:${event.id}\n` + // Уникальный идентификатор события
                `SUMMARY:${event.title}\n` + // Заголовок события
                `DESCRIPTION:${event.description || ''}\n` + // Описание события
                `DTSTART:${formattedStartDate}\n` + // Дата начала
                `DTEND:${formattedEndDate}\n` + // Дата окончания
                `END:VEVENT\n`;
            icsBody += eventString;
        });

        return icsHeader + icsBody + icsFooter;
    };

    const downloadICSFile = () => {
        const icsContent = generateICSFile(events);
        if (icsContent === '') return; // Если не удалось создать файл, выходим

        const blob = new Blob([icsContent], { type: "text/calendar" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "schedule.ics"; // Имя файла для скачивания
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Освобождаем память
    };

    return (
        <button className="export-btn" onClick={downloadICSFile}>
            Экспорт .ics
        </button>
    );
};

export default ICSExporter;

