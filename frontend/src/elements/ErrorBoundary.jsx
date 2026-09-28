import React from 'react';
import { debug } from '../utils/debug';

/**
 * Предохранитель: ошибка рендера внутри не снимает всю страницу (белый экран),
 * а прячет только этот кусок. Смена resetKey (например, выбранного события)
 * дает куску новый шанс; key для этого не подходит — он пересоздал бы
 * компонент и сбил анимацию.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error, info) {
        debug.error('Ошибка отрисовки, блок скрыт:', error, info?.componentStack);
    }

    componentDidUpdate(prevProps) {
        if (this.state.failed && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ failed: false });
        }
    }

    render() {
        return this.state.failed ? null : this.props.children;
    }
}

export default ErrorBoundary;
