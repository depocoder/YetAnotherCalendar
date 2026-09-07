import React from 'react';
import '../../style/logout-modal.scss';

/**
 * Подтверждение выхода, когда у пользователя есть подписка на календарь:
 * удалить ее вместе с выходом или оставить работать.
 */
const LogoutModal = ({ isOpen, onClose, onLogout }) => {
    if (!isOpen) return null;

    return (
        <div className="logout-modal-overlay" onClick={onClose}>
            <div className="logout-modal" onClick={e => e.stopPropagation()}>
                <h2>Выйти из аккаунта?</h2>
                <p>
                    Сохраненный вход («Запомнить меня») будет удален. У вас есть подписка
                    на календарь — решите, что с ней сделать:
                </p>
                <ul>
                    <li><b>Оставить</b> — события продолжат обновляться в Google/Яндекс календаре.</li>
                    <li><b>Удалить</b> — данные сотрутся с сервера, но подписку потом придется подключать во внешнем календаре заново.</li>
                </ul>
                <div className="logout-modal__actions">
                    <button
                        className="logout-modal__btn logout-modal__btn--keep"
                        onClick={() => onLogout({ deleteSubscription: false })}
                    >
                        Выйти, оставить подписку
                    </button>
                    <button
                        className="logout-modal__btn logout-modal__btn--delete"
                        onClick={() => onLogout({ deleteSubscription: true })}
                    >
                        Выйти и удалить подписку
                    </button>
                </div>
                <button className="logout-modal__cancel" onClick={onClose}>Отмена</button>
            </div>
        </div>
    );
};

export default LogoutModal;
