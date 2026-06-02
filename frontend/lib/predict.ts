import type { PredictResponse } from '@/types/predict';

/** One-sentence narrative from live model probabilities (for typewriter UI). */
export function buildPredictionNarrative(p: PredictResponse): string {
  const homePct = Math.round(p.home_win_probability * 100);
  const drawPct = Math.round(p.draw_probability * 100);
  const awayPct = Math.round(p.away_win_probability * 100);

  const outcomes = [
    { label: p.home_team, pct: homePct, key: 'home' as const },
    { label: 'Draw', pct: drawPct, key: 'draw' as const },
    { label: p.away_team, pct: awayPct, key: 'away' as const },
  ];
  const top = outcomes.reduce((a, b) => (b.pct > a.pct ? b : a));

  if (top.key === 'draw') {
    const h2h =
      p.h2h_matches_prior > 0
        ? ` — based on ${p.h2h_matches_prior} historical World Cup meetings`
        : '';
    return `Draw favored at ${top.pct}% between ${p.home_team} and ${p.away_team}${h2h}.`;
  }

  const h2h =
    p.h2h_matches_prior > 0
      ? ` — based on ${p.h2h_matches_prior} historical World Cup meetings`
      : '';
  return `${top.label} favored at ${top.pct}%${h2h}.`;
}

function predictionErrorMessage(
  status: number,
  data: { error?: string; detail?: unknown }
): string {
  if (status === 500 && data?.error?.includes('PREDICT_API_URL')) {
    return 'Prediction service is not configured for this deployment.';
  }
  if (status === 502 || status === 504) {
    return 'Prediction service is waking up or unreachable — try again in a moment.';
  }
  if (typeof data?.error === 'string' && data.error.length > 0) {
    return data.error;
  }
  return 'Prediction failed';
}

export async function fetchPrediction(
  homeTeam: string,
  awayTeam: string
): Promise<PredictResponse> {
  let res: Response;
  try {
    res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ home_team: homeTeam, away_team: awayTeam }),
    });
  } catch {
    throw new Error(
      'Could not reach the prediction service. Check your connection and try again.'
    );
  }

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    detail?: unknown;
  };

  if (!res.ok) {
    throw new Error(predictionErrorMessage(res.status, data));
  }

  return data as PredictResponse;
}
