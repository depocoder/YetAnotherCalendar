import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Logo from '../components/Logo';
import {
    getVaultStatus,
    forgetMe,
    getIcsSubscriptionUrlLocalStorage,
    setIcsSubscriptionUrlLocalStorage,
    deleteIcsSubscription
} from '../services/api';
import '../style/privacy.scss';

const GITHUB_URL = 'https://github.com/depocoder/YetAnotherCalendar';

/**
 * Живой блок управления своими данными: статус «Запомнить меня» и подписки
 * с кнопками удаления прямо здесь.
 */
const MyDataCard = () => {
    const [vault, setVault] = useState(null);
    const [subscriptionUrl, setSubscriptionUrl] = useState(() => getIcsSubscriptionUrlLocalStorage());
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        getVaultStatus().then(setVault);
    }, []);

    const handleForget = async () => {
        setBusy(true);
        await forgetMe();
        setVault({ active: false });
        setBusy(false);
        toast.info('Сохраненные данные удалены с сервера.');
    };

    const handleDeleteSubscription = async () => {
        setBusy(true);
        const response = await deleteIcsSubscription(subscriptionUrl);
        setBusy(false);
        if (response?.status === 200 || response?.status === 404) {
            setIcsSubscriptionUrlLocalStorage(null);
            setSubscriptionUrl(null);
            toast.info('Подписка и её данные удалены с сервера.');
        } else {
            toast.error('Не удалось удалить подписку. Попробуйте позже.');
        }
    };

    return (
        <div className="privacy-page__card privacy-page__card--live">
            <h2>🧭 Ваши данные на этом устройстве</h2>
            <div className="privacy-page__data-row">
                <span>
                    «Запомнить меня»:{' '}
                    {vault === null ? '…' : vault.active
                        ? (vault.broken ? '⚠️ сохранено, но пароль изменился' : '✅ включено')
                        : '⬜ не включено'}
                </span>
                {vault?.active && (
                    <button onClick={handleForget} disabled={busy}>Забыть меня</button>
                )}
            </div>
            <div className="privacy-page__data-row">
                <span>Подписка на календарь: {subscriptionUrl ? '✅ создана' : '⬜ не создана'}</span>
                {subscriptionUrl && (
                    <button onClick={handleDeleteSubscription} disabled={busy}>Удалить подписку</button>
                )}
            </div>
            <p className="privacy-page__data-note">
                Кнопки удаляют данные с сервера безвозвратно. То же самое делает
                «Выйти» на странице календаря.
            </p>
        </div>
    );
};

const PrivacyPage = () => (
    <div className="privacy-page">
        <div className="privacy-page__hero">
            <div className="privacy-page__brand">
                <Logo size={26} light />
                <b>YetAnotherCalendar</b>
            </div>
            <h1>Как устроена защита ваших данных</h1>
            <p>
                Мы делаем расписание, а не собираем данные. Здесь — честное и подробное
                описание того, что происходит с вашими логинами, паролями и токенами
                на каждом шаге.
            </p>
        </div>

        <main className="privacy-page__main">
            <div className="privacy-page__card">
                <h2>🔑 Что происходит при входе</h2>
                <p>
                    Вы вводите логины и пароли от Нетологии и Модеуса. Мы <b>не записываем
                    их</b> — каждый пароль сразу уходит в соответствующий сервис по HTTPS,
                    а взамен возвращаются <b>временные токены сессий</b>. При обычном входе
                    эти токены хранятся <b>только в вашем браузере</b> и приходят на сервер
                    с каждым запросом — на сервере они не сохраняются ни в кэше, ни где-либо
                    еще, доступа к ним у нас нет.
                </p>
                <div className="privacy-page__flow">
                    <span>Ваш браузер</span><i>→</i>
                    <span>Наш сервер (не сохраняет пароль)</span><i>→</i>
                    <span>Нетология / Модеус</span><i>→</i>
                    <span>Временный токен</span>
                </div>
                <p>
                    Сервисы проверяются по очереди, поэтому при опечатке мы точно скажем,
                    какой из паролей не подошел.
                </p>
            </div>

            <div className="privacy-page__card">
                <h2>🛡 Как работает «Запомнить меня»</h2>
                <p>
                    Токены сервисов живут от одного дня до недели. Чтобы не вводить пароли
                    заново, вы можете <b>по желанию</b> включить «Запомнить меня» — и вот
                    как это устроено внутри:
                </p>
                <ol>
                    <li>Ваши данные для входа шифруются алгоритмом <b>AES-256-GCM</b> одноразовым случайным ключом.</li>
                    <li>Этот ключ <b>не хранится на сервере</b>. Он «заворачивается» секретом, который выдается вашему браузеру в защищенной httpOnly-cookie (ее не может прочитать даже JavaScript на странице).</li>
                    <li>Когда токен истекает, браузер предъявляет секрет — сервер на лету расшифровывает данные в памяти, обновляет сессию и сразу «забывает» расшифрованное.</li>
                </ol>
                <p>
                    Это схема «ключ у клиента»: <b>копия нашей базы данных бесполезна</b> —
                    в ней только шифротекст. А смена пароля в Нетологии автоматически делает
                    сохраненные данные недействительными.
                </p>
                <div className="privacy-page__note">
                    То же самое касается подписки на календарь по URL: ключ расшифровки
                    встроен в вашу персональную ссылку и нигде больше не существует. Секреты
                    ссылок дополнительно вычищаются из всех серверных логов — их не видит
                    даже разработчик.
                </div>
            </div>

            <div className="privacy-page__card">
                <h2>📦 Что мы храним на самом деле</h2>
                <table>
                    <thead>
                        <tr><th>Данные</th><th>Зачем</th><th>Сколько живут</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Анонимный хэш идентификатора</td><td>Счетчик недельной аудитории (SHA-256, восстановить личность нельзя)</td><td>7 дней</td></tr>
                        <tr><td>Кэш расписания</td><td>Быстрая загрузка календаря</td><td>до 14 дней</td></tr>
                        <tr><td>Временные токены сессий</td><td>Только при включенном «Запомнить меня» или подписке — чтобы продлевать сессию без вас. При обычном входе токены живут только в вашем браузере</td><td>до 20 часов</td></tr>
                        <tr><td>Зашифрованные данные входа</td><td>Только при включенном «Запомнить меня» или подписке; ключ — у вас</td><td>90 дней без использования, затем автоудаление</td></tr>
                    </tbody>
                </table>
                <p>
                    Email, имена, история посещений, телеметрия, аналитика третьих
                    сторон — <b>не собираются вовсе</b>.
                </p>
            </div>

            <MyDataCard />

            <div className="privacy-page__card">
                <h2>🗑 Как все удалить</h2>
                <p>
                    Кнопки в блоке выше и кнопка <b>«Выйти»</b> в календаре удаляют
                    зашифрованные данные и все связанные с ними ключи безвозвратно.
                    Остальное (кэш, токены, хэш счетчика) истекает само по расписанию из
                    таблицы выше — никаких действий не требуется.
                </p>
            </div>

            <div className="privacy-page__card">
                <h2>🌍 Почему нам можно верить</h2>
                <p>
                    Проект полностью с открытым исходным кодом: каждый описанный здесь
                    механизм можно проверить в репозитории — от шифрования до счетчика
                    пользователей. Нашли слабое место? Откройте issue, мы быстро чиним.
                </p>
            </div>
        </main>
        <p className="privacy-page__foot">
            Исходный код:{' '}
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                github.com/depocoder/YetAnotherCalendar ↗
            </a>
        </p>
    </div>
);

export default PrivacyPage;
