import React, { useId } from 'react';

// Logo de Trote App (misma figura que assets/logo.svg, sin el fondo)
export default function Logo({ className }: { className?: string }) {
  const gradientId = `logo-g-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg className={className} viewBox="96 96 320 320" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0284c7" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <g transform="translate(256 256) scale(.8) translate(-268 -272)">
        <g transform="translate(20 0) rotate(-8 300 280)">
          <path
            d="M172 324 C 160 292 160 246 178 220 C 192 200 216 202 228 218 C 240 234 260 234 272 216 L 290 190 Q 298 180 307 190 L 334 230 C 364 256 412 266 430 296 C 438 310 434 324 420 324 Z"
            fill={`url(#${gradientId})`}
          />
          <path d="M176 350 H 404 Q 432 350 440 324" fill="none" stroke={`url(#${gradientId})`} strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
          {/* Cordones: del color del fondo para que se lean sobre la zapatilla */}
          <path d="M292 226 l 20 -12 M 312 250 l 20 -12 M 334 268 l 20 -12" stroke="#f6f8fc" strokeWidth="11" strokeLinecap="round" />
        </g>
        <path d="M78 262 H 140 M 100 300 H 146 M 78 338 H 120" stroke="#0284c7" strokeOpacity=".35" strokeWidth="16" strokeLinecap="round" />
      </g>
    </svg>
  );
}
