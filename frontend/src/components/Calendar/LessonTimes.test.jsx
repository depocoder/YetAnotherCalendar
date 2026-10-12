import React from 'react';
import { render, screen, within } from '@testing-library/react';
import LessonTimes from './LessonTimes';

jest.mock('./LessonMarks', () => () => null);

const event = {
    id: 'lesson', course_name: 'Математика', cycle_realization: {code: 'group'},
    start: '2026-10-12T00:30:00Z', end: '2026-10-12T02:00:00Z',
};
const calendar = lesson => ({utmn: {modeus_events: [lesson]}, netology: {webinars: []}});
const renderRows = events => (
    <table><tbody><LessonTimes events={events} setSelectedEvent={jest.fn()} /></tbody></table>
);

afterEach(() => jest.restoreAllMocks());

test('new calendar events replace the displayed week without repeated effects', () => {
    const {rerender} = render(renderRows(calendar(event)));
    expect(screen.getByText('Математика')).toBeInTheDocument();
    rerender(renderRows(calendar({...event, id: 'next', course_name: 'Физика'})));
    expect(screen.queryByText('Математика')).not.toBeInTheDocument();
    expect(screen.getByText('Физика')).toBeInTheDocument();
});

test('a timezone change repopulates weekdays even when the events object is unchanged', () => {
    const options = new Intl.DateTimeFormat().resolvedOptions();
    const resolvedOptions = jest.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions');
    resolvedOptions.mockReturnValue({...options, timeZone: 'Europe/Moscow'});
    const events = calendar(event);
    const {rerender} = render(renderRows(events));
    const dayCell = day => within(screen.getByRole('row', {name: /Особое время/})).getAllByRole('cell')[day];
    expect(within(dayCell(0)).getByText('Математика')).toBeInTheDocument();
    resolvedOptions.mockReturnValue({...options, timeZone: 'America/New_York'});
    rerender(renderRows(events));
    expect(within(dayCell(6)).getByText('Математика')).toBeInTheDocument();
    expect(within(dayCell(0)).queryByText('Математика')).not.toBeInTheDocument();
});
