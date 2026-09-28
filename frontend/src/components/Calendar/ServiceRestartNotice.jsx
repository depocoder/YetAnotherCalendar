import React from 'react';
import InlineLoader from '../../elements/InlineLoader';
import { RESTART_TITLE, RESTART_TEXT } from '../../utils/serviceRestart';

// Спокойное уведомление вместо пустой сетки и красного тоста, пока бэкенд
// перезапускается после деплоя: календарь сам пробует снова (CalendarPage).
const ServiceRestartNotice = ({ checking = false }) => (
    <div className="service-restart-notice" role="status" aria-live="polite">
        <div className="service-restart-notice__icon" aria-hidden="true">📚</div>
        <div className="service-restart-notice__body">
            <div className="service-restart-notice__title">{RESTART_TITLE}</div>
            <div className="service-restart-notice__text">
                {RESTART_TEXT} Календарь подгрузится сам — перезагружать страницу не нужно.
            </div>
            <div className="service-restart-notice__progress">
                {checking ? <><InlineLoader /> Проверяем…</> : 'Проверим снова через несколько секунд'}
            </div>
        </div>
    </div>
);

export default ServiceRestartNotice;
