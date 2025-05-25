import React from 'react';
import {
    exportICS,
    getCalendarIdLocalStorage,
    getJWTTokenFromLocalStorage,
    getLMSIdFromLocalStorage,
    getLMSTokenFromLocalStorage,
    getTokenFromLocalStorage
} from "../../services/api";
import { toast } from 'react-toastify';

const ICSExporter = ({ date }) => {
    const downloadICSFile = async () => {
        const calendarId = getCalendarIdLocalStorage();

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

            if (!icsContent.data) {
                console.error("ICS экспорт вернул пустой файл:", icsContent); // 🔍 лог для отладки
                toast.error("Файл не был сформирован. Попробуйте позже.");
                return;
            }

            const blob = new Blob([icsContent.data], { type: "text/calendar" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "schedule.ics";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Ошибка экспорта .ics:", error);
            toast.error("Не удалось экспортировать расписание. Попробуйте позже.");
        }
    };

    return (
        <button className="export-btn" onClick={downloadICSFile}>
            Экспорт .ics
        </button>
    );
};

export default ICSExporter;
