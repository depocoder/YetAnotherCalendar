import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CalendarPage from './CalendarPage';
import PrivateRoute from '../elements/PrivateRoute';
import * as api from '../services/api';

jest.mock('axios', () => ({interceptors: {response: {use: jest.fn()}}}));

jest.mock('../services/api', () => ({
    ...jest.requireActual('../services/api'),
    bulkEvents: jest.fn(), refreshBulkEvents: jest.fn(), getNetologyCourses: jest.fn(),
    getServicesHealth: jest.fn(), getMtsLinks: jest.fn(), getGrades: jest.fn(),
}));
jest.mock('../components/Calendar/DataPicker', () => () => null);
jest.mock('../components/Calendar/SimpleDatePicker', () => ({setDate}) => (
    <button onClick={() => setDate({start: '2026-10-19', end: '2026-10-25'})}>Следующая неделя</button>
));

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.history.replaceState({}, '', '/?cache_only=true');
    localStorage.setItem('modeus_person_id', '00000000-0000-0000-0000-000000000000');
    localStorage.setItem('calendarIds', '[45526]');
    api.getServicesHealth.mockResolvedValue({status: 'unknown', services: []});
});

test('cached mode works without tokens and prevents refresh, grades and course changes', async () => {
    api.bulkEvents.mockResolvedValue({data: {
        cached_at: '2026-10-10T12:00:00Z', failures: [],
        netology: {homework: [], webinars: []}, utmn: {modeus_events: [], lms_events: []},
    }});
    render(<BrowserRouter><PrivateRoute><CalendarPage /></PrivateRoute></BrowserRouter>);
    await waitFor(() => expect(api.bulkEvents).toHaveBeenCalledTimes(1));
    expect(api.bulkEvents.mock.calls[0][0]).toMatchObject({cacheOnly: true, sessionToken: null, lxpToken: null});
    expect(await screen.findByText('Просмотр сохраненного расписания')).toBeInTheDocument();
    screen.getAllByRole('button', {name: 'Мои оценки'}).forEach(button => expect(button).toBeDisabled());
    screen.getAllByText('Сбросить кэш').forEach(button => expect(button).toBeDisabled());
    screen.getAllByText('Мои курсы').forEach(label => expect(label.closest('button')).toBeDisabled());
    expect(api.getNetologyCourses).not.toHaveBeenCalled();
    expect(api.getGrades).not.toHaveBeenCalled();
    expect(api.refreshBulkEvents).not.toHaveBeenCalled();
});

test('an uncached week shows an explanation and never triggers a live refresh', async () => {
    api.bulkEvents.mockResolvedValueOnce({data: {
        cached_at: '2026-10-10T12:00:00Z', netology: {homework: [], webinars: []},
        utmn: {modeus_events: [], lms_events: []},
    }}).mockRejectedValueOnce({response: {status: 404}});
    render(<BrowserRouter><CalendarPage /></BrowserRouter>);
    await waitFor(() => expect(api.bulkEvents).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('Следующая неделя'));
    expect(await screen.findByText(/Эта неделя не сохранена/)).toBeInTheDocument();
    expect(api.bulkEvents).toHaveBeenCalledTimes(2);
    expect(api.bulkEvents.mock.calls[1][0]).toMatchObject({cacheOnly: true, timeMin: '2026-10-19'});
    expect(api.refreshBulkEvents).not.toHaveBeenCalled();
});
