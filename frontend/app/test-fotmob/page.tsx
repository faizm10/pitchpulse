'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Toaster } from 'sonner';

const MATCH_ID = '4813739';
const POLL_LIVE = 12_000;
const POLL_IDLE = 30_000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface FotmobTeam {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  score: string;
}

interface StandingRow {
  teamId: string;
  name: string;
  shortName: string;
  logo: string;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  gd: number;
  scoresStr: string;
  qualColor: string | null;
  projectedPoints: number;
  projectedGd: number;
  projectedRank: number;
  rankChange: number;
}

interface MatchData {
  id: string;
  league: string;
  leagueId: number;
  source: string;
  round: string;
  date: string;
  state: 'pre' | 'in' | 'post';
  statusDetail: string;
  liveClock: string;
  homeTeam: FotmobTeam;
  awayTeam: FotmobTeam;
  standings: StandingRow[];
  projectedStandings: StandingRow[];
}

// ── Responsive hook ───────────────────────────────────────────────────────────

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

// Parse FotMob "MM:SS" live clock into total seconds for ticking
function clockToSeconds(clock: string): number {
  const parts = clock.split(':');
  if (parts.length !== 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function secondsToClock(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ── Score hero ────────────────────────────────────────────────────────────────

function ScoreHero({
  match,
  liveClock,
  isMobile,
}: {
  match: MatchData;
  liveClock: string;
  isMobile: boolean;
}) {
  const { homeTeam, awayTeam, state, statusDetail, date } = match;
  const clockDisplay = state === 'in' ? liveClock || match.liveClock : '';
  const logoSize = isMobile ? 44 : 72;
  const nameFontSize = isMobile ? 20 : 32;
  const scoreFontSize = isMobile ? 48 : 72;

  const kickoffLabel = date
    ? new Date(date).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
      })
    : '';

  const scoreDesc =
    state !== 'pre'
      ? `${homeTeam.name} ${homeTeam.score}, ${awayTeam.name} ${awayTeam.score}`
      : `${homeTeam.name} vs ${awayTeam.name}`;

  return (
    <div
      role="region"
      aria-label="Match score"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
        gap: isMobile ? 8 : 24,
        alignItems: 'center',
        padding: isMobile ? '20px 16px' : '40px 40px',
        borderBottom: '1px solid var(--rule)',
        boxSizing: 'border-box',
      }}
    >
      {/* Home */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16, minWidth: 0 }}>
        <img
          src={homeTeam.logo}
          alt={homeTeam.name}
          width={logoSize}
          height={logoSize}
          style={{ width: logoSize, height: logoSize, objectFit: 'contain', flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            className="serif"
            style={{ fontSize: nameFontSize, lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {isMobile ? homeTeam.shortName : homeTeam.name}
          </div>
          {!isMobile && (
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.2em', marginTop: 5 }}>
              {homeTeam.shortName.toUpperCase()}
            </div>
          )}
        </div>
        {state !== 'pre' && (
          <div
            className="serif tnum"
            aria-hidden="true"
            style={{ fontSize: scoreFontSize, lineHeight: 1, marginLeft: isMobile ? 4 : 12, flexShrink: 0 }}
          >
            {homeTeam.score}
          </div>
        )}
      </div>

      {/* Centre */}
      <div style={{ textAlign: 'center', minWidth: isMobile ? 64 : 96, flexShrink: 0 }}>
        {state === 'in' && (
          <>
            <div
              className="mono"
              style={{ fontSize: 10, color: 'var(--live)', letterSpacing: '0.22em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            >
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
              <span className="sr-only">Live — </span>LIVE
            </div>
            <div
              className="mono"
              aria-live="polite"
              aria-atomic="true"
              aria-label={`Match clock: ${clockDisplay}`}
              style={{ fontSize: isMobile ? 20 : 26, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}
            >
              {clockDisplay || '–'}
            </div>
            {statusDetail && (
              <div className="serif" style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--ink-3)', marginTop: 4 }}>
                {statusDetail}
              </div>
            )}
          </>
        )}
        {state === 'post' && (
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.16em' }}>
            {statusDetail || 'FULL TIME'}
          </div>
        )}
        {state === 'pre' && (
          <>
            <div className="mono" style={{ fontSize: isMobile ? 18 : 24, color: 'var(--ink)' }} aria-hidden="true">VS</div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.6 }}>
              {kickoffLabel}
            </div>
          </>
        )}
      </div>

      {/* Away */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16, flexDirection: 'row-reverse', minWidth: 0 }}>
        <img
          src={awayTeam.logo}
          alt={awayTeam.name}
          width={logoSize}
          height={logoSize}
          style={{ width: logoSize, height: logoSize, objectFit: 'contain', flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
        />
        <div style={{ textAlign: 'right', minWidth: 0 }}>
          <div
            className="serif"
            style={{ fontSize: nameFontSize, lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {isMobile ? awayTeam.shortName : awayTeam.name}
          </div>
          {!isMobile && (
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.2em', marginTop: 5 }}>
              {awayTeam.shortName.toUpperCase()}
            </div>
          )}
        </div>
        {state !== 'pre' && (
          <div
            className="serif tnum"
            aria-hidden="true"
            style={{ fontSize: scoreFontSize, lineHeight: 1, marginRight: isMobile ? 4 : 12, flexShrink: 0 }}
          >
            {awayTeam.score}
          </div>
        )}
      </div>

      <span className="sr-only">{scoreDesc}</span>
    </div>
  );
}

// ── Standings ─────────────────────────────────────────────────────────────────

function StandingsTable({
  standings,
  projectedStandings,
  homeId,
  awayId,
  isLive,
  isMobile,
}: {
  standings: StandingRow[];
  projectedStandings: StandingRow[];
  homeId: string;
  awayId: string;
  isLive: boolean;
  isMobile: boolean;
}) {
  const rows = isLive && projectedStandings.length ? projectedStandings : standings;
  if (!rows.length) return null;

  const showWDL = !isMobile;
  const cols = showWDL
    ? '20px 16px 1fr 32px 32px 32px 32px 32px 44px'
    : '20px 16px 1fr 28px 32px 44px';
  const headers = showWDL
    ? ['', '', 'Club', 'P', 'W', 'D', 'L', 'GD', 'Pts']
    : ['', '', 'Club', 'P', 'GD', 'Pts'];

  return (
    <section aria-label="Premier League standings" style={{ padding: isMobile ? '20px 16px' : '28px 40px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--rule)', paddingBottom: 10, marginBottom: 16,
        flexWrap: 'wrap', gap: 6,
      }}>
        <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', margin: 0 }}>
          PREMIER LEAGUE · GW{rows[0] ? standings.find(r => r.teamId === homeId)?.rank !== undefined ? standings.find(r => r.teamId === homeId)?.played ?? '' : '' : ''}
        </h2>
        {isLive && (
          <div
            className="mono"
            aria-live="polite"
            style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--live)', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
            IF RESULT STANDS
          </div>
        )}
      </div>

      <div role="table" aria-label="Premier League standings table">
        <div role="row" style={{ display: 'grid', gridTemplateColumns: cols, gap: 6, padding: '6px 8px', borderBottom: '1px solid var(--rule)', marginBottom: 4 }}>
          {headers.map((h, i) => (
            <div key={i} role="columnheader" className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em', textAlign: (h === 'Club' || h === '') ? 'left' : 'right' }}>
              {h}
            </div>
          ))}
        </div>

        {rows.map((row) => {
          const isHighlighted = row.teamId === homeId || row.teamId === awayId;
          const rank = isLive ? row.projectedRank : row.rank;
          const pts = isLive ? row.projectedPoints : row.points;
          const gd = isLive ? row.projectedGd : row.gd;
          const change = isLive ? row.rankChange : 0;
          const gdStr = gd >= 0 ? `+${gd}` : String(gd);

          let changeEl: React.ReactNode = null;
          let changeDesc = '';
          if (isHighlighted && isLive) {
            if (change > 0) {
              changeEl = <span aria-hidden="true" style={{ color: '#22c55e', fontSize: 10, fontWeight: 600 }}>↑{change}</span>;
              changeDesc = `up ${change} place${change !== 1 ? 's' : ''}`;
            } else if (change < 0) {
              changeEl = <span aria-hidden="true" style={{ color: '#ef4444', fontSize: 10, fontWeight: 600 }}>↓{Math.abs(change)}</span>;
              changeDesc = `down ${Math.abs(change)} place${Math.abs(change) !== 1 ? 's' : ''}`;
            } else {
              changeEl = <span aria-hidden="true" style={{ color: 'var(--ink-3)', fontSize: 10 }}>–</span>;
              changeDesc = 'no change';
            }
          }

          // Qualification color left accent (only on desktop — too narrow on mobile)
          const qualBorder = !isMobile && row.qualColor
            ? `3px solid ${row.qualColor}`
            : isHighlighted
              ? '3px solid var(--pulse)'
              : '3px solid transparent';

          const rowLabel = [
            `${rank}. ${row.name}`,
            `${row.played} played`,
            showWDL ? `${row.wins}W ${row.draws}D ${row.losses}L` : '',
            `GD ${gdStr}`,
            `${pts} points`,
            isHighlighted && isLive ? changeDesc : '',
          ].filter(Boolean).join(', ');

          return (
            <div
              key={row.teamId}
              role="row"
              aria-label={rowLabel}
              style={{
                display: 'grid', gridTemplateColumns: cols, gap: 6,
                padding: '7px 8px', borderRadius: 4, alignItems: 'center',
                background: isHighlighted ? 'var(--paper-2)' : 'transparent',
                borderLeft: qualBorder,
              }}
            >
              <div role="cell" className="mono" aria-hidden="true" style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right' }}>{rank}</div>
              <div role="cell" className="mono" aria-hidden="true" style={{ fontSize: 10, textAlign: 'center', minWidth: 16 }}>{changeEl}</div>
              <div role="cell" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, minWidth: 0 }}>
                <img src={row.logo} alt="" aria-hidden="true" width={18} height={18}
                  style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className={isHighlighted ? 'serif' : 'mono'} style={{ fontSize: isHighlighted ? 14 : 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.shortName}
                </span>
              </div>
              {showWDL ? (
                <>
                  {[row.played, row.wins, row.draws, row.losses, gdStr].map((val, i) => (
                    <div key={i} role="cell" aria-hidden="true" className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--ink-3)' }}>{val}</div>
                  ))}
                </>
              ) : (
                <>
                  <div role="cell" aria-hidden="true" className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--ink-3)' }}>{row.played}</div>
                  <div role="cell" aria-hidden="true" className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--ink-3)' }}>{gdStr}</div>
                </>
              )}
              <div role="cell" aria-hidden="true" className="mono" style={{ fontSize: 12, textAlign: 'right', fontWeight: isHighlighted ? 700 : 400 }}>{pts}</div>
            </div>
          );
        })}
      </div>

      {/* Qualification legend (desktop only) */}
      {!isMobile && (() => {
        const colors = new Map<string, string>();
        standings.forEach(r => { if (r.qualColor) colors.set(r.qualColor, ''); });
        const QUAL_LABELS: Record<string, string> = {
          '#2AD572': 'Champions League',
          '#F5A623': 'Europa League',
          '#6ABEFF': 'Conference League',
          '#E03030': 'Relegation',
        };
        if (!colors.size) return null;
        return (
          <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
            {[...colors.keys()].map(c => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c, flexShrink: 0 }} aria-hidden="true" />
                <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{QUAL_LABELS[c] ?? c}</span>
              </div>
            ))}
          </div>
        );
      })()}
    </section>
  );
}

// ── No match-details callout ──────────────────────────────────────────────────

function FotmobNote({ isMobile }: { isMobile: boolean }) {
  return (
    <div
      role="note"
      style={{
        margin: isMobile ? '0 16px 20px' : '0 40px 24px',
        padding: '14px 18px',
        borderRadius: 8,
        border: '1px solid var(--rule-soft)',
        background: 'var(--paper-2)',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.2 }}>ℹ️</span>
      <div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-3)', marginBottom: 4 }}>
          FOTMOB DATA SCOPE
        </div>
        <p className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0, lineHeight: 1.6 }}>
          Live score, clock, and standings come from FotMob's public league endpoint.
          Detailed match stats and events require FotMob's match API which is protected
          by Cloudflare Turnstile — those columns show once a proxy or token is available.
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TestFotmobPage() {
  const isMobile = useIsMobile();

  const [match, setMatch] = useState<MatchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const [liveClock, setLiveClock] = useState('');
  const clockBase = useRef<{ seconds: number; fetchedAt: number } | null>(null);

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/test-fotmob/${MATCH_ID}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const incoming: MatchData = data.match;
      setMatch(incoming);
      setError(null);
      setLastFetched(Date.now());

      if (incoming.state === 'in' && incoming.liveClock) {
        clockBase.current = { seconds: clockToSeconds(incoming.liveClock), fetchedAt: Date.now() };
      } else {
        clockBase.current = null;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  useEffect(() => {
    const interval = match?.state === 'in' ? POLL_LIVE : POLL_IDLE;
    const id = setInterval(fetchMatch, interval);
    return () => clearInterval(id);
  }, [fetchMatch, match?.state]);

  // 1-second ticker for live clock
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      if (clockBase.current) {
        const elapsed = Math.floor((Date.now() - clockBase.current.fetchedAt) / 1000);
        setLiveClock(secondsToClock(clockBase.current.seconds + elapsed));
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="screen" style={{ padding: isMobile ? 24 : 60 }} role="status" aria-live="polite">
        <p className="serif it" style={{ fontSize: 24, color: 'var(--ink-3)', margin: 0 }}>Loading match…</p>
        <p className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 10 }}>Fetching FotMob data for match {MATCH_ID}</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="screen" style={{ padding: isMobile ? 24 : 60 }} role="alert">
        <p className="serif" style={{ fontSize: 24, margin: 0 }}>Could not load match</p>
        <p className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10 }}>{error}</p>
        <button className="btn" onClick={fetchMatch} aria-label="Retry loading match" style={{ marginTop: 20, minHeight: 44, padding: '0 20px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="screen" style={{ minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden' }}>
      <Toaster position={isMobile ? 'top-center' : 'bottom-right'} />

      {/* Header */}
      <header style={{
        padding: isMobile ? '10px 16px' : '12px 40px',
        borderBottom: '1px solid var(--rule)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--paper-2)', flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)' }}>
            FOTMOB · {match.league.toUpperCase()} · GW{match.round}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 3,
              background: 'rgba(0,120,255,0.12)', color: '#0078ff',
              letterSpacing: '0.1em',
            }}
          >
            FOTMOB
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div role="status" aria-live="polite" className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
            {lastFetched ? `Updated ${ago(lastFetched)}` : 'Fetching…'}
          </div>
          <button
            className="btn"
            onClick={fetchMatch}
            aria-label="Refresh match data"
            style={{ fontSize: 10, padding: '0 12px', minHeight: 36 }}
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Score */}
      <ScoreHero match={match} liveClock={liveClock} isMobile={isMobile} />

      {/* FotMob scope note */}
      <div style={{ paddingTop: isMobile ? 16 : 20 }}>
        <FotmobNote isMobile={isMobile} />
      </div>

      {/* Standings */}
      <div style={{ borderTop: '1px solid var(--rule)' }}>
        <StandingsTable
          standings={match.standings}
          projectedStandings={match.projectedStandings}
          homeId={match.homeTeam.id}
          awayId={match.awayTeam.id}
          isLive={match.state === 'in'}
          isMobile={isMobile}
        />
      </div>

      {/* Raw response */}
      <div style={{
        padding: isMobile ? '16px' : '24px 40px',
        borderTop: '1px solid var(--rule)',
      }}>
        <details>
          <summary className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', cursor: 'pointer', letterSpacing: '0.16em', minHeight: 36, display: 'flex', alignItems: 'center', userSelect: 'none' }}>
            RAW API RESPONSE
          </summary>
          <pre style={{ padding: 12, background: 'var(--paper-2)', borderRadius: 8, fontSize: 9, overflow: 'auto', maxHeight: 400, color: 'var(--ink)', marginTop: 12 }}>
            {JSON.stringify(match, null, 2)}
          </pre>
        </details>
      </div>

      <div style={{ height: isMobile ? 32 : 0 }} aria-hidden="true" />
    </div>
  );
}
