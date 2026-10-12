import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
async function renderLogin() {
    await act(async () => render(<MemoryRouter initialEntries={['/login']}><Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Открыт календарь</div>} />
    </Routes></MemoryRouter>));
}
async function submit(email) {
    await act(async () => {
        fireEvent.change(screen.getByPlaceholderText(/Email/), {target: {value: email}});
        fireEvent.change(screen.getByPlaceholderText('Пароль'), {target: {value: 'password'}});
        fireEvent.click(screen.getByRole('button', {name: /Далее|Войти/}));
    });
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
    await renderLogin();
    await screen.findByPlaceholderText('Email от Нетологии');
    expect(await screen.findByText('таймаут')).toBeInTheDocument();
    await submit('user@example.com');
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
    await renderLogin();
    await screen.findByPlaceholderText('Email от Нетологии');
    await submit('new@example.com');
    await screen.findByPlaceholderText('Email @study.utmn.ru');
    await submit('new@study.utmn.ru');
    expect(await screen.findByText(/Модеус сейчас не отвечает/)).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBe('previous-session');
    expect(localStorage.getItem('calendarIds')).toBe('[45526]');
    expect(localStorage.getItem('modeus_person_id')).toBe(personId);
});

test('a remembered browser recovers calendar coordinates when localStorage was cleared', async () => {
    api.getVaultStatus.mockResolvedValue({active: true, broken: false, modeus_person_id: personId, calendar_ids: [45526]});
    api.refreshVaultSession.mockRejectedValue({response: {status: 503}});
    await renderLogin();
    expect(await screen.findByText('Открыт календарь')).toBeInTheDocument();
    expect(localStorage.getItem('modeus_person_id')).toBe(personId);
    expect(localStorage.getItem('calendarIds')).toBe('[45526]');
    expect(localStorage.getItem('token')).toBeNull();
});

test('a first visit offers login rather than an unidentified cache', async () => {
    api.loginNetology.mockResolvedValue({status: 503});
    await renderLogin();
    await screen.findByPlaceholderText('Email от Нетологии');
    await submit('user@example.com');
    await waitFor(() => expect(screen.getByText(/Для первого входа/)).toBeInTheDocument());
    expect(screen.queryByRole('button', {name: 'Открыть сохраненное расписание'})).not.toBeInTheDocument();
});
