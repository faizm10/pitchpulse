import { NextResponse } from 'next/server';

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

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ home_team: homeTeam, away_team: awayTeam }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Prediction service error', detail: data },
        { status: res.status >= 400 ? res.status : 502 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[/api/predict]', err);
    return NextResponse.json(
      { error: 'Failed to reach prediction service', detail: String(err) },
      { status: 502 }
    );
  }
}
