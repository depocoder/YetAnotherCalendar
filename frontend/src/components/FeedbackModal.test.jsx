import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import FeedbackModal from './FeedbackModal';

afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
});

test('Escape uses the latest callback and listeners are removed on close', () => {
    const previousClose = jest.fn();
    const currentClose = jest.fn();
    const {rerender} = render(<FeedbackModal isOpen onClose={previousClose} />);
    rerender(<FeedbackModal isOpen onClose={currentClose} />);
    fireEvent.keyDown(document, {key: 'Enter'});
    expect(currentClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, {key: 'Escape'});
    expect(previousClose).not.toHaveBeenCalled();
    expect(currentClose).toHaveBeenCalledTimes(1);
    rerender(<FeedbackModal isOpen={false} onClose={currentClose} />);
    fireEvent.keyDown(document, {key: 'Escape'});
    expect(currentClose).toHaveBeenCalledTimes(1);
});

test('scroll locking restores the previous overflow and leaves a closed modal alone', () => {
    document.body.style.overflow = 'scroll';
    const onClose = jest.fn();
    const {rerender, unmount} = render(<FeedbackModal isOpen={false} onClose={onClose} />);
    expect(document.body.style.overflow).toBe('scroll');
    rerender(<FeedbackModal isOpen onClose={onClose} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('scroll');
    fireEvent.keyDown(document, {key: 'Escape'});
    expect(onClose).not.toHaveBeenCalled();
});
