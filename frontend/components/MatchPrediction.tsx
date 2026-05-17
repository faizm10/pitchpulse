'use client';

import type { PredictResponse } from '@/types/predict';

interface MatchPredictionProps {
  homeLabel: string;
  awayLabel: string;
  prediction: PredictResponse | null;
  loading?: boolean;
  error?: string | null;
}

export function MatchPrediction({
  homeLabel,
  awayLabel,
  prediction,
  loading,
  error,
}: MatchPredictionProps) {
  if (loading) {
    return (
      <div>
        <div className="eyebrow">AI Prediction</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
          Running World Cup model…
        </div>
      </div>
    );
  }

  if (error || !prediction) {
    return null;
  }

  const homePct = Math.round(prediction.home_win_probability * 100);
  const drawPct = Math.round(prediction.draw_probability * 100);
  const awayPct = Math.round(prediction.away_win_probability * 100);

  return (
    <div>
      <div className="eyebrow">AI Prediction</div>
      <div className="serif" style={{ fontSize: 22, marginTop: 6, fontStyle: 'italic' }}>
        Where this match is heading
      </div>
      <div
        style={{
          marginTop: 18,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 0,
          border: '1px solid var(--rule)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <PredictBar label={homeLabel} pct={homePct} color="var(--pulse)" />
        <PredictBar label="Draw" pct={drawPct} color="var(--gold)" showDrawDisclaimer />
        <PredictBar label={awayLabel} pct={awayPct} color="var(--ink-2)" isLast />
      </div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--ink-3)',
          marginTop: 10,
          letterSpacing: '0.06em',
        }}
      >
        Model: {prediction.model}
        {prediction.confidence === 'low' ? ' · limited historical data' : ''}
      </div>
    </div>
  );
}

function PredictBar({
  label,
  pct,
  color,
  showDrawDisclaimer,
  isLast,
}: {
  label: string;
  pct: number;
  color: string;
  showDrawDisclaimer?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        padding: 18,
        borderRight: isLast ? undefined : '1px solid var(--rule-soft)',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--paper)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${pct}%`,
          background: color,
          opacity: 0.15,
        }}
      />
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--ink-3)',
          letterSpacing: '0.14em',
          position: 'relative',
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        className="serif"
        style={{ fontSize: 40, lineHeight: 1, marginTop: 8, position: 'relative' }}
      >
        {pct}
        <span style={{ fontSize: 18, opacity: 0.5 }}>%</span>
      </div>
      {showDrawDisclaimer ? (
        <p
          className="mono"
          style={{
            margin: '10px 0 0',
            fontSize: 9,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
            lineHeight: 1.35,
            position: 'relative',
            opacity: 0.85,
          }}
        >
          Draw predictions are less reliable
        </p>
      ) : null}
    </div>
  );
}
