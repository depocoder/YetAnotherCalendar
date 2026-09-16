import React from 'react';

const SERVICE_LABELS = {
    netology: 'Нетология',
    modeus: 'Модеус (расписание ТюмГУ)',
    lms: 'LMS ТюмГУ (дедлайны)',
};

const formatCachedAt = (isoDate) => {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// Баннер о сервисах, которые не ответили, когда бэкенд собирал расписание.
// Ошибки авторизации сюда не попадают (на них фронт продлевает сессию),
// поэтому здесь всегда проблема на стороне самого сервиса.
// Данные упавшего сервиса либо взяты из кэша (тогда есть дата), либо их нет.
const ServiceStatusBanner = ({ failures, onRetry, retrying = false }) => {
    if (!Array.isArray(failures) || failures.length === 0) return null;

    return (
        <div className="service-status-banner" role="status">
            <div className="service-status-icon" aria-hidden="true">⚠️</div>
            <div className="service-status-body">
                <div className="service-status-title">
                    {failures.length === 1
                        ? 'Один из сервисов сейчас недоступен'
                        : 'Часть сервисов сейчас недоступна'}
                </div>
                <ul className="service-status-list">
                    {failures.map((failure) => {
                        const label = SERVICE_LABELS[failure.service] || failure.service;
                        const cachedAt = failure.from_cache ? formatCachedAt(failure.cached_at) : null;
                        return (
                            <li key={failure.service} title={failure.error || ''}>
                                <strong>{label}</strong>
                                {failure.from_cache
                                    ? ` — показываем данные${cachedAt ? ` от ${cachedAt}` : ' из кэша'}, они могут быть неактуальны.`
                                    : ' — данных нет: в расписании их не будет, пока сервис не заработает.'}
                            </li>
                        );
                    })}
                </ul>
                <div className="service-status-hint">
                    Это сбой на стороне сервиса, а не ваших доступов. Мы проверяем его снова каждые несколько минут.
                </div>
            </div>
            {onRetry && (
                <button
                    type="button"
                    className="service-status-retry"
                    onClick={onRetry}
                    disabled={retrying}
                >
                    {retrying ? 'Проверяем…' : 'Проверить сейчас'}
                </button>
            )}
        </div>
    );
};

export default ServiceStatusBanner;
