import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
    createIcsSubscription,
    deleteIcsSubscription,
    getIcsSubscriptionUrlLocalStorage,
    setIcsSubscriptionUrlLocalStorage,
    getModeusPersonIdFromLocalStorage,
    getVaultStatus
} from '../../services/api';
import InlineLoader from '../../elements/InlineLoader';
import { debug } from '../../utils/debug';
import '../../style/subscription-modal.scss';

/**
 * Модальное окно ICS-подписки по URL.
 *
 * Пользователь вводит логины и пароли, сервер хранит их только в
 * зашифрованном виде, а ключ расшифровки живет в самой ссылке подписки.
 */
const SubscriptionModal = ({ isOpen, onClose, courses, selectedIds }) => {
    const [netologyLogin, setNetologyLogin] = useState('');
    const [netologyPassword, setNetologyPassword] = useState('');
    const [modeusLogin, setModeusLogin] = useState('');
    const [modeusPassword, setModeusPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [subscriptionUrl, setSubscriptionUrl] = useState(() => getIcsSubscriptionUrlLocalStorage());
    const [copied, setCopied] = useState(false);
    const [vaultActive, setVaultActive] = useState(false);

    // Если браузер «запомнен» — подписку можно создать без паролей.
    useEffect(() => {
        if (!isOpen) return;
        getVaultStatus().then(vault => setVaultActive(Boolean(vault?.active && !vault.broken)));
    }, [isOpen]);

    if (!isOpen) return null;

    const selectedCourses = (courses || []).filter(course => (selectedIds || []).includes(course.id));

    const handleCreate = async (useVault = false) => {
        if (!useVault && (!netologyLogin || !netologyPassword || !modeusLogin || !modeusPassword)) {
            toast.error('Заполните логины и пароли обоих сервисов.');
            return;
        }
        if (!selectedIds || selectedIds.length === 0) {
            toast.error('Сначала выберите курсы в «Мои курсы».');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                calendar_ids: selectedIds,
                time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
            if (!useVault) {
                payload.netology = { username: netologyLogin, password: netologyPassword };
                payload.lxp = { username: modeusLogin, password: modeusPassword, service: 'test' };
                payload.modeus_person_id = getModeusPersonIdFromLocalStorage();
            }
            const response = await createIcsSubscription(payload);

            if (response?.status === 200 && response.data?.url) {
                setSubscriptionUrl(response.data.url);
                setIcsSubscriptionUrlLocalStorage(response.data.url);
                setNetologyPassword('');
                setModeusPassword('');
                toast.success('Подписка создана!');
            } else if (response?.status === 401) {
                toast.error('Неверный логин или пароль.');
            } else if (response?.status === 429) {
                toast.error('Слишком много попыток. Попробуйте позже.');
            } else if (response?.status === 503) {
                toast.error('Подписки не настроены на сервере.');
            } else {
                debug.error('Ошибка создания подписки:', response);
                toast.error('Не удалось создать подписку. Попробуйте позже.');
            }
        } catch (error) {
            debug.error('Ошибка создания подписки:', error);
            toast.error('Ошибка сети. Попробуйте позже.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(subscriptionUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            toast.error('Не удалось скопировать. Выделите ссылку вручную.');
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            const response = await deleteIcsSubscription(subscriptionUrl);
            if (response?.status === 200 || response?.status === 404) {
                setSubscriptionUrl(null);
                setIcsSubscriptionUrlLocalStorage(null);
                toast.info('Подписка удалена: данные стерты с сервера.');
            } else {
                toast.error('Не удалось удалить подписку. Попробуйте позже.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="subscription-overlay" onClick={onClose}>
            <div className="subscription-modal" onClick={(e) => e.stopPropagation()}>
                <div className="subscription-header">
                    <div>
                        <h2>🔗 Подписка по URL</h2>
                        <p className="subscription-subtitle">
                            Расписание само обновляется в Google, Apple или Outlook календаре
                        </p>
                    </div>
                    <button className="subscription-close" onClick={onClose} title="Закрыть">×</button>
                </div>

                <div className="subscription-body">
                    {subscriptionUrl ? (
                        <>
                            <p className="subscription-hint">
                                Вставьте эту ссылку в календарь: Google&nbsp;Календарь&nbsp;→ «Добавить
                                календарь&nbsp;→ По&nbsp;URL», Apple&nbsp;Календарь&nbsp;→ «Файл&nbsp;→ Новая
                                подписка на календарь».
                            </p>
                            <div className="subscription-url-row">
                                <input className="subscription-url" readOnly value={subscriptionUrl} onFocus={e => e.target.select()} />
                                <button className="subscription-copy-btn" onClick={handleCopy}>
                                    {copied ? '✓ Скопировано' : 'Копировать'}
                                </button>
                            </div>
                            <div className="subscription-policy">
                                <span className="subscription-policy-icon">🔐</span>
                                <p>
                                    Ссылка — единственный ключ к вашей подписке, мы не сможем показать её
                                    повторно. Если ссылка утекла или вы передумали — удалите подписку,
                                    и все данные будут стерты с сервера.
                                </p>
                            </div>
                            <button className="subscription-delete-btn" onClick={handleDelete} disabled={loading}>
                                {loading ? <InlineLoader /> : 'Удалить подписку и данные с сервера'}
                            </button>
                        </>
                    ) : (
                        <div>
                            {vaultActive && (
                                <div className="subscription-vault-offer">
                                    <p>
                                        ⚡ Вы включили «Запомнить меня» — подписку можно создать
                                        по сохраненным данным, без повторного ввода паролей.
                                    </p>
                                    <button
                                        className="subscription-create-btn" type="button"
                                        onClick={() => handleCreate(true)} disabled={loading}
                                    >
                                        {loading ? <InlineLoader /> : 'Создать подписку в один клик'}
                                    </button>
                                    <div className="subscription-vault-divider">или введите данные вручную</div>
                                </div>
                            )}
                            <div className="subscription-policy">
                                <span className="subscription-policy-icon">🔐</span>
                                <p>
                                    Чтобы календарь обновлялся сам, серверу нужно продлевать сессии
                                    Нетологии и LMS — их токены живут от дня до недели. Для этого мы
                                    сохраняем ваши логины и пароли, но <strong>только в зашифрованном
                                    виде (AES-256)</strong>. Ключ расшифровки не хранится на сервере —
                                    он встроен в вашу персональную ссылку подписки. Даже полная копия
                                    нашей базы не позволит прочитать ваши пароли. Подписку можно
                                    удалить в любой момент — данные будут стерты безвозвратно.
                                </p>
                            </div>

                            {selectedCourses.length > 0 && (
                                <div className="subscription-courses">
                                    <span className="subscription-courses-label">В подписку войдут курсы:</span>
                                    <ul>
                                        {selectedCourses.map(course => (
                                            <li key={course.id}>{course.title?.trim()}</li>
                                        ))}
                                    </ul>
                                    <span className="subscription-courses-note">
                                        Набор курсов меняется в «📚 Мои курсы» (пересоздайте подписку после изменения).
                                    </span>
                                </div>
                            )}

                            {/* Отдельные формы: браузер подбирает сохраненную пару
                                логин/пароль для каждой формы независимо. */}
                            <form onSubmit={e => e.preventDefault()}>
                                <fieldset className="subscription-fieldset">
                                    <legend>Нетология</legend>
                                    <input
                                        type="email" required placeholder="Email от Нетологии"
                                        value={netologyLogin} onChange={e => setNetologyLogin(e.target.value)}
                                        autoComplete="username"
                                    />
                                    <input
                                        type="password" required placeholder="Пароль от Нетологии"
                                        value={netologyPassword} onChange={e => setNetologyPassword(e.target.value)}
                                        autoComplete="current-password"
                                    />
                                </fieldset>
                            </form>

                            <form onSubmit={e => e.preventDefault()}>
                                <fieldset className="subscription-fieldset">
                                    <legend>Модеус / LMS</legend>
                                    <input
                                        type="email" required placeholder="Email @study.utmn.ru"
                                        value={modeusLogin} onChange={e => setModeusLogin(e.target.value)}
                                        autoComplete="username"
                                    />
                                    <input
                                        type="password" required placeholder="Пароль от Модеус"
                                        value={modeusPassword} onChange={e => setModeusPassword(e.target.value)}
                                        autoComplete="current-password"
                                    />
                                </fieldset>
                            </form>

                            <button
                                className="subscription-create-btn" type="button"
                                onClick={() => handleCreate(false)} disabled={loading}
                            >
                                {loading ? <InlineLoader /> : 'Создать ссылку подписки'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubscriptionModal;
