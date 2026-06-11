import { NextResponse } from 'next/server';
import { getPostHogClient, shutdownPostHog } from '@/lib/posthog-server';

/** Allow cold start on Render free tier; server-side only (no browser CORS). */
const PREDICT_TIMEOUT_MS = 60_000;

export async function POST(req: Request) {
  const baseUrl = process.env.PREDICT_API_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'PREDICT_API_URL is not configured' },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const homeTeam =
    typeof body === 'object' &&
    body !== null &&
    'home_team' in body &&
    typeof (body as { home_team: unknown }).home_team === 'string'
      ? (body as { home_team: string }).home_team.trim()
      : '';
  const awayTeam =
    typeof body === 'object' &&
    body !== null &&
    'away_team' in body &&
    typeof (body as { away_team: unknown }).away_team === 'string'
      ? (body as { away_team: string }).away_team.trim()
      : '';

  if (!homeTeam || !awayTeam) {
    return NextResponse.json(
      { error: 'home_team and away_team are required' },
      { status: 400 }
    );
  }

  const url = `${baseUrl.replace(/\/$/, '')}/predict`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PREDICT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ home_team: homeTeam, away_team: awayTeam }),
      signal: controller.signal,
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Prediction service error', detail: data },
        { status: res.status >= 400 ? res.status : 502 }
      );
    }

    const ph = getPostHogClient();
    ph?.capture({
      distinctId: 'server',
      event: 'server_predict_requested',
      properties: { home_team: homeTeam, away_team: awayTeam, success: true },
    });
    return NextResponse.json(data);
  } catch (err) {
    const aborted =
      err instanceof Error &&
      (err.name === 'AbortError' || err.message.includes('aborted'));
    console.error('[/api/predict]', err);
    const ph = getPostHogClient();
    ph?.capture({
      distinctId: 'server',
      event: 'server_predict_requested',
      properties: { home_team: homeTeam, away_team: awayTeam, success: false, error: aborted ? 'timeout' : 'upstream_error' },
    });
    return NextResponse.json(
      {
        error: aborted
          ? 'Prediction service timed out (cold start). Try again.'
          : 'Failed to reach prediction service',
        detail: String(err),
      },
      { status: aborted ? 504 : 502 }
    );
  } finally {
    clearTimeout(timeout);
    await shutdownPostHog();
  }
}
