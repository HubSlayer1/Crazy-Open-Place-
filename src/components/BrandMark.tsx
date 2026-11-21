import React from 'react';

export function BrandLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="9"
        fill="#141418"
        stroke="var(--accent-secondary)"
        strokeWidth="2.2"
      />
      <path
        d="M18 15L11 24L18 33"
        stroke="#f4f4f5"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M30 15L37 24L30 33"
        stroke="#f4f4f5"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="3.6" fill="var(--accent-primary)" />
    </svg>
  );
}

export function FacebookIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M13.5 22v-8.2h2.75l.41-3.2H13.5V8.55c0-.93.26-1.56 1.59-1.56h1.7V4.13c-.29-.04-1.3-.13-2.48-.13-2.45 0-4.13 1.5-4.13 4.25v2.35H7.4v3.2h2.78V22h3.32z" />
    </svg>
  );
}
