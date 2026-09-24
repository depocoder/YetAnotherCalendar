import React, { useMemo, useState, useEffect } from 'react';
import { format, startOfDay } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { isTaskDone } from '../../utils/lmsStatus';

const DeadlineCell = ({ deadlines, setSelectedEvent }) => (
    <td className="vertical-deadline">
        <div className="deadline-content">
            {deadlines.length > 0 ? (
                deadlines.map((deadline, dlIndex) => (
                    <div
                        key={dlIndex}
                        className={`deadline-info ${deadline.source}${deadline.isPast ? ' past' : ''}${deadline.isDone ? ' done' : ''}`}
                        onClick={() => setSelectedEvent(deadline)}
                    >
                        <span className="source-tag">
                            {deadline.isDone && '✅ '}
                            {deadline.source === 'netology' ? 'Нетология' : 'ТюмГу'}
                        </span>
                    </div>
                ))
            ) : (
                <div className="no-deadlines"></div>
            )}
        </div>
    </td>
);

const DeadlineRow = ({ monthDays, deadlinesByDay, setSelectedEvent, onToggleVisibility, isVisible }) => (
    <tr className={!isVisible ? 'deadlines-hidden' : ''}>
        <th className="vertical-heading">
            <div className="deadline-header-container">
                Дедлайны
                <button className="off-deadline" onClick={onToggleVisibility}>
                    {isVisible ? 'Скрыть' : 'Показать'}
                </button>
            </div>
        </th>
        {monthDays.map((day, index) => {
            const dailyDeadlines = deadlinesByDay[day] || [];
            return <DeadlineCell key={index} deadlines={dailyDeadlines} setSelectedEvent={setSelectedEvent} />;
        })}
    </tr>
);

const DeadLine = ({ date, events, setSelectedEvent }) => {
    const [isVisible, setIsVisible] = useState(() => {
        const storedVisibility = localStorage.getItem('deadlinesVisible');
        return storedVisibility !== null ? JSON.parse(storedVisibility) : true;
    });
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    useEffect(() => {
        localStorage.setItem('deadlinesVisible', JSON.stringify(isVisible));
    }, [isVisible]);

    const deadlinesByDay = useMemo(() => {
        const deadlines = {};
        const now = new Date();

        const processDeadlines = (deadlineEvents, type) => {
            deadlineEvents?.forEach(event => {
                const deadlineDate = utcToZonedTime(new Date(event.deadline || event.dt_end), userTimezone);
                const dayKey = format(startOfDay(deadlineDate), 'yyyy-MM-dd');

                if (!deadlines[dayKey]) {
                    deadlines[dayKey] = [];
                }

                const deadline = {
                    ...event,
                    source: type,
                    isPast: deadlineDate < now,
                };
                deadline.isDone = isTaskDone(deadline);
                deadlines[dayKey].push(deadline);
            });
        };

        processDeadlines(events?.netology?.homework, 'netology');
        processDeadlines(events?.utmn?.lms_events, 'utmn');

        return deadlines;
    }, [events, userTimezone]);

    const monthDays = useMemo(() => {
        const startDate = new Date(date.start);
        return Array.from({ length: 7 }, (_, i) => {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            return format(currentDate, 'yyyy-MM-dd');
        });
    }, [date.start]);

    return (
        <DeadlineRow
            monthDays={monthDays}
            deadlinesByDay={deadlinesByDay}
            setSelectedEvent={setSelectedEvent}
            onToggleVisibility={() => setIsVisible(!isVisible)}
            isVisible={isVisible}
        />
    );
};

export default DeadLine;