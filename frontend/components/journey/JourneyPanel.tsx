'use client';

import { useEffect, useState } from 'react';
import { Flag } from '@/components/Shared';
import { teams } from '@/lib/data';
import { KNOCKOUT_ROUND_NAMES } from '@/lib/journey';
import type { JourneyState, JourneyScenario, JourneyStop } from '@/types/journey';

interface JourneyPanelProps {
  journey: JourneyState;
  scenario: JourneyScenario;
  onScenarioChange: (s: JourneyScenario) => void;
  onReplay: () => void;
  onClose: () => void;
  onChangeTeam: () => void;
}

/** Returns '#fff' or '#0a0e16' so text is always readable on the given hex background */
function contrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.55 ? '#0a0e16' : '#ffffff';
}

const STAGES = ['GS', 'R32', 'R16', 'QF', 'SF', 'F'] as const;
const STAGE_LABELS: Record<string, string> = {
  GS: 'Group Stage',
  R32: 'R32',
  R16: 'R16',
  QF: 'QF',
  SF: 'SF',
  F: 'Final',
};

function StopRow({ stop }: { stop: JourneyStop }) {
  const stageLabel = stop.stage === 'GS'
    ? `MD${stop.matchday}`
    : KNOCKOUT_ROUND_NAMES[stop.stage] ?? stop.stage;

  return (
    <div style={{
      display: 'flex',
      gap: 10,
      padding: '8px 0',
      borderBottom: '1px solid var(--rule-soft)',
    }}>
      <div style={{
        width: 2,
        alignSelf: 'stretch',
        borderRadius: 1,
        background: stop.confirmed ? 'var(--live)' : 'var(--ink-3)',
        opacity: stop.confirmed ? 1 : 0.5,
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: stop.confirmed ? 'var(--live)' : 'var(--ink-3)',
          }}>
            {stageLabel}
            {!stop.confirmed && ' · projected'}
          </span>
          <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>
            {stop.date}
          </span>
        </div>
        <p style={{ margin: '3px 0 1px', fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {stop.venueName}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-3)' }}>
          {/* Only show opponent for confirmed group-stage games — projected opponents are unknown */}
          {stop.confirmed ? `${stop.city} · vs ${stop.opponent}` : stop.city}
        </p>
      </div>
    </div>
  );
}

export function JourneyPanel({ journey, scenario, onScenarioChange, onReplay, onClose, onChangeTeam }: JourneyPanelProps) {
  const team = teams[journey.teamCode];
  const teamColor = team?.flag[0] ?? '#4285F4';
  const probs = journey.stageProbabilities;

  // Detect mobile — bottom sheet on small screens, left sidebar on desktop
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        top: 'auto',
        height: '72vh',
        zIndex: 100,
        background: 'var(--paper)',
        borderTop: '1px solid var(--rule)',
        borderRadius: '16px 16px 0 0',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
        animation: 'slide-up 300ms cubic-bezier(0.2,0.8,0.2,1)',
      }
    : {
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 320,
        zIndex: 100,
        background: 'var(--paper)',
        borderRight: '1px solid var(--rule)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
        animation: 'screen-in 280ms ease',
      };

  return (
    <div style={panelStyle}>
      {/* Mobile drag handle */}
      {isMobile && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--ink-3)', opacity: 0.35 }} />
        </div>
      )}

      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--rule)',
        background: 'var(--paper-2)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flag code={journey.teamCode} w={36} h={24} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                {team?.name ?? journey.teamCode}
              </div>
              <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                GROUP {team?.group} · WC 2026
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={onChangeTeam}
              title="Change team"
              style={{
                background: 'none', border: '1px solid var(--rule)', cursor: 'pointer',
                borderRadius: 6, color: 'var(--ink-3)', fontSize: 11,
                padding: '4px 9px', fontFamily: 'var(--mono)', letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
              }}
            >
              ⇄ Change
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              style={{
                background: 'none', border: '1px solid var(--rule)', cursor: 'pointer',
                borderRadius: 6, color: 'var(--ink-3)', fontSize: 14, padding: '4px 8px',
              }}
            >
              ×
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {/* Travel stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 1, background: 'var(--rule)', borderBottom: '1px solid var(--rule)',
        }}>
          {[
            { n: journey.totalDistanceKm.toLocaleString(), l: 'km total' },
            { n: journey.citiesCount, l: 'cities' },
            { n: journey.stadiumsCount, l: 'stadiums' },
            { n: journey.stops.length, l: 'matches (full run)' },
          ].map(({ n, l }) => (
            <div key={l} style={{ background: 'var(--paper)', padding: '12px 14px' }}>
              <div className="serif tnum" style={{ fontSize: 22, lineHeight: 1, color: 'var(--ink)' }}>{n}</div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-3)', marginTop: 4, textTransform: 'uppercase' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Scenario toggle */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)' }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-3)', letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase' }}>
            Group Finish
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['first', 'second', 'third'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onScenarioChange(s)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 7,
                  border: `1px solid ${scenario === s ? teamColor : 'var(--rule)'}`,
                  background: scenario === s ? teamColor : 'var(--paper-2)',
                  color: scenario === s ? contrastText(teamColor) : 'var(--ink)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--mono)', letterSpacing: '0.04em',
                  transition: 'all 150ms',
                }}
              >
                {s === 'first' ? '1st' : s === 'second' ? '2nd' : '3rd'}
              </button>
            ))}
          </div>
          {scenario === 'third' && (
            <div style={{
              marginTop: 7, padding: '5px 8px', borderRadius: 5,
              background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.2)',
              fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-3)',
              lineHeight: 1.4,
            }}>
              ⚠ Only 8 of 12 third-place teams advance. Path is approximate.
            </div>
          )}
        </div>

        {/* Stage probability tracker */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)' }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Tournament Path
            </div>
            <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--ink-3)', marginTop: 2, opacity: 0.7 }}>
              estimated odds based on recent form
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {STAGES.map((stage) => {
              const prob = probs[stage] ?? 0;
              const label = STAGE_LABELS[stage];
              const isGS = stage === 'GS';
              return (
                <div key={stage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: 'var(--ink)', fontWeight: isGS ? 700 : 400 }}>{label}</span>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>
                      {isGS ? '✓ Qualified' : `${Math.round(prob * 100)}%`}
                    </span>
                  </div>
                  {!isGS && (
                    <div style={{ height: 3, borderRadius: 2, background: 'var(--rule)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.round(prob * 100)}%`,
                        borderRadius: 2,
                        background: teamColor,
                        opacity: 0.8,
                        transition: 'width 400ms ease',
                      }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Match stops */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Journey Stops
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 12, height: 2, borderRadius: 1, background: 'var(--live)', display: 'inline-block' }} />
                confirmed
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 12, height: 2, borderRadius: 1, background: 'var(--ink-3)', opacity: 0.5, display: 'inline-block' }} />
                projected
              </span>
            </div>
          </div>
          {journey.stops.map((stop, i) => (
            <StopRow key={`${stop.venueId}-${i}`} stop={stop} />
          ))}
        </div>

        {/* Narrative */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)' }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-3)', letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase' }}>
            The Journey
          </div>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--ink-2)' }}>
            {journey.narrative}
          </p>
        </div>
      </div>

      {/* Replay button */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--rule)', flexShrink: 0 }}>
        <button
          type="button"
          onClick={onReplay}
          style={{
            width: '100%', padding: '10px', borderRadius: 8,
            border: `1px solid ${teamColor}`,
            background: 'transparent',
            color: teamColor,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'var(--mono)', letterSpacing: '0.1em',
            textTransform: 'uppercase',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = teamColor; (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = teamColor; }}
        >
          ↺ Replay Journey
        </button>
      </div>
    </div>
  );
}
