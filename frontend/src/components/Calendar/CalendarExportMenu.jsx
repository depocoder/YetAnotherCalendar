import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
    exportICS,
    getCalendarIdsLocalStorage,
    getModeusPersonIdFromLocalStorage,
    getLMSIdFromLocalStorage,
    getLMSTokenFromLocalStorage,
    getTokenFromLocalStorage
} from "../../services/api";
import InlineLoader from '../../elements/InlineLoader';
import { debug } from '../../utils/debug';
import { handleApiError } from '../../utils/errorHandler';
import { useNavigate } from 'react-router-dom';
import '../../style/export-menu.scss';

/**
 * Кнопка "В календарь": разовый экспорт .ics и авто-обновляемая подписка
 * в одном выпадающем меню. На десктопе меню открывается по наведению,
 * на мобильных - по нажатию.
 */
const CalendarExportMenu = ({ date, onOpenSubscription }) => {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const closeTimerRef = useRef(null);

    const openMenu = () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        setOpen(true);
    };

    // Небольшая задержка, чтобы меню не схлопывалось при переходе курсора на пункты
    const scheduleClose = () => {
        closeTimerRef.current = setTimeout(() => setOpen(false), 150);
    };

    const generateFilename = () => {
        const startDate = new Date(date.start);
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');

        return `schedule_week-${year}-${month}-${day}.ics`;
    };

    const downloadICSFile = async () => {
        setOpen(false);
        const calendarIds = getCalendarIdsLocalStorage();
        setLoading(true);

        try {
            const icsContent = await exportICS({
                calendarIds,
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

    const handleSubscriptionClick = () => {
        setOpen(false);
        onOpenSubscription();
    };

    return (
        <div
            className={`export-menu ${open ? 'export-menu--open' : ''}`}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
        >
            <button
                className="export-btn"
                onClick={() => setOpen(prev => !prev)}
                disabled={loading}
                title="Разовый экспорт недели или авто-обновляемая подписка"
            >
                {loading ? <InlineLoader /> : <>📅 В календарь <span className="export-menu__caret">▾</span></>}
            </button>
            {open && <div className="export-menu__backdrop" onClick={() => setOpen(false)} />}
            <div className="export-menu__dropdown">
                <button className="export-menu__item" onClick={downloadICSFile} disabled={loading}>
                    <span className="export-menu__item-icon">⬇</span>
                    <span>
                        <span className="export-menu__item-title">Скачать .ics</span>
                        <span className="export-menu__item-hint">Текущая неделя, разовый файл</span>
                    </span>
                </button>
                <button className="export-menu__item" onClick={handleSubscriptionClick}>
                    <span className="export-menu__item-icon">🔗</span>
                    <span>
                        <span className="export-menu__item-title">Подписка по URL</span>
                        <span className="export-menu__item-hint">Обновляется сама в Google/Apple</span>
                    </span>
                </button>
            </div>
        </div>
    );
};

export default CalendarExportMenu;
