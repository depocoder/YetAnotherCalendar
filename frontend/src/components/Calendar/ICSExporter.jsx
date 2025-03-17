import React from 'react';
import {
    exportICS, getCalendarIdLocalStorage,
    getJWTTokenFromLocalStorage, getLMSIdFromLocalStorage, getLMSTokenFromLocalStorage,
    getTokenFromLocalStorage
} from "../../services/api";

const ICSExporter = ({date}) => {
    const downloadICSFile = async () => {
        let calendarId
        calendarId = getCalendarIdLocalStorage();
        try {
            const icsContent = await exportICS({
                calendarId,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timeMin: date.start,
                timeMax: date.end,
                sessionToken: getTokenFromLocalStorage(),
                jwtToken: getJWTTokenFromLocalStorage(),
                lxpToken: getLMSTokenFromLocalStorage(),
                lxpId: getLMSIdFromLocalStorage()
            });
            if (icsContent.data === '') return; // Если не удалось создать файл, выходим

            const blob = new Blob([icsContent.data], {type: "text/calendar"});
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "schedule.ics"; // Имя файла для скачивания
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url); // Освобождаем память
        } catch (error) {
            // TODO make better exception handling
            throw new Error('Не удалось получить события');
        }

    };

    return (
        <button className="export-btn" onClick={downloadICSFile}>
            Экспорт .ics
        </button>
    );
};

export default ICSExporter;

