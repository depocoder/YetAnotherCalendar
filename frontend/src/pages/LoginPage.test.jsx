import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './LoginPage';
import * as api from '../services/api';

jest.mock('axios', () => ({interceptors: {response: {use: jest.fn()}}}));

jest.mock('../services/api', () => ({
    ...jest.requireActual('../services/api'),
    loginNetology: jest.fn(), loginLms: jest.fn(), getModeusPersonId: jest.fn(),
    getNetologyCourses: jest.fn(), getNetologyCourse: jest.fn(),
    getVaultStatus: jest.fn(), refreshVaultSession: jest.fn(), getServicesHealth: jest.fn(),
}));

const personId = '00000000-0000-0000-0000-000000000000';
function renderLogin() {
    render(<MemoryRouter initialEntries={['/login']}><Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Открыт календарь</div>} />
    </Routes></MemoryRouter>);
}
function submit(email) {
    fireEvent.change(screen.getByPlaceholderText(/Email/), {target: {value: email}});
    fireEvent.change(screen.getByPlaceholderText('Пароль'), {target: {value: 'password'}});
    fireEvent.click(screen.getByRole('button', {name: /Далее|Войти/}));
}

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    api.getVaultStatus.mockResolvedValue({active: false});
    api.getServicesHealth.mockResolvedValue({status: 'degraded', services: [{
        service: 'netology', status: 'degraded',
        windows: {'1h': {ok: 1, errors: {timeout: 2}}, '24h': {ok: 3, errors: {timeout: 4}}},
    }]});
});

test('without remember-me, a Netology outage leaves the previous calendar accessible', async () => {
    localStorage.setItem('modeus_person_id', personId);
    localStorage.setItem('calendarIds', '[45526]');
    api.loginNetology.mockResolvedValue({status: 503});
    renderLogin();
    await screen.findByPlaceholderText('Email от Нетологии');
    expect(await screen.findByText('таймаут')).toBeInTheDocument();
    submit('user@example.com');
    expect(await screen.findByText(/Нетология сейчас не отвечает/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Открыть сохраненное расписание'}));
    expect(await screen.findByText('Открыт календарь')).toBeInTheDocument();
    expect(api.refreshVaultSession).not.toHaveBeenCalled();
});

test('a Modeus outage does not replace the previous account with the first login step', async () => {
    localStorage.setItem('modeus_person_id', personId);
    localStorage.setItem('calendarIds', '[45526]');
    localStorage.setItem('token', 'previous-session');
    api.loginNetology.mockResolvedValue({status: 200, data: {'_netology-on-rails_session': 'new-session'}});
    api.getNetologyCourses.mockResolvedValue({programs: [{id: 70685}]});
    api.getModeusPersonId.mockResolvedValue({status: 502});
    renderLogin();
    await screen.findByPlaceholderText('Email от Нетологии');
    submit('new@example.com');
    await screen.findByPlaceholderText('Email @study.utmn.ru');
    submit('new@study.utmn.ru');
    expect(await screen.findByText(/Модеус сейчас не отвечает/)).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBe('previous-session');
    expect(localStorage.getItem('calendarIds')).toBe('[45526]');
    expect(localStorage.getItem('modeus_person_id')).toBe(personId);
});

test('a remembered browser recovers calendar coordinates when localStorage was cleared', async () => {
    api.getVaultStatus.mockResolvedValue({active: true, broken: false, modeus_person_id: personId, calendar_ids: [45526]});
    api.refreshVaultSession.mockRejectedValue({response: {status: 503}});
    renderLogin();
    expect(await screen.findByText('Открыт календарь')).toBeInTheDocument();
    expect(localStorage.getItem('modeus_person_id')).toBe(personId);
    expect(localStorage.getItem('calendarIds')).toBe('[45526]');
    expect(localStorage.getItem('token')).toBeNull();
});

test('a first visit offers login rather than an unidentified cache', async () => {
    api.loginNetology.mockResolvedValue({status: 503});
    renderLogin();
    await screen.findByPlaceholderText('Email от Нетологии');
    submit('user@example.com');
    expect(await screen.findByText(/Для первого входа/)).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Открыть сохраненное расписание'})).not.toBeInTheDocument();
});

test('a vault outage preserves the same user current course selection for cache lookup', async () => {
    localStorage.setItem('modeus_person_id', personId);
    localStorage.setItem('calendarIds', '[70685]');
    api.getVaultStatus.mockResolvedValue({active: true, broken: false, modeus_person_id: personId, calendar_ids: [45526]});
    api.refreshVaultSession.mockRejectedValue({response: {status: 503}});
    renderLogin();
    expect(await screen.findByText('Открыт календарь')).toBeInTheDocument();
    expect(localStorage.getItem('calendarIds')).toBe('[70685]');
});

test('a vault for another user replaces course selection and clears old tokens', async () => {
    localStorage.setItem('modeus_person_id', '11111111-1111-1111-1111-111111111111');
    localStorage.setItem('calendarIds', '[70685]');
    localStorage.setItem('token', 'previous-session');
    api.getVaultStatus.mockResolvedValue({active: true, broken: false, modeus_person_id: personId, calendar_ids: [45526]});
    api.refreshVaultSession.mockRejectedValue({response: {status: 503}});
    renderLogin();
    expect(await screen.findByText('Открыт календарь')).toBeInTheDocument();
    expect(localStorage.getItem('calendarIds')).toBe('[45526]');
    expect(localStorage.getItem('token')).toBeNull();
});

test('a successful vault refresh preserves course selection for the same user', () => {
    localStorage.setItem('modeus_person_id', personId);
    localStorage.setItem('calendarIds', '[70685]');
    api.applyVaultSession({modeus_person_id: personId, calendar_ids: [45526],
        netology_session: 'new-session', lms_id: 1, lms_token: 'new-lms-session'});
    expect(localStorage.getItem('calendarIds')).toBe('[70685]');
    expect(localStorage.getItem('token')).toBe('new-session');
});

test('a vault refresh restores courses for a different user or empty storage', () => {
    localStorage.setItem('modeus_person_id', '11111111-1111-1111-1111-111111111111');
    localStorage.setItem('calendarIds', '[70685]');
    const session = {modeus_person_id: personId, calendar_ids: [45526],
        netology_session: 'new-session', lms_id: 1, lms_token: 'new-lms-session'};
    api.applyVaultSession(session);
    expect(localStorage.getItem('calendarIds')).toBe('[45526]');
    localStorage.removeItem('calendarIds');
    localStorage.removeItem('calendarId');
    api.applyVaultSession(session);
    expect(localStorage.getItem('calendarIds')).toBe('[45526]');
});
