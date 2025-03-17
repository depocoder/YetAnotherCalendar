import React from 'react';

const DeadLine = ({ date, events, setSelectedEvent }) => {
    // Получение всех дат между началом и концом недели
    const startDate = new Date(date.start);
    const monthDays = [];
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        monthDays.push(currentDate.toISOString().split('T')[0]);
    }

    return (
        <tr>
            <th className="vertical-heading">
                Дедлайны
                <button className="off-deadline">Скрыть</button>
            </th>
            {monthDays.map((day, index) => {
                const adjustedDay = new Date(new Date(date.start).setDate(new Date(date.start).getDate() + index)).toISOString().split('T')[0];

                // Фильтрация событий из Netology
                const netologyDeadlines = events?.netology?.homework
                    ?.filter(homework => {
                        const homeworkDeadline = new Date(homework.deadline).toISOString().split('T')[0];
                        return homeworkDeadline === adjustedDay;
                    })
                    ?.map((homework, hwIndex) => ({
                        ...homework,
                        source: 'netology', // Добавляем метку источника
                    }));

                // Фильтрация событий из UTMN (LMS)
                const utmnDeadlines = events?.utmn?.lms_events
                    ?.filter(event => {
                        const eventDeadline = new Date(event.dt_end).toISOString().split('T')[0];
                        return eventDeadline === adjustedDay;
                    })
                    ?.map((event, eventIndex) => ({
                        ...event,
                        source: 'utmn', // Добавляем метку источника
                    }));

                // Объединяем события из обоих источников
                const combinedDeadlines = [...(netologyDeadlines || []), ...(utmnDeadlines || [])];

                return (
                    <td key={index} className="vertical-deadline">
                        {combinedDeadlines && combinedDeadlines.length > 0 ? (
                            combinedDeadlines.map((deadline, dlIndex) => (
                                <div
                                    key={dlIndex}
                                    className={`deadline-info ${deadline.source}`}
                                    onClick={() => setSelectedEvent(deadline)} // Передаем событие в EventsDetail
                                >
                                    {/* Отображаем название события */}
                                    {/*<strong>{deadline.title || deadline.name}</strong>*/}
                                    {/* Метка источника */}
                                    <span className="source-tag">
                                        {deadline.source === 'netology' ? 'Нетология' : 'ТюмГу'}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="no-deadlines"></div>
                        )}
                    </td>
                );
            })}
        </tr>
    );
};

export default DeadLine;