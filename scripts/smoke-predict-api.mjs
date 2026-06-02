#!/usr/bin/env node
/**
 * Smoke test for the prediction API (local, Render, or via Next.js proxy).
 *
 * Usage:
 *   node scripts/smoke-predict-api.mjs
 *   PREDICT_API_URL=https://pitchpulse-api-dsye.onrender.com node scripts/smoke-predict-api.mjs
 *   SMOKE_FRONTEND_URL=https://your-app.vercel.app node scripts/smoke-predict-api.mjs
 */

const backendBase = (
  process.env.PREDICT_API_URL ?? 'http://127.0.0.1:8001'
).replace(/\/$/, '');
const frontendBase = process.env.SMOKE_FRONTEND_URL?.replace(/\/$/, '');

async function check(label, url, init) {
  const started = Date.now();
  const res = await fetch(url, init);
  const ms = Date.now() - started;
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 200);
  }
  if (!res.ok) {
    console.error(`FAIL ${label} (${res.status}, ${ms}ms)`);
    console.error(body);
    return false;
  }
  console.log(`OK   ${label} (${res.status}, ${ms}ms)`);
  if (label.includes('health') && body?.model_loaded === false) {
    console.warn('WARN model_loaded is false — predictions may be degraded');
  }
  return true;
}

let ok = true;

console.log(`Backend: ${backendBase}`);
ok &&= await check(
  'GET /health',
  `${backendBase}/health`
);
ok &&= await check('POST /predict', `${backendBase}/predict`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ home_team: 'Brazil', away_team: 'Germany' }),
});

if (frontendBase) {
  console.log(`Frontend proxy: ${frontendBase}`);
  ok &&= await check(
    'POST /api/predict (Next.js)',
    `${frontendBase}/api/predict`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ home_team: 'Brazil', away_team: 'Germany' }),
    }
  );
}

process.exit(ok ? 0 : 1);
