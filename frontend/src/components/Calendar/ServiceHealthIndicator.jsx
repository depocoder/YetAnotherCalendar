import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getServicesHealth } from '../../services/api';
import { debug } from '../../utils/debug';
import '../../style/service-health.scss';

const POLL_INTERVAL_MS = 60 * 1000;

const SERVICE_LABELS = {
    netology: 'Нетология',
    modeus: 'Модеус',
    lms: 'LMS ТюмГУ',
};

const STATUS_LABELS = {
    ok: 'работает',
    degraded: 'сбоит',
    down: 'недоступен',
    unknown: 'нет данных',
};

const OVERALL_LABELS = {
    ok: 'Сервисы работают',
    degraded: 'Есть сбои',
    down: 'Сервис недоступен',
    unknown: 'Статус сервисов',
};

const ERROR_LABELS = {
    timeout: 'таймаут',
    network: 'нет связи',
    format: 'странный ответ',
    other: 'другая ошибка',
};

const plural = (count, forms) => {
    const n = Math.abs(count) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return forms[2];
    if (n1 > 1 && n1 < 5) return forms[1];
    if (n1 === 1) return forms[0];
    return forms[2];
};

const formatCount = (count) => (count || 0).toLocaleString('ru-RU');

const formatErrorKey = (key) => {
    if (ERROR_LABELS[key]) return ERROR_LABELS[key];
    return /^\d+$/.test(key) ? `HTTP ${key}` : key;
};

const formatLatency = (ms) => {
    if (ms === null || ms === undefined) return null;
    if (ms >= 1000) return `${(ms / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} с`;
    return `${ms} мс`;
};

const formatTime = (date) => date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

const sumErrors = (window) => Object.values(window?.errors || {}).reduce((total, count) => total + count, 0);

const WindowLine = ({ label, window }) => {
    const ok = window?.ok || 0;
    const bad = sumErrors(window);
    const latency = formatLatency(window?.avg_latency_ms);
    if (ok === 0 && bad === 0) {
        return (
            <div className="service-health__stat">
                <dt>{label}</dt>
                <dd className="service-health__muted">обращений не было</dd>
            </div>
        );
    }
    return (
        <div className="service-health__stat">
            <dt>{label}</dt>
            <dd>
                <span className="service-health__ok">{formatCount(ok)}</span>
                {' '}{plural(ok, ['успешное', 'успешных', 'успешных'])}
                {bad > 0 && (
                    <>
                        {' · '}
                        <span className="service-health__bad">{formatCount(bad)}</span>
                        {' '}{plural(bad, ['ошибка', 'ошибки', 'ошибок'])}
                    </>
                )}
                {latency && <span className="service-health__latency"> · ~{latency}</span>}
            </dd>
        </div>
    );
};

const ServiceRow = ({ service }) => {
    const hour = service.windows?.['1h'];
    const day = service.windows?.['24h'];
    const hourOk = hour?.ok || 0;
    const hourBad = sumErrors(hour);
    const hourTotal = hourOk + hourBad;
    const okShare = hourTotal > 0 ? (hourOk / hourTotal) * 100 : 0;
    const chips = Object.entries(hour?.errors || {}).sort((a, b) => b[1] - a[1]);
    const authCount = hour?.auth || 0;

    return (
        <div className={`service-health__row service-health__row--${service.status}`}>
            <div className="service-health__row-head">
                <span className="service-health__dot service-health__dot--small" aria-hidden="true" />
                <span className="service-health__name">{SERVICE_LABELS[service.service] || service.service}</span>
                <span className="service-health__state">{STATUS_LABELS[service.status] || service.status}</span>
            </div>
            <div
                className={`service-health__bar ${hourTotal === 0 ? 'service-health__bar--empty' : ''}`}
                role="img"
                aria-label={hourTotal > 0 ? `${Math.round(okShare)}% успешных обращений за час` : 'За час обращений не было'}
            >
                <span className="service-health__bar-ok" style={{ width: `${okShare}%` }} />
            </div>
            <dl className="service-health__stats">
                <WindowLine label="за час" window={hour} />
                <WindowLine label="за сутки" window={day} />
            </dl>
            {chips.length > 0 && (
                <div className="service-health__chips">
                    {chips.map(([key, count]) => (
                        <span key={key} className="service-health__chip">
                            {formatErrorKey(key)} <b>×{formatCount(count)}</b>
                        </span>
                    ))}
                </div>
            )}
            {authCount > 0 && (
                <div className="service-health__note">
                    {formatCount(authCount)} {plural(authCount, ['истекшая сессия', 'истекшие сессии', 'истекших сессий'])} за час — это не сбой сервиса
                </div>
            )}
        </div>
    );
};

/**
 * Индикатор жизни Нетологии, Модеуса и LMS.
 *
 * Точка горит зеленым, когда все сервисы отвечают, желтым при сбоях и
 * красным, когда сервис лежит. Ховер на десктопе (тап на мобильных)
 * раскрывает статистику: сколько обращений прошло и сколько упало за час
 * и за сутки, с разбивкой по кодам ошибок. Данные анонимные: бэкенд
 * хранит только счетчики.
 *
 * refreshKey — любое значение, смена которого перезапрашивает статус
 * (например, cached_at только что загруженного расписания).
 */
const ServiceHealthIndicator = ({ refreshKey }) => {
    const [health, setHealth] = useState(null);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const closeTimerRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const data = await getServicesHealth();
            setHealth(data);
            setUpdatedAt(new Date());
        } catch (error) {
            debug.error('Не удалось получить статус сервисов:', error);
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(load, POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [load, refreshKey]);

    // Закрытие по клику вне индикатора и по Escape (актуально для тапа на мобильных)
    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const openPopover = () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        setOpen(true);
    };

    const scheduleClose = () => {
        closeTimerRef.current = setTimeout(() => setOpen(false), 150);
    };

    const overall = health?.status || 'unknown';
    const label = OVERALL_LABELS[overall];

    return (
        <div
            ref={rootRef}
            className={`service-health service-health--${overall} ${open ? 'service-health--open' : ''}`}
            onMouseEnter={openPopover}
            onMouseLeave={scheduleClose}
        >
            <button
                type="button"
                className="service-health__pill"
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={`Состояние сервисов: ${label}`}
                title={label}
                onClick={() => setOpen(prev => !prev)}
                onFocus={openPopover}
            >
                <span className="service-health__dot" aria-hidden="true" />
                <span className="service-health__text">{label}</span>
            </button>
            {open && <div className="service-health__backdrop" onClick={() => setOpen(false)} />}
            <div className="service-health__popover" role="dialog" aria-label="Состояние сервисов">
                <div className="service-health__header">
                    <span className="service-health__title">Состояние сервисов</span>
                    <span className="service-health__updated">
                        {updatedAt ? `обновлено в ${formatTime(updatedAt)}` : 'загружаем…'}
                    </span>
                </div>
                {health ? (
                    <div className="service-health__rows">
                        {health.services.map(service => (
                            <ServiceRow key={service.service} service={service} />
                        ))}
                    </div>
                ) : (
                    <div className="service-health__empty">Собираем статистику…</div>
                )}
                <div className="service-health__footer">
                    Считаем обращения к сервисам со всего сайта: статус — по последним 15 минутам.
                    Никаких данных о пользователях не храним.
                </div>
            </div>
        </div>
    );
};

export default ServiceHealthIndicator;
