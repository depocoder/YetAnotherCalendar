import React, { useState } from 'react';
import {
    exportICS,
    getCalendarIdLocalStorage,
    getModeusPersonIdFromLocalStorage,
    getLMSIdFromLocalStorage,
    getLMSTokenFromLocalStorage,
    getTokenFromLocalStorage
} from "../../services/api";
import { toast } from 'react-toastify';
import InlineLoader from '../../elements/InlineLoader';
import { debug } from '../../utils/debug';

const ICSExporter = ({ date }) => {
    const [loading, setLoading] = useState(false);
    const downloadICSFile = async () => {
        const calendarId = getCalendarIdLocalStorage();
        setLoading(true);

        try {
            const icsContent = await exportICS({
                calendarId,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timeMin: date.start,
                timeMax: date.end,
                sessionToken: getTokenFromLocalStorage(),
                modeusPersonId: getModeusPersonIdFromLocalStorage(),
                lxpToken: getLMSTokenFromLocalStorage(),
                lxpId: getLMSIdFromLocalStorage()
            });

            if (!icsContent.data) {
                debug.error("ICS экспорт вернул пустой файл:", icsContent);
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
            debug.error("Ошибка экспорта .ics:", error);
            toast.error("Не удалось экспортировать расписание. Попробуйте позже.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button className="export-btn" onClick={downloadICSFile} disabled={loading}>
            {loading ? <InlineLoader /> : 'Экспорт .ics'}
        </button>
    );
};

export default ICSExporter;
