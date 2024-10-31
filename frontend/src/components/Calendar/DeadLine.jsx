import React from 'react';

const DeadLine = ({date, events, setSelectedEvent}) => {
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
            <th className="vertical-heading"> Дедлайны
                <button className="off-deadline">Скрыть</button>
            </th>
            {monthDays.map((day, index) => {
                const adjustedDay = new Date(new Date(date.start).setDate(new Date(date.start).getDate() + index + 1)).toISOString().split('T')[0];

                const deadlines = events?.netology?.homework.filter(homework => {
                    const homeworkDeadline = new Date(homework.deadline).toISOString().split('T')[0];
                    return homeworkDeadline === adjustedDay;
                });

                return (
                    <td key={index} className="vertical-deadline">
                        {deadlines && deadlines.length > 0 ? (
                            deadlines.map((homework, hwIndex) => (
                                <div key={hwIndex} className="deadline-info" onClick={() => setSelectedEvent(homework)}>
                                    {homework.title}
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