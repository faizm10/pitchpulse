import posthog from 'posthog-js';

let initialized = false;

export function initPostHog() {
  if (initialized || typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: '/ingest',
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.posthog.com',
    defaults: '2026-01-30',
    capture_pageview: false,
    capture_pageleave: true,
    capture_exceptions: true,
    persistence: 'localStorage',
    debug: process.env.NODE_ENV === 'development',
  });
  initialized = true;
}

export { posthog };
