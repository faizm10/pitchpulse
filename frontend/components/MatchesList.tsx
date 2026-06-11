'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { stadiums } from '@/lib/data';
import { Flag } from './Shared';
import { useWindowWidth } from '@/hooks/useWindowWidth';
import { posthog } from '@/lib/posthog';

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function minsUntil(dateStr: string, now: number): number | null {
  const diff = new Date(dateStr).getTime() - now;
  if (diff <= 0 || diff > 30 * 60 * 1000) return null;
  return Math.ceil(diff / 60_000);
}

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
type ViewMode = 'list' | 'calendar';

export function MatchesList() {
  const [filter, setFilter] = useState<FilterId>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const width = useWindowWidth();
  
  const router = useRouter(); 

  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const pad = isMobile ? '16px' : isTablet ? '24px' : '56px';

  useEffect(() => {
    let cancelled = false;

    async function loadMatches() {
      try {
        const res = await fetch('/api/scores', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled) setMatches(data.matches || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMatches();
    const id = setInterval(loadMatches, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
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

  const renderCalendarView = () => {
    const calendarMonths = [
      { name: 'June 2026', year: 2026, month: 5, totalDays: 30, startOffset: 1 },
      { name: 'July 2026', year: 2026, month: 6, totalDays: 31, startOffset: 3 },
    ];

    return (
      <div style={{ display: 'grid', gap: 64 }}>
        {calendarMonths.map((mon) => {
          const daysArray = Array.from({ length: mon.totalDays }, (_, i) => i + 1);
          const emptyHeaderCells = Array.from({ length: mon.startOffset });

          return (
            <div key={mon.name}>
              <div className="serif" style={{ 
                fontSize: isMobile ? 28 : 36, 
                fontWeight: 700, 
                marginBottom: 24, 
                borderBottom: '2px solid var(--ink)',
                paddingBottom: 8,
                letterSpacing: '-0.02em'
              }}>
                {mon.name}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(7, 1fr)',
                gap: '24px 16px',
              }}>
                {!isMobile && ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="mono" style={{
                    fontSize: 10,
                    paddingBottom: 8,
                    borderBottom: '1px solid var(--rule)',
                    color: 'var(--ink-3)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase'
                  }}>
                    {d}
                  </div>
                ))}

                {!isMobile && emptyHeaderCells.map((_, i) => (
                  <div key={`empty-${i}`} style={{ borderBottom: '1px solid var(--rule-soft)', opacity: 0.1 }} />
                ))}

                {daysArray.map((day) => {
                  const targetDateStr = `${mon.year}-${String(mon.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  
                  // Filter matches based on their Eastern Time date string
                  const dayMatches = filtered.filter(m => {
                    const matchDate = new Date(m.date);
                    
                    // Format the match date into Eastern Time YYYY-MM-DD format
                    const etDateStr = matchDate.toLocaleDateString('en-CA', {
                      timeZone: 'America/New_York',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    }); // Returns "YYYY-MM-DD" safely
                    
                    return etDateStr === targetDateStr;
                  });

                  const hasMatches = dayMatches.length > 0;

                  return (
                    <div key={day} style={{
                      minHeight: isMobile ? 'auto' : 140,
                      borderBottom: '1px solid var(--rule-soft)',
                      paddingBottom: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid var(--rule-soft)',
                        paddingBottom: 4
                      }}>
                        <span className="mono" style={{ 
                          fontSize: 13, 
                          color: hasMatches ? 'var(--ink)' : 'var(--ink-3)',
                          fontWeight: hasMatches ? 700 : 400 
                        }}>
                          {day}
                        </span>
                        {isMobile && hasMatches && (
                          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>
                            {dayMatches.length} MATCHES
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {dayMatches.map((m) => {
                          // Format the printed time line into Eastern Time
                          const matchTime = new Date(m.date).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'America/New_York'
                          }).toLowerCase();

                          return (
                            <div 
                              key={m.id}
                              onClick={() => router.push(`/match/${m.id}`)}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                                cursor: 'pointer',
                                padding: '4px 0'
                              }}
                            >
                              <div className="mono" style={{ 
                                fontSize: 9, 
                                color: m.state === 'in' ? 'var(--live)' : 'var(--ink-3)', 
                                letterSpacing: '0.05em' 
                              }}>
                                {m.state === 'in' ? `• LIVE` : matchTime}
                              </div>

                              <div className="serif" style={{ 
                                fontSize: 13, 
                                lineHeight: '1.4em',
                                color: 'var(--ink)',
                                fontWeight: 500,
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: '4px 6px'
                              }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <Flag code={m.homeTeam.abbreviation} w={16} h={10} />
                                  {m.homeTeam.name}
                                </span>
                                
                                <span style={{ fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 11, padding: '0 2px' }}>vs</span>
                                
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <Flag code={m.awayTeam.abbreviation} w={16} h={10} />
                                  {m.awayTeam.name}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="screen">
      <div style={{
        padding: isMobile ? '24px 16px 20px' : isTablet ? '32px 24px 20px' : '40px 56px 24px',
        borderBottom: '1px solid var(--rule)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="eyebrow">
            All matches · {filtered.length} scheduled
          </div>

          <div style={{ 
            display: 'inline-flex', 
            border: '1px solid var(--rule)', 
            borderRadius: 999, 
            padding: 2,
            background: 'var(--paper)'
          }}>
            {(['list', 'calendar'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => { setViewMode(mode); posthog.capture('match_view_changed', { mode }); }}
                style={{
                  cursor: 'pointer',
                  background: viewMode === mode ? 'var(--ink)' : 'transparent',
                  color: viewMode === mode ? 'var(--paper)' : 'var(--ink)',
                  border: 'none',
                  borderRadius: 999,
                  padding: '4px 12px',
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
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
              onClick={() => { setFilter(f.id); posthog.capture('match_list_filter_changed', { filter: f.id }); }}
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

        {!loading && filtered.length > 0 && (
          viewMode === 'list' ? (
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
          ) : (
            renderCalendarView()
          )
        )}
      </div>
    </div>
  );
}

function MatchStatusLabel({ m, fontSize }: { m: any; fontSize: number }) {
  const now = useNow();
  const minsAway = m.state === 'pre' ? minsUntil(m.date, now) : null;

  if (m.state === 'in') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--live)', fontFamily: 'var(--mono)', fontSize, letterSpacing: '0.12em' }}>
        <span className="status-dot live" />
        LIVE · {m.displayClock}
      </span>
    );
  }
  if (m.state === 'post') {
    return (
      <span className="mono" style={{ fontSize, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>
        FULL TIME
      </span>
    );
  }
  if (minsAway !== null) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--mono)', fontSize, letterSpacing: '0.1em', color: '#f59e0b', fontWeight: 700 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', flexShrink: 0 }} />
        {minsAway <= 1 ? 'KICKOFF NOW' : `KICKOFF IN ${minsAway}M`}
      </span>
    );
  }
  return (
    <span className="mono" style={{ fontSize, color: 'var(--ink-2)', letterSpacing: '0.12em' }}>
      {new Date(m.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
    </span>
  );
}

function MatchListRow({ m, isMobile, isTablet }: { m: any; isMobile: boolean; isTablet: boolean }) {
  const router = useRouter();

  if (isMobile) {
    return (
      <div
        onClick={() => { posthog.capture('match_list_match_clicked', { match_id: m.id, home_team: m.homeTeam?.abbreviation, away_team: m.awayTeam?.abbreviation, match_state: m.state }); router.push(`/match/${m.id}`); }}
        style={{
          padding: '16px 0',
          borderTop: '1px solid var(--rule-soft)',
          cursor: 'pointer',
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <MatchStatusLabel m={m} fontSize={10} />
        </div>

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

        {m.venue?.city && (
          <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', marginTop: 8 }}>
            {m.venue.city.toUpperCase()}
            {m.venue.name && <span style={{ opacity: 0.6 }}> · {m.venue.name.toUpperCase()}</span>}
          </div>
        )}
      </div>
    );
  }

  if (isTablet) {
    return (
      <div
        onClick={() => { posthog.capture('match_list_match_clicked', { match_id: m.id, home_team: m.homeTeam?.abbreviation, away_team: m.awayTeam?.abbreviation, match_state: m.state }); router.push(`/match/${m.id}`); }}
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
          <MatchStatusLabel m={m} fontSize={10} />
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
        <MatchStatusLabel m={m} fontSize={11} />
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