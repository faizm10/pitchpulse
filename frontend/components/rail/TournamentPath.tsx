'use client';

import type { JourneyState } from '@/types/journey';

const STAGES = ['GS', 'R32', 'R16', 'QF', 'SF', 'F'] as const;
const STAGE_LABELS: Record<string, string> = {
  GS: 'Group Stage',
  R32: 'R32',
  R16: 'R16',
  QF: 'QF',
  SF: 'SF',
  F: 'Final',
};

interface TournamentPathProps {
  journey: JourneyState;
  teamColor: string;
}

export function TournamentPath({ journey, teamColor }: TournamentPathProps) {
  const probs = journey.stageProbabilities;

  return (
    <div className="rail-team-block">
      <div className="rail-h">
        <span>Tournament Path</span>
      </div>
      <p className="mono rail-team-path__hint">estimated odds based on recent form</p>
      <div className="rail-team-path">
        {STAGES.map((stage) => {
          const prob = probs[stage] ?? 0;
          const label = STAGE_LABELS[stage];
          const isGS = stage === 'GS';
          return (
            <div key={stage} className="rail-team-path__row">
              <div className="rail-team-path__header">
                <span style={{ fontWeight: isGS ? 700 : 400 }}>{label}</span>
                <span className="mono">
                  {isGS ? '✓ Qualified' : `${Math.round(prob * 100)}%`}
                </span>
              </div>
              {!isGS && (
                <div className="rail-team-path__bar">
                  <div
                    className="rail-team-path__fill"
                    style={{
                      width: `${Math.round(prob * 100)}%`,
                      background: teamColor,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
