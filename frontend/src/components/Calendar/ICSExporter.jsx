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
import { handleApiError } from '../../utils/errorHandler';
import { useNavigate } from 'react-router-dom';

const ICSExporter = ({ date }) => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const generateFilename = () => {
        const startDate = new Date(date.start);
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
    
        return `schedule_week-${year}-${month}-${day}.ics`;
    };

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
            a.download = generateFilename();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            debug.error("Ошибка экспорта .ics:", error);
            
            handleApiError(error, "Не удалось экспортировать .ics файл.", navigate);

        } finally {
            setLoading(false);
        }
    };

    return (
        <button 
            className="export-btn" 
            onClick={downloadICSFile} 
            disabled={loading}
            title="ICS файл - стандартный формат календаря, который можно импортировать в Google Calendar, Outlook, Apple Calendar и другие календарные приложения для синхронизации расписания"
        >
            {loading ? <InlineLoader /> : 'Экспорт .ics'}
        </button>
    );
};

export default ICSExporter;