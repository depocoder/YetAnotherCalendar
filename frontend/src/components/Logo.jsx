import React from 'react';

/**
 * Логотип проекта: шапочка выпускника в фирменном градиенте (SVG,
 * резкий на любом DPI — favicon.ico всего 16x16 и мылится).
 */
const Logo = ({ size = 24, light = false }) => {
    const gradientId = light ? 'capGradLight' : 'capGrad';
    return (
        <svg viewBox="0 0 48 40" width={size} height={Math.round(size * 40 / 48)} aria-hidden="true">
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    {light ? (
                        <>
                            <stop offset="0" stopColor="#ffffff" />
                            <stop offset="1" stopColor="#d8d2ff" />
                        </>
                    ) : (
                        <>
                            <stop offset="0" stopColor="#8b74ff" />
                            <stop offset="1" stopColor="#5856d6" />
                        </>
                    )}
                </linearGradient>
            </defs>
            <path fill={`url(#${gradientId})`} d="M24 2 46 12 24 22 2 12Z" />
            <path fill={`url(#${gradientId})`} d="M10 17.5v8c0 3.6 6.3 6.5 14 6.5s14-2.9 14-6.5v-8l-14 6.4Z" />
            <rect x="42.6" y="13" width="2.8" height="12" rx="1.4" fill={`url(#${gradientId})`} />
            <circle cx="44" cy="27.5" r="2.6" fill={`url(#${gradientId})`} />
        </svg>
    );
};

export default Logo;
