import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ModeusDaySchedulePage from './ModeusDaySchedulePage';
import * as api from '../services/api';

jest.mock('../components/Calendar/ExitBtn', () => () => null);
jest.mock('react-toastify', () => ({toast: {
    info: jest.fn(), success: jest.fn(), error: jest.fn(), warning: jest.fn(),
}}));
jest.mock('../services/api', () => ({
    getDayEvents: jest.fn(), getModeusProfiles: jest.fn(), getMtsLinks: jest.fn(),
    saveLinkToEvent: jest.fn(), getTutorTokenFromLocalStorage: jest.fn(),
    getWeeklyUsersCount: jest.fn(), getLinkRedirectMetrics: jest.fn(),
}));

test('schedule messages keep individual lessons in time order with their own links', async () => {
    localStorage.clear();
    localStorage.setItem('autoGenerateMessage', 'true');
    const lesson = (id, course, hour) => ({
        id, course_name: course, name: course, is_lxp: false,
        start: `2026-10-12T${hour}:00:00+03:00`,
        end: `2026-10-12T${hour}:45:00+03:00`,
        teacher_full_name: 'Иванов Иван Иванович',
        cycle_realization: {id, code: 'unknown', name: 'Лекционное занятие'},
        mts_url: `https://yetanothercalendar.ru/api/mts/${id}`,
    });
    api.getTutorTokenFromLocalStorage.mockReturnValue('test-tutor');
    api.getDayEvents.mockResolvedValue({status: 200, data: [
        lesson('second', 'Физика', '11'), lesson('first', 'Математика', '09'),
    ]});
    api.getModeusProfiles.mockResolvedValue([]);
    api.getWeeklyUsersCount.mockResolvedValue({weekly_users: 1});
    api.getLinkRedirectMetrics.mockResolvedValue({week: {}, month: {}});
    api.getMtsLinks.mockResolvedValue({status: 200, data: {links: {
        first: 'https://example.com/first', second: 'https://example.com/second',
    }}});
    api.saveLinkToEvent.mockResolvedValue({status: 200});
    render(<ModeusDaySchedulePage />);
    fireEvent.change(screen.getByLabelText(/Выберите дату/), {target: {value: '2026-10-12'}});
    const save = await screen.findByRole('button', {name: /Сохранить все ссылки/});
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await screen.findByText(/Сгенерированное сообщение/);
    const message = screen.getAllByRole('textbox').find(input => input.readOnly).value;
    expect(message).toContain('**12 октября, понедельник**: \n');
    expect(message).toContain('**09:00 (мск)**');
    expect(message).toContain('**11:00 (мск)**');
    expect(message.indexOf('Математика')).toBeLessThan(message.indexOf('Физика'));
    expect(message).toContain('https://yetanothercalendar.ru/api/mts/first\n');
    expect(message).toContain('https://yetanothercalendar.ru/api/mts/second\n');
    expect(message).not.toContain('https://example.com/');
    expect(api.saveLinkToEvent).toHaveBeenCalledTimes(2);
});
