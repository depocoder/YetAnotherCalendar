import React from 'react';
import '../../style/ext-link.scss';

// Стрелка «откроется в новой вкладке» — в стиле значков плиток.
const ExternalLinkIcon = () => (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M5 2.5H2.5v7h7V7M7 2.5h2.5V5M9.5 2.5 5.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/**
 * Ссылка на внешний сайт (Модеус, Нетология) в новой вкладке со стрелкой.
 * Без href — просто текст: ссылка есть не всегда.
 * Клик не всплывает — карточки и плитки сами открываются по клику.
 */
const ExternalLink = ({ href, children, className = '', title }) => {
    if (!href) return <>{children}</>;
    return (
        <a
            className={`ext-link ${className}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={title}
            onClick={(event) => event.stopPropagation()}
        >
            {children}
            <ExternalLinkIcon />
        </a>
    );
};

export default ExternalLink;
