import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    loginNetology,
    loginLms,
    getModeusPersonId,
    getNetologyCourse,
    getNetologyCourses,
    defaultCalendarIds,
    setCalendarIdsLocalStorage,
    setNetologyCoursesLocalStorage,
    rememberMe,
    getVaultStatus,
    refreshVaultSession,
    applyVaultSession
} from '../services/api';
import Logo from '../components/Logo';
import InlineLoader from '../elements/InlineLoader';
import { debug } from '../utils/debug';
import { handleApiError } from '../utils/errorHandler';
import '../style/login-v2.scss';

const GITHUB_URL = 'https://github.com/depocoder/YetAnotherCalendar';
const PERSON_ID_RE = /^[0-9a-fA-F-]{16,64}$/;

/**
 * Вход: один экран, шаговый мастер (1 — Нетология, 2 — Модеус/LMS).
 * Сервисы проверяются по очереди, ошибка подсвечивает конкретный шаг.
 * «Запомнить меня» сохраняет креды в зашифрованный vault после успеха
 * обоих шагов (ключ — в httpOnly-cookie браузера).
 */
const LoginPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // Выключено по умолчанию (opt-in), но однажды включенное запоминается:
    // выбор переживает выход из аккаунта (persistent-ключ localStorage).
    const [remember, setRemember] = useState(
        () => localStorage.getItem('rememberMeChoice') === 'true',
    );

    const handleRememberChange = (checked) => {
        setRemember(checked);
        localStorage.setItem('rememberMeChoice', String(checked));
    };
    const [loading, setLoading] = useState(false);
    const [restoring, setRestoring] = useState(true);
    // Креды Нетологии держим в памяти до конца второго шага — для vault.
    const [netologyCreds, setNetologyCreds] = useState(null);

    // Если браузер «запомнен» — восстанавливаем сессию без паролей.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const vault = await getVaultStatus();
                if (!cancelled && vault?.active && !vault.broken) {
                    const session = await refreshVaultSession();
                    if (cancelled) return;
                    applyVaultSession(session);
                    toast.success('С возвращением! Вход выполнен автоматически.');
                    navigate('/');
                    return;
                }
            } catch (e) {
                debug.log('Автовход через vault не удался:', e?.response?.status);
            }
            if (!cancelled) setRestoring(false);
        })();
        return () => { cancelled = true; };
    }, [navigate]);

    const handleNetologyStep = async () => {
        const response = await loginNetology(email, password);
        if (response?.status === 200) {
            const token = response.data['_netology-on-rails_session'];
            localStorage.setItem('token', token);

            // Все курсы пользователя: по умолчанию подгружаем каждый
            const coursesData = await getNetologyCourses(token);
            const programs = coursesData?.programs || [];
            if (programs.length > 0) {
                setNetologyCoursesLocalStorage(programs);
                setCalendarIdsLocalStorage(defaultCalendarIds(programs));
            } else {
                const courseData = await getNetologyCourse(token);
                if (courseData?.id) {
                    setCalendarIdsLocalStorage([courseData.id]);
                }
            }

            setNetologyCreds({ username: email, password });
            setEmail('');
            setPassword('');
            setStep(2);
            return;
        }
        if (response?.status === 401) {
            toast.error('Нетология: неверный логин или пароль.');
            return;
        }
        if (response?.status === 429) {
            toast.error('Слишком много попыток. Попробуйте позже.');
            return;
        }
        debug.error('Ошибка API Нетологии:', response);
        handleApiError({ response }, 'Ошибка при входе в Нетологию', navigate);
    };

    const handleModeusStep = async () => {
        if (!email.includes('@') || email.split('@').length - 1 !== 1) {
            toast.error('Email должен содержать один символ @.');
            return;
        }
        let [name, mail] = email.split('@');
        if (mail === 'utmn.ru') {
            mail = 'study.utmn.ru';
        }
        if (mail !== 'study.utmn.ru') {
            toast.error('Email должен содержать @study.utmn.ru.');
            return;
        }
        const modeusEmail = `${name}@${mail}`;

        const modeusResponse = await getModeusPersonId(modeusEmail, password);
        if (modeusResponse?.status === 429) {
            toast.error('Модеус: слишком много попыток. Попробуйте позже.');
            return;
        }
        if (modeusResponse?.status === 401) {
            toast.error('Модеус: неверный логин или пароль.');
            return;
        }
        if (!modeusResponse || modeusResponse.status >= 400) {
            debug.error('Ошибка API Modeus:', modeusResponse);
            handleApiError({ response: modeusResponse }, 'Ошибка при входе в Модеус', navigate);
            return;
        }

        const personId = modeusResponse.data;
        if (typeof personId !== 'string' || !PERSON_ID_RE.test(personId)) {
            debug.error('Некорректный person id от Modeus:', personId);
            toast.error('Не удалось получить идентификатор Модеус. Попробуйте позже.');
            return;
        }
        localStorage.setItem('modeus_person_id', personId);

        const lmsResponse = await loginLms(modeusEmail, password);
        if (lmsResponse?.status === 401) {
            toast.error('LMS: неверный логин или пароль.');
            return;
        }
        if (!lmsResponse || lmsResponse.status >= 400) {
            debug.error('Ошибка API LMS:', lmsResponse);
            handleApiError({ response: lmsResponse }, 'Ошибка при входе в LMS', navigate);
            return;
        }
        localStorage.setItem('lms-id', lmsResponse.data.id);
        localStorage.setItem('lms-token', lmsResponse.data.token);

        // Оба сервиса подтвердили креды — при желании запоминаем их в vault
        if (remember && netologyCreds) {
            const calendarIds = JSON.parse(localStorage.getItem('calendarIds') || '[]');
            const vaultResponse = await rememberMe({
                netology: netologyCreds,
                lxp: { username: modeusEmail, password, service: 'test' },
                modeus_person_id: personId,
                calendar_ids: calendarIds,
                time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone
            });
            if (vaultResponse?.status !== 200) {
                debug.error('Не удалось включить «Запомнить меня»:', vaultResponse?.status);
                // Вход при этом успешен — не блокируем пользователя.
            }
        }
        setNetologyCreds(null);
        navigate('/');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading) return;
        setLoading(true);
        try {
            if (step === 1) {
                await handleNetologyStep();
            } else {
                await handleModeusStep();
            }
        } catch (error) {
            debug.error('Ошибка при входе:', error);
            handleApiError(error, 'Ошибка при входе', navigate);
        } finally {
            setLoading(false);
        }
    };

    if (restoring) {
        return (
            <div className="login-v2 login-v2--restoring">
                <div className="login-v2__restore">
                    <Logo size={40} />
                    <p>Проверяем сохраненную сессию…</p>
                </div>
            </div>
        );
    }

    const isNetologyStep = step === 1;

    return (
        <div className="login-v2">
            <div className="login-v2__shell">
                <div className="login-v2__left">
                    <div className="login-v2__logo">
                        <Logo size={26} />
                        <b>YetAnotherCalendar</b>
                    </div>
                    <h1>Мое расписание</h1>
                    <p className="login-v2__sub">Нетология, Модеус и LMS — в одном календаре</p>

                    <div className="login-v2__steps">
                        <div className={`login-v2__step ${isNetologyStep ? '' : 'login-v2__step--done'}`}>
                            <span className="login-v2__step-n">{isNetologyStep ? '1' : '✓'}</span>Нетология
                        </div>
                        <div className="login-v2__line"><i style={{ width: isNetologyStep ? '45%' : '100%' }} /></div>
                        <div className={`login-v2__step ${isNetologyStep ? 'login-v2__step--next' : ''}`}>
                            <span className="login-v2__step-n">2</span>Модеус
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <input
                            type="email" required autoFocus
                            placeholder={isNetologyStep ? 'Email от Нетологии' : 'Email @study.utmn.ru'}
                            value={email} onChange={e => setEmail(e.target.value)}
                            autoComplete="username"
                        />
                        <input
                            type="password" required
                            placeholder="Пароль"
                            value={password} onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                        {isNetologyStep && (
                            <label className={`login-v2__remember ${remember ? '' : 'login-v2__remember--attract'}`}>
                                <input
                                    type="checkbox" checked={remember}
                                    onChange={e => handleRememberChange(e.target.checked)}
                                />
                                <span>
                                    Запомнить меня на этом устройстве
                                    <small>вход без паролей до 90 дней, данные зашифрованы</small>
                                </span>
                            </label>
                        )}
                        <button className="login-v2__btn" type="submit" disabled={loading}>
                            {loading ? <InlineLoader /> : (isNetologyStep ? 'Далее →' : 'Войти')}
                        </button>
                    </form>
                    <p className="login-v2__hint">
                        {isNetologyStep
                            ? 'Следующий шаг — вход в Модеус. Если пароль не подойдет, скажем об этом сразу.'
                            : 'Введите логин и пароль от Модеус, чтобы увидеть пары и дедлайны LMS.'}
                    </p>
                </div>

                <div className="login-v2__right">
                    <div className="login-v2__week">
                        <div className="login-v2__day"><b>Пн</b></div>
                        <div className="login-v2__day login-v2__day--busy"><b>Вт</b><span /></div>
                        <div className="login-v2__day"><b>Ср</b></div>
                        <div className="login-v2__day login-v2__day--busy"><b>Чт</b><span /></div>
                        <div className="login-v2__day login-v2__day--busy"><b>Пт</b><span /><span /></div>
                        <div className="login-v2__day"><b>Сб</b></div>
                        <div className="login-v2__day"><b>Вс</b></div>
                    </div>
                    <h2>🔐 Как мы защищаем ваши данные</h2>
                    <div className="login-v2__sec"><span className="login-v2__sec-i">🔑</span><span>Пароли не сохраняются: они уходят напрямую в Нетологию и Модеус, а временные токены сессий хранятся только в вашем браузере.</span></div>
                    <div className="login-v2__sec"><span className="login-v2__sec-i">🛡</span><span>«Запомнить меня» — по желанию. Данные шифруются AES-256, ключ остается только в вашем браузере: сервер физически не может их прочитать.</span></div>
                    <div className="login-v2__sec"><span className="login-v2__sec-i">📡</span><span>Никакой телеметрии и передачи данных третьим лицам.</span></div>
                    <div className="login-v2__sec"><span className="login-v2__sec-i">🗑</span><span>«Выйти» мгновенно стирает все сохраненное.</span></div>
                    <div className="login-v2__sec"><span className="login-v2__sec-i">📊</span><span>Что мы все-таки храним: анонимный хэш вашего идентификатора (7 дней, счетчик аудитории) и кэш расписания (до 14 дней). Все.</span></div>
                    <div className="login-v2__links">
                        <a href="/privacy" target="_blank" rel="noopener noreferrer">🛡 Подробнее о защите данных ↗</a>
                        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">⭐ GitHub ↗</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
