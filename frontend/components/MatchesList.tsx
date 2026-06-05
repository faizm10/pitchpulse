'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { stadiums } from '@/lib/data';
import { Flag } from './Shared';
import { useWindowWidth } from '@/hooks/useWindowWidth';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live', dot: 'var(--live)' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'ft', label: 'Full time' },
] as const;

const ROUNDS = [
  { label: 'Group Stage: Matchday 1', from: '2026-06-11T00:00Z', to: '2026-06-18T00:00Z' },
  { label: 'Group Stage: Matchday 2', from: '2026-06-18T00:00Z', to: '2026-06-24T00:00Z' },
  { label: 'Group Stage: Matchday 3', from: '2026-06-24T00:00Z', to: '2026-06-28T10:00Z' },
  { label: 'Round of 32',             from: '2026-06-28T10:00Z', to: '2026-07-04T00:00Z' },
  { label: 'Round of 16',             from: '2026-07-04T00:00Z', to: '2026-07-08T00:00Z' },
  { label: 'Quarter-finals',          from: '2026-07-09T00:00Z', to: '2026-07-12T00:00Z' },
  { label: 'Semi-finals',             from: '2026-07-14T00:00Z', to: '2026-07-16T00:00Z' },
  { label: 'Match for Third Place',   from: '2026-07-18T00:00Z', to: '2026-07-19T00:00Z' },
  { label: 'Final',                   from: '2026-07-19T00:00Z', to: '2026-07-20T00:00Z' },
];

type FilterId = 'all' | 'live' | 'upcoming' | 'ft';


export function MatchesList() {
  const [filter, setFilter] = useState<FilterId>('all');
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const width = useWindowWidth();

  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const pad = isMobile ? '16px' : isTablet ? '24px' : '56px';

  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await fetch('/api/scores');
        const data = await res.json();
        console.log('matches:', data);
        setMatches(data.matches || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMatches();
  }, []);

  const filtered = matches.filter((m) => {
    if (filter === 'live') return m.state === 'in';
    if (filter === 'ft') return m.state === 'post';
    if (filter === 'upcoming') return m.state === 'pre';
    return true;
  });

  const grouped = ROUNDS.map(round => ({
    ...round,
    matches: filtered.filter(m => {
      const d = new Date(m.date);
      return d >= new Date(round.from) && d < new Date(round.to);
    }),
  })).filter(g => g.matches.length > 0);

  return (
    <div className="screen">
      <div style={{
        padding: isMobile ? '24px 16px 20px' : isTablet ? '32px 24px 20px' : '40px 56px 24px',
        borderBottom: '1px solid var(--rule)',
      }}>
        <div className="eyebrow">
          All matches · {filtered.length} scheduled
        </div>

        <div className="headline" style={{
          fontSize: isMobile ? 36 : isTablet ? 48 : 64,
          marginTop: 8,
        }}>
          Every kickoff,
          <br />
          <em>in one place.</em>
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                cursor: 'pointer',
                background: filter === f.id ? 'var(--ink)' : 'transparent',
                color: filter === f.id ? 'var(--paper)' : 'var(--ink)',
                border: '1px solid var(--rule)',
                borderRadius: 999,
                padding: isMobile ? '6px 14px' : '8px 16px',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {'dot' in f && f.dot && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: f.dot }} />
              )}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: `24px ${pad} 64px` }}>
        {loading && (
          <div className="serif it" style={{ fontSize: 28, color: 'var(--ink-3)' }}>
            Loading matches...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div className="serif it" style={{ fontSize: 28, color: 'var(--ink-3)' }}>
              No matches found.
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: 0 }}>
          {grouped.map((group) => (
            <div key={group.label}>
              <div style={{
                padding: '28px 0 12px',
                borderBottom: '2px solid var(--rule)',
                marginBottom: 4,
              }}>
                <div className="mono" style={{
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: 'var(--ink-3)',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  {new Date(group.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {group.from !== group.to && ` – ${new Date(group.to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                </div>
                <div className="serif" style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700 }}>
                  {group.label}
                </div>
              </div>

              {group.matches.map((m) => (
                <MatchListRow key={m.id} m={m} isMobile={isMobile} isTablet={isTablet} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchListRow({ m, isMobile, isTablet }: { m: any; isMobile: boolean; isTablet: boolean }) {
  const router = useRouter();

  // ── MOBILE: stacked card ─────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        onClick={() => router.push(`/match/${m.id}`)}
        style={{
          padding: '16px 0',
          borderTop: '1px solid var(--rule-soft)',
          cursor: 'pointer',
        }}
      >
        {/* Status */}
        <div style={{ marginBottom: 10 }}>
          {m.state === 'in' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'var(--live)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em',
            }}>
              <span className="status-dot live" />
              LIVE · {m.displayClock}
            </span>
          )}
          {m.state === 'post' && (
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>
              FULL TIME
            </span>
          )}
          {m.state === 'pre' && (
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.12em' }}>
              {new Date(m.date).toLocaleString()}
            </span>
          )}
        </div>

        {/* Teams + score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            <span className="serif" style={{ fontSize: 15, textAlign: 'right' }}>{m.homeTeam.name}</span>
            <Flag code={m.homeTeam.abbreviation} w={24} h={15} />
          </div>

          <div className="serif tnum" style={{ fontSize: 20, minWidth: 52, textAlign: 'center' }}>
            {m.state === 'pre'
              ? <span style={{ color: 'var(--ink-3)', fontSize: 11, fontStyle: 'italic' }}>vs</span>
              : `${m.homeTeam.score}–${m.awayTeam.score}`
            }
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flag code={m.awayTeam.abbreviation} w={24} h={15} />
            <span className="serif" style={{ fontSize: 15 }}>{m.awayTeam.name}</span>
          </div>
        </div>

        {/* Venue */}
        {m.venue?.city && (
          <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', marginTop: 8 }}>
            {m.venue.city.toUpperCase()}
            {m.venue.name && <span style={{ opacity: 0.6 }}> · {m.venue.name.toUpperCase()}</span>}
          </div>
        )}
      </div>
    );
  }

  // ── TABLET: condensed row, no stadium column ─────────────────────
  if (isTablet) {
    return (
      <div
        onClick={() => router.push(`/match/${m.id}`)}
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr auto 1fr 24px',
          gap: 16,
          padding: '16px 0',
          borderTop: '1px solid var(--rule-soft)',
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        <div>
          {m.state === 'in' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'var(--live)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em',
            }}>
              <span className="status-dot live" />
              LIVE · {m.displayClock}
            </span>
          )}
          {m.state === 'post' && (
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>FULL TIME</span>
          )}
          {m.state === 'pre' && (
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.12em' }}>
              {new Date(m.date).toLocaleString()}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
          <span className="serif" style={{ fontSize: 17 }}>{m.homeTeam.name}</span>
          <Flag code={m.homeTeam.abbreviation} w={28} h={18} />
        </div>

        <div className="serif tnum" style={{ fontSize: 22, minWidth: 64, textAlign: 'center' }}>
          {m.state === 'pre'
            ? <span style={{ color: 'var(--ink-3)', fontSize: 13, fontStyle: 'italic' }}>vs</span>
            : `${m.homeTeam.score}–${m.awayTeam.score}`
          }
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Flag code={m.awayTeam.abbreviation} w={28} h={18} />
          <span className="serif" style={{ fontSize: 17 }}>{m.awayTeam.name}</span>
        </div>

        <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>›</div>
      </div>
    );
  }

  // ── DESKTOP: full original row ───────────────────────────────────
  return (
    <div
      onClick={() => router.push(`/match/${m.id}`)}
      style={{
        display: 'grid',
        gridTemplateColumns: '140px 1fr auto 1fr 160px 28px',
        gap: 24,
        padding: '20px 0',
        borderTop: '1px solid var(--rule-soft)',
        alignItems: 'center',
        cursor: 'pointer',
      }}
    >
      <div>
        {m.state === 'in' && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'var(--live)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em',
          }}>
            <span className="status-dot live" />
            LIVE · {m.displayClock}
          </span>
        )}
        {m.state === 'post' && (
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>FULL TIME</span>
        )}
        {m.state === 'pre' && (
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', letterSpacing: '0.12em' }}>
            {new Date(m.date).toLocaleString()}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'flex-end' }}>
        <span className="serif" style={{ fontSize: 22 }}>{m.homeTeam.name}</span>
        <Flag code={m.homeTeam.abbreviation} w={32} h={20} />
      </div>

      <div className="serif tnum" style={{ fontSize: 28, minWidth: 80, textAlign: 'center' }}>
        {m.state === 'pre'
          ? <span style={{ color: 'var(--ink-3)', fontSize: 14, fontStyle: 'italic' }}>vs</span>
          : `${m.homeTeam.score}–${m.awayTeam.score}`
        }
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Flag code={m.awayTeam.abbreviation} w={32} h={20} />
        <span className="serif" style={{ fontSize: 22 }}>{m.awayTeam.name}</span>
      </div>

      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em', textAlign: 'right' }}>
        {m.venue?.city?.toUpperCase()}
        <br />
        <span style={{ opacity: 0.7 }}>{m.venue?.name?.toUpperCase()}</span>
      </div>

      <div style={{ color: 'var(--ink-3)', fontSize: 16 }}>›</div>
    </div>
  );
}