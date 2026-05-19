'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { TestMatchSkeleton } from '@/components/skeleton/TestMatchSkeleton';

const GAME_ID = '740958';
const POLL_LIVE = 15_000;
const POLL_IDLE = 30_000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  score: string;
  color: string;
  winner: boolean;
}

interface KeyEvent {
  id: string;
  clock: string;
  period: number;
  typeSlug: string;
  typeText: string;
  text: string;
  fullText: string;
  scoringPlay: boolean;
  teamName: string;
  homeScore: number | null;
  awayScore: number | null;
  participants: { athlete: string; team: string }[];
}

interface StatLine {
  name: string;
  label: string;
  displayValue: string;
}

interface TeamStats {
  teamId: string;
  teamName: string;
  stats: StatLine[];
}

interface NewsItem {
  id: string;
  headline: string;
  description: string;
  published: string;
  image: string | null;
  link: string;
  source: string;
}

interface StandingRow {
  teamId: string;
  name: string;
  abbreviation: string;
  logo: string;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  gd: number;
  projectedPoints: number;
  projectedGd: number;
  projectedRank: number;
  rankChange: number;
}

interface LeaderCategory {
  category: string;
  value: string;
  athlete: { name: string; id: string };
}

interface TeamLeaders {
  teamId: string;
  teamName: string;
  teamLogo: string;
  categories: LeaderCategory[];
}

interface MatchData {
  id: string;
  league: string;
  date: string;
  state: 'pre' | 'in' | 'post';
  statusDetail: string;
  statusShort: string;
  statusTypeName: string;
  displayClock: string;
  period: number;
  homeTeam: Team;
  awayTeam: Team;
  venue: { name: string; city: string; country: string };
  broadcast: string;
  keyEvents: KeyEvent[];
  teamStats: TeamStats[];
  news: NewsItem[];
  standings: StandingRow[];
  projectedStandings: StandingRow[];
  teamLeaders: TeamLeaders[];
  isMatchLeaders: boolean;
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

const STAT_KEYS = [
  'possessionPct', 'totalShots', 'shotsOnTarget', 'fouls',
  'offsides', 'cornersTotal', 'yellowCards', 'redCards', 'saves',
];

const STAT_LABELS: Record<string, string> = {
  possessionPct: 'Possession', totalShots: 'Shots', shotsOnTarget: 'On Target',
  fouls: 'Fouls', offsides: 'Offsides', cornersTotal: 'Corners',
  yellowCards: 'Yellow Cards', redCards: 'Red Cards', saves: 'Saves',
};

function eventIcon(typeSlug: string, scoringPlay: boolean): string {
  if (scoringPlay || typeSlug === 'goal' || typeSlug === 'own-goal' || typeSlug === 'penalty-scored') return '⚽';
  if (typeSlug === 'yellow-card') return '🟨';
  if (typeSlug === 'red-card' || typeSlug === 'yellow-red-card') return '🟥';
  if (typeSlug === 'substitution') return '↔';
  if (typeSlug === 'shot-on-target') return '→';
  return '•';
}

function eventLabel(typeSlug: string, scoringPlay: boolean): string {
  if (scoringPlay || typeSlug === 'goal') return 'Goal';
  if (typeSlug === 'own-goal') return 'Own Goal';
  if (typeSlug === 'penalty-scored') return 'Penalty Goal';
  if (typeSlug === 'yellow-card') return 'Yellow Card';
  if (typeSlug === 'red-card') return 'Red Card';
  if (typeSlug === 'yellow-red-card') return 'Second Yellow / Red Card';
  if (typeSlug === 'substitution') return 'Substitution';
  if (typeSlug === 'shot-on-target') return 'Shot on Target';
  return typeSlug;
}

function formatKickoff(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1) return `${h}h ago`;
  if (m >= 1) return `${m}m ago`;
  return 'just now';
}

function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function isHalftime(m: Pick<MatchData, 'statusTypeName' | 'statusDetail' | 'statusShort'>): boolean {
  if (m.statusTypeName === 'STATUS_HALFTIME') return true;
  const detail = (m.statusDetail ?? '').toUpperCase();
  const short = (m.statusShort ?? '').toUpperCase();
  return detail === 'HT' || short === 'HT' || /halftime/i.test(m.statusDetail ?? '');
}

// ── Score hero ────────────────────────────────────────────────────────────────

function ScoreHero({ match, liveClock, isMobile }: { match: MatchData; liveClock: string; isMobile: boolean }) {
  const { homeTeam, awayTeam, state, statusDetail, displayClock, date } = match;
  const ht = isHalftime(match);
  const clockDisplay = state === 'in' && !ht ? (liveClock || displayClock) : displayClock;
  const pad = isMobile ? '20px 16px' : '36px 32px';
  const logoSize = isMobile ? 44 : 64;
  const nameFontSize = isMobile ? 18 : 28;
  const scoreFontSize = isMobile ? 44 : 64;

  const scoreLabel = state !== 'pre'
    ? `${homeTeam.name} ${homeTeam.score}, ${awayTeam.name} ${awayTeam.score}`
    : `${homeTeam.name} vs ${awayTeam.name}`;

  return (
    <div
      role="region"
      aria-label="Match score"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
        gap: isMobile ? 8 : 16,
        alignItems: 'center',
        padding: pad,
        borderBottom: '1px solid var(--rule)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Home */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14, minWidth: 0 }}>
        {homeTeam.logo && (
          <img
            src={homeTeam.logo}
            alt={homeTeam.name}
            width={logoSize}
            height={logoSize}
            style={{ width: logoSize, height: logoSize, objectFit: 'contain', flexShrink: 0 }}
          />
        )}
        <div style={{ minWidth: 0 }}>
          <div
            className="serif"
            style={{ fontSize: nameFontSize, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {isMobile ? homeTeam.abbreviation : homeTeam.name}
          </div>
          {!isMobile && (
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.18em', marginTop: 5 }}>
              {homeTeam.abbreviation}
            </div>
          )}
        </div>
        {state !== 'pre' && (
          <div
            className="serif tnum"
            aria-hidden="true"
            style={{ fontSize: scoreFontSize, lineHeight: 1, marginLeft: isMobile ? 4 : 8, flexShrink: 0 }}
          >
            {homeTeam.score}
          </div>
        )}
      </div>

      {/* Centre status */}
      <div style={{ textAlign: 'center', minWidth: isMobile ? 60 : 80, flexShrink: 0 }}>
        {state === 'in' && (
          <>
            <div
              className="mono"
              style={{ fontSize: 10, color: 'var(--live)', letterSpacing: '0.2em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            >
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
              <span className="sr-only">Live match — </span>LIVE
            </div>
            {ht ? (
              <div
                className="mono"
                aria-label="Halftime"
                style={{ fontSize: isMobile ? 22 : 28, marginTop: 8, letterSpacing: '0.12em', fontWeight: 500 }}
              >
                HT
              </div>
            ) : (
              <>
                <div
                  className="mono"
                  aria-live="polite"
                  aria-atomic="true"
                  aria-label={`Match clock: ${clockDisplay}`}
                  style={{ fontSize: isMobile ? 18 : 22, marginTop: 5, fontVariantNumeric: 'tabular-nums' }}
                >
                  {clockDisplay || '–'}
                </div>
                {statusDetail && statusDetail.toUpperCase() !== 'HT' && (
                  <div className="serif" style={{ fontSize: isMobile ? 10 : 11, fontStyle: 'italic', color: 'var(--ink-3)', marginTop: 3 }}>{statusDetail}</div>
                )}
              </>
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
            <div className="mono" style={{ fontSize: isMobile ? 16 : 20, color: 'var(--ink)' }} aria-hidden="true">VS</div>
            <div className="mono" style={{ fontSize: isMobile ? 8 : 9, color: 'var(--ink-3)', marginTop: 7, lineHeight: 1.6 }}>
              {formatKickoff(date)}
            </div>
          </>
        )}
      </div>

      {/* Away */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14, flexDirection: 'row-reverse', minWidth: 0 }}>
        {awayTeam.logo && (
          <img
            src={awayTeam.logo}
            alt={awayTeam.name}
            width={logoSize}
            height={logoSize}
            style={{ width: logoSize, height: logoSize, objectFit: 'contain', flexShrink: 0 }}
          />
        )}
        <div style={{ textAlign: 'right', minWidth: 0 }}>
          <div
            className="serif"
            style={{ fontSize: nameFontSize, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {isMobile ? awayTeam.abbreviation : awayTeam.name}
          </div>
          {!isMobile && (
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.18em', marginTop: 5 }}>
              {awayTeam.abbreviation}
            </div>
          )}
        </div>
        {state !== 'pre' && (
          <div
            className="serif tnum"
            aria-hidden="true"
            style={{ fontSize: scoreFontSize, lineHeight: 1, marginRight: isMobile ? 4 : 8, flexShrink: 0 }}
          >
            {awayTeam.score}
          </div>
        )}
      </div>

      {/* Screen-reader score summary */}
      <span className="sr-only">{scoreLabel}</span>
    </div>
  );
}

// ── Events feed ───────────────────────────────────────────────────────────────

function EventsFeed({ events }: { events: KeyEvent[] }) {
  if (!events.length) {
    return (
      <p className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', padding: '24px 0', margin: 0 }}>
        No key events yet.
      </p>
    );
  }
  return (
    <ol
      aria-label="Match events"
      style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      {[...events].reverse().map((ev) => {
        const icon = eventIcon(ev.typeSlug, ev.scoringPlay);
        const label = eventLabel(ev.typeSlug, ev.scoringPlay);
        const athlete = ev.participants?.[0]?.athlete || ev.text;
        return (
          <li
            key={ev.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 0',
              borderBottom: '1px solid var(--rule-soft)',
            }}
          >
            <div
              className="mono"
              aria-label={`${ev.clock} minute`}
              style={{ fontSize: 11, color: 'var(--ink-3)', minWidth: 36, flexShrink: 0, paddingTop: 2 }}
            >
              {ev.clock}
            </div>
            <div aria-hidden="true" style={{ fontSize: 16, flexShrink: 0, paddingTop: 1 }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="serif" style={{ fontSize: 15 }}>{athlete || ev.text}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                <span className="sr-only">{label} — </span>
                {ev.typeText}
                {ev.teamName ? ` · ${ev.teamName}` : ''}
              </div>
              {ev.scoringPlay && ev.homeScore != null && (
                <div
                  className="mono"
                  aria-label={`Score: ${ev.homeScore} – ${ev.awayScore}`}
                  style={{ fontSize: 10, color: 'var(--live)', marginTop: 3 }}
                >
                  {ev.homeScore} – {ev.awayScore}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ── Stats bars ────────────────────────────────────────────────────────────────

function StatsPanel({ teamStats, homeTeam, awayTeam }: { teamStats: TeamStats[]; homeTeam: Team; awayTeam: Team }) {
  const homeStats = teamStats.find((t) => t.teamId === homeTeam.id);
  const awayStats = teamStats.find((t) => t.teamId === awayTeam.id);
  if (!homeStats || !awayStats) {
    return <p className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0 }}>Stats available once match begins.</p>;
  }

  const homeMap = Object.fromEntries(homeStats.stats.map((s) => [s.name, s.displayValue]));
  const awayMap = Object.fromEntries(awayStats.stats.map((s) => [s.name, s.displayValue]));
  const available = STAT_KEYS.filter((k) => homeMap[k] !== undefined || awayMap[k] !== undefined);
  if (!available.length) {
    return <p className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0 }}>No stats yet.</p>;
  }

  return (
    <dl style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: 0 }}>
      {available.map((key) => {
        const hVal = homeMap[key] ?? '–';
        const aVal = awayMap[key] ?? '–';
        const hNum = parseFloat(hVal.replace('%', '')) || 0;
        const aNum = parseFloat(aVal.replace('%', '')) || 0;
        const total = hNum + aNum || 1;
        const hPct = Math.round((hNum / total) * 100);
        const statLabel = STAT_LABELS[key] ?? key;
        return (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <dt className="sr-only">{statLabel}</dt>
              <span className="mono" aria-label={`${homeTeam.name}: ${hVal}`} style={{ fontSize: 13 }}>{hVal}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em' }} aria-hidden="true">
                {statLabel.toUpperCase()}
              </span>
              <span className="mono" aria-label={`${awayTeam.name}: ${aVal}`} style={{ fontSize: 13 }}>{aVal}</span>
            </div>
            <div
              role="img"
              aria-label={`${statLabel}: ${homeTeam.abbreviation} ${hPct}%, ${awayTeam.abbreviation} ${100 - hPct}%`}
              style={{ height: 4, borderRadius: 2, background: 'var(--rule)', overflow: 'hidden', display: 'flex' }}
            >
              <div style={{ width: `${hPct}%`, background: homeTeam.color || 'var(--ink)', transition: 'width 0.6s ease' }} />
              <div style={{ flex: 1, background: awayTeam.color || 'var(--ink-3)' }} />
            </div>
          </div>
        );
      })}
    </dl>
  );
}

// ── Team leaders ──────────────────────────────────────────────────────────────

function LeadersSection({ teamLeaders, homeId, isMatchLeaders, isMobile }: {
  teamLeaders: TeamLeaders[];
  homeId: string;
  isMatchLeaders: boolean;
  isMobile: boolean;
}) {
  if (!teamLeaders.length) return null;
  const label = isMatchLeaders ? 'MATCH LEADERS' : 'SEASON LEADERS';
  const sorted = [...teamLeaders].sort((a) => (a.teamId === homeId ? -1 : 1));

  return (
    <section
      aria-label={label}
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 1,
        background: 'var(--rule)',
      }}
    >
      {sorted.map((team) => {
        const cats = team.categories.filter((c) => c.athlete.name && c.value);
        if (!cats.length) return null;
        return (
          <div key={team.teamId} style={{ background: 'var(--paper)', padding: isMobile ? '20px 16px' : '24px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              {team.teamLogo && (
                <img src={team.teamLogo} alt="" aria-hidden="true" width={28} height={28}
                  style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />
              )}
              <h3 className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)', margin: 0 }}>
                {team.teamName.toUpperCase()} · {label}
              </h3>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {cats.map((cat, i) => {
                const num = cat.value.match(/\d+(?:\.\d+)?/g)?.slice(-1)?.[0] ?? cat.value;
                return (
                  <li
                    key={cat.category}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: i < cats.length - 1 ? '1px solid var(--rule-soft)' : 'none',
                    }}
                  >
                    <div>
                      <div className="mono" style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-3)', marginBottom: 3 }}>
                        {cat.category.toUpperCase()}
                      </div>
                      <div className="serif" style={{ fontSize: 17 }}>{cat.athlete.name}</div>
                    </div>
                    <div
                      className="serif tnum"
                      aria-label={`${num} ${cat.category}`}
                      style={{ fontSize: 28, color: 'var(--ink)', flexShrink: 0, marginLeft: 12 }}
                    >
                      {num}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
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

  // On mobile: hide W / D / L to fit within viewport
  const showWDL = !isMobile;
  const pad = isMobile ? '20px 16px' : '28px 32px';

  // Column template changes with viewport
  const cols = showWDL
    ? '20px 16px 1fr 32px 32px 32px 32px 32px 44px'
    : '20px 16px 1fr 28px 32px 44px';
  const headers = showWDL
    ? ['', '', 'Team', 'P', 'W', 'D', 'L', 'GD', 'Pts']
    : ['', '', 'Team', 'P', 'GD', 'Pts'];

  return (
    <section aria-label="League standings" style={{ padding: pad }}>
      <div
        style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          borderBottom: '1px solid var(--rule)', paddingBottom: 10, marginBottom: 16,
          flexWrap: 'wrap', gap: 6,
        }}
      >
        <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', margin: 0 }}>
          PREMIER LEAGUE TABLE
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

      {/* Table */}
      <div role="table" aria-label="Premier League standings">
        {/* Header */}
        <div
          role="row"
          style={{ display: 'grid', gridTemplateColumns: cols, gap: 6, padding: '6px 8px', borderBottom: '1px solid var(--rule)', marginBottom: 4 }}
        >
          {headers.map((h, i) => (
            <div
              key={i}
              role="columnheader"
              className="mono"
              style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.14em', textAlign: (h === 'Team' || h === '') ? 'left' : 'right' }}
            >
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

          let changeEl: React.ReactNode = null;
          let changeDesc = '';
          if (isHighlighted && isLive) {
            if (change > 0) {
              changeEl = <span aria-hidden="true" style={{ color: '#22c55e', fontSize: 10 }}>↑{change}</span>;
              changeDesc = `up ${change} place${change !== 1 ? 's' : ''}`;
            } else if (change < 0) {
              changeEl = <span aria-hidden="true" style={{ color: '#ef4444', fontSize: 10 }}>↓{Math.abs(change)}</span>;
              changeDesc = `down ${Math.abs(change)} place${Math.abs(change) !== 1 ? 's' : ''}`;
            } else {
              changeEl = <span aria-hidden="true" style={{ color: 'var(--ink-3)', fontSize: 10 }}>–</span>;
              changeDesc = 'no change';
            }
          }

          const gdStr = gd >= 0 ? `+${gd}` : String(gd);
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
                borderLeft: isHighlighted ? '2px solid var(--pulse)' : '2px solid transparent',
              }}
            >
              <div role="cell" className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right' }} aria-hidden="true">{rank || '–'}</div>
              <div role="cell" className="mono" style={{ fontSize: 10, textAlign: 'center', minWidth: 14 }} aria-hidden="true">{changeEl}</div>
              <div role="cell" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, minWidth: 0 }}>
                {row.logo && <img src={row.logo} alt="" aria-hidden="true" width={18} height={18} style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }} />}
                <span className={isHighlighted ? 'serif' : 'mono'} style={{ fontSize: isHighlighted ? 14 : 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.abbreviation || row.name}
                </span>
              </div>
              {showWDL ? (
                <>
                  {[row.played, row.wins, row.draws, row.losses, gdStr].map((val, i) => (
                    <div key={i} role="cell" className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--ink-3)' }} aria-hidden="true">{val}</div>
                  ))}
                </>
              ) : (
                <>
                  <div role="cell" className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--ink-3)' }} aria-hidden="true">{row.played}</div>
                  <div role="cell" className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--ink-3)' }} aria-hidden="true">{gdStr}</div>
                </>
              )}
              <div role="cell" className="mono" style={{ fontSize: 12, textAlign: 'right', fontWeight: isHighlighted ? 700 : 400 }} aria-hidden="true">{pts}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── News ──────────────────────────────────────────────────────────────────────

function NewsSection({ news, isMobile }: { news: NewsItem[]; isMobile: boolean }) {
  if (!news.length) return null;
  const cardWidth = isMobile ? 220 : 260;
  return (
    <section aria-label="Latest news" style={{ padding: isMobile ? '20px 16px' : '28px 32px', borderTop: '1px solid var(--rule)' }}>
      <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', marginBottom: 16, marginTop: 0 }}>
        LATEST NEWS
      </h2>
      <div
        role="list"
        style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}
      >
        {news.map((item) => (
          <a
            key={item.id}
            role="listitem"
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.headline} — ${timeAgo(item.published)}`}
            style={{
              flexShrink: 0, width: cardWidth, textDecoration: 'none', color: 'inherit',
              border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden',
              background: 'var(--paper)', display: 'flex', flexDirection: 'column',
            }}
          >
            {item.image && (
              <div style={{ height: isMobile ? 110 : 140, overflow: 'hidden', background: 'var(--paper-2)', flexShrink: 0 }}>
                <img
                  src={item.image}
                  alt=""
                  aria-hidden="true"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p className="serif" style={{ fontSize: isMobile ? 13 : 14, lineHeight: 1.4, margin: 0 }}>{item.headline}</p>
              {item.description && (
                <p className="mono" style={{
                  fontSize: 10, color: 'var(--ink-3)', lineHeight: 1.5, margin: 0,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {item.description}
                </p>
              )}
              <p className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 'auto', marginBottom: 0, letterSpacing: '0.1em' }}>
                ESPN · {timeAgo(item.published)}
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

// ── Toast helpers ─────────────────────────────────────────────────────────────

const BASE_TOAST: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: 12,
  letterSpacing: '0.04em',
  borderRadius: 8,
  padding: '14px 16px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
  minWidth: 260,
  maxWidth: 340,
};

function toastForEvent(ev: KeyEvent, home: Team, away: Team) {
  const slug = ev.typeSlug;
  const athlete = ev.participants?.[0]?.athlete || ev.text || 'Unknown';
  const teamName = ev.teamName || '';
  const clock = ev.clock ? `${ev.clock}` : '';
  const scoreStr = ev.homeScore != null
    ? `${home.name}  ${ev.homeScore} – ${ev.awayScore}  ${away.name}`
    : '';

  if (ev.scoringPlay || slug === 'goal' || slug === 'penalty-scored') {
    toast(`⚽  GOAL!  ${athlete}`, {
      description: scoreStr ? `${clock ? clock + '  ·  ' : ''}${scoreStr}` : clock,
      duration: 8000,
      style: { ...BASE_TOAST, background: '#111', color: '#f2ede3', border: '1.5px solid #e63c3c' },
    });
  } else if (slug === 'own-goal') {
    toast(`⚽  Own Goal  —  ${athlete}`, {
      description: scoreStr ? `${clock ? clock + '  ·  ' : ''}${scoreStr}` : clock,
      duration: 8000,
      style: { ...BASE_TOAST, background: '#111', color: '#f2ede3', border: '1.5px solid #e63c3c' },
    });
  } else if (slug === 'yellow-card') {
    toast(`🟨  Yellow Card  —  ${athlete}`, {
      description: `${clock ? clock + '  ·  ' : ''}${teamName}`,
      duration: 5000,
      style: { ...BASE_TOAST, background: '#fffbea', color: '#1a1a1a', border: '1.5px solid #e6b800' },
    });
  } else if (slug === 'red-card' || slug === 'yellow-red-card') {
    toast(`🟥  Red Card  —  ${athlete}`, {
      description: `${clock ? clock + '  ·  ' : ''}${teamName}`,
      duration: 7000,
      style: { ...BASE_TOAST, background: '#1e0505', color: '#f2ede3', border: '1.5px solid #c0392b' },
    });
  } else if (slug === 'substitution') {
    toast(`↔  Substitution  —  ${athlete}`, {
      description: `${clock ? clock + '  ·  ' : ''}${teamName}`,
      duration: 4000,
      style: { ...BASE_TOAST, background: 'var(--paper, #f2ede3)', color: 'var(--ink, #1a1a1a)', border: '1px solid #ccc' },
    });
  } else {
    toast(ev.text || ev.typeText, {
      description: `${clock ? clock + '  ·  ' : ''}${teamName}`,
      duration: 4000,
      style: { ...BASE_TOAST, background: 'var(--paper, #f2ede3)', color: 'var(--ink, #1a1a1a)', border: '1px solid #ccc' },
    });
  }
}

// ── Clock helpers ─────────────────────────────────────────────────────────────

function parseClockToSeconds(clock: string, period = 1): number {
  const cleaned = clock.replace(/'/g, '').trim();
  const m = cleaned.match(/^(\d+)(?:\+(\d+))?/);
  if (!m) return period >= 2 ? 45 * 60 : 0;
  let minutes = parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) : 0);
  // ESPN 2nd-half clocks are often 1'–44' relative to the half; map to match minute.
  if (period >= 2 && minutes < 45) minutes += 45;
  return minutes * 60;
}

function secondsToClock(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mono" style={{
      fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)',
      margin: 0, marginBottom: 16, paddingBottom: 10,
      borderBottom: '1px solid var(--rule)',
    }}>
      {children}
    </h2>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TestMatchPage() {
  const isMobile = useIsMobile();

  const [match, setMatch] = useState<MatchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const [liveClock, setLiveClock] = useState<string>('');
  const clockBase = useRef<{ seconds: number; fetchedAt: number } | null>(null);
  const wasHalftime = useRef(false);
  const seenEventIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const pad = isMobile ? '0 16px' : '0 32px';

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/test-match/${GAME_ID}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const incoming: MatchData = data.match;

      if (isFirstLoad.current) {
        incoming.keyEvents.forEach((ev) => seenEventIds.current.add(ev.id));
        isFirstLoad.current = false;
      } else {
        incoming.keyEvents
          .filter((ev) => !seenEventIds.current.has(ev.id))
          .forEach((ev) => {
            seenEventIds.current.add(ev.id);
            toastForEvent(ev, incoming.homeTeam, incoming.awayTeam);
          });
      }

      setMatch(incoming);
      setError(null);
      setLastFetched(Date.now());

      const ht = isHalftime(incoming);
      if (incoming.state === 'in' && ht) {
        wasHalftime.current = true;
        clockBase.current = null;
        setLiveClock('');
      } else if (incoming.state === 'in') {
        const period = incoming.period ?? 1;
        let secs: number;
        if (wasHalftime.current && period >= 2) {
          wasHalftime.current = false;
          secs = 45 * 60;
        } else if (incoming.displayClock) {
          secs = parseClockToSeconds(incoming.displayClock, period);
        } else {
          secs = period >= 2 ? 45 * 60 : 0;
        }
        clockBase.current = { seconds: secs, fetchedAt: Date.now() };
        setLiveClock(secondsToClock(secs));
      } else {
        wasHalftime.current = false;
        clockBase.current = null;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load match');
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

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      if (clockBase.current && match && !isHalftime(match)) {
        const elapsed = Math.floor((Date.now() - clockBase.current.fetchedAt) / 1000);
        setLiveClock(secondsToClock(clockBase.current.seconds + elapsed));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [match?.statusTypeName, match?.statusDetail, match?.statusShort]);

  if (loading) {
    return <TestMatchSkeleton isMobile={isMobile} />;
  }

  if (error || !match) {
    return (
      <div className="screen" style={{ padding: isMobile ? 24 : 60 }} role="alert">
        <p className="serif" style={{ fontSize: 24, margin: 0 }}>Match not found</p>
        <p className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10 }}>{error}</p>
        <button
          className="btn"
          onClick={fetchMatch}
          style={{ marginTop: 20, minHeight: 44, padding: '0 20px' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="screen" style={{ minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden' }}>
      <Toaster position={isMobile ? 'top-center' : 'bottom-right'} expand={!isMobile} gap={8} />

      {/* ── Header ── */}
      <header
        style={{
          padding: isMobile ? '10px 16px' : '12px 32px',
          borderBottom: '1px solid var(--rule)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--paper-2)', flexWrap: 'wrap', gap: 8,
        }}
      >
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)' }}>
          ESPN · {match.league.toUpperCase()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div
            className="mono"
            role="status"
            aria-live="polite"
            style={{ fontSize: 10, color: 'var(--ink-3)' }}
          >
            {lastFetched ? `Updated ${ago(lastFetched)}` : 'Fetching…'}
          </div>
          {!isMobile && (
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
              Polls every {match.state === 'in' ? '15s' : '30s'}
            </div>
          )}
          <button
            className="btn"
            onClick={fetchMatch}
            aria-label="Refresh match data"
            style={{ fontSize: 10, padding: '0 12px', minHeight: 36 }}
          >
            Refresh
          </button>
          {!isMobile && (
            <button
              className="btn"
              aria-label="Test toast notifications"
              style={{ fontSize: 10, padding: '0 12px', minHeight: 36, background: 'var(--pulse)', color: '#fff', border: 'none' }}
              onClick={() => {
                const fakeEvents: KeyEvent[] = [
                  { id: 'demo-goal', clock: "23'", period: 1, typeSlug: 'goal', typeText: 'Goal', text: 'Goal!', fullText: 'Goal!', scoringPlay: true, teamName: match.awayTeam.name, homeScore: 1, awayScore: 0, participants: [{ athlete: 'Erling Haaland', team: match.awayTeam.name }] },
                  { id: 'demo-yellow', clock: "45+2'", period: 1, typeSlug: 'yellow-card', typeText: 'Yellow Card', text: 'Foul', fullText: 'Foul', scoringPlay: false, teamName: match.homeTeam.name, homeScore: null, awayScore: null, participants: [{ athlete: 'Lewis Cook', team: match.homeTeam.name }] },
                  { id: 'demo-red', clock: "78'", period: 2, typeSlug: 'red-card', typeText: 'Red Card', text: 'Serious foul', fullText: 'Serious foul', scoringPlay: false, teamName: match.homeTeam.name, homeScore: null, awayScore: null, participants: [{ athlete: 'Marcos Senesi', team: match.homeTeam.name }] },
                ];
                fakeEvents.forEach((ev, i) => setTimeout(() => toastForEvent(ev, match.homeTeam, match.awayTeam), i * 800));
              }}
            >
              Test Toasts
            </button>
          )}
        </div>
      </header>

      {/* ── Score hero ── */}
      <ScoreHero match={match} liveClock={liveClock} isMobile={isMobile} />

      {/* ── Venue / broadcast ── */}
      <div
        style={{
          padding: isMobile ? '8px 16px' : '10px 32px',
          borderBottom: '1px solid var(--rule)',
          background: 'var(--paper-2)',
        }}
      >
        <p
          className="mono"
          style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {[match.venue.name, match.venue.city, match.venue.country].filter(Boolean).join(' · ').toUpperCase()}
          {match.broadcast ? ` · ${match.broadcast.toUpperCase()}` : ''}
        </p>
      </div>

      {/* ── Events + Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', borderBottom: '1px solid var(--rule)' }}>
        <section
          aria-label="Key events"
          style={{ padding: isMobile ? '20px 16px' : '28px 32px', borderRight: isMobile ? 'none' : '1px solid var(--rule)', borderBottom: isMobile ? '1px solid var(--rule)' : 'none' }}
        >
          <SectionLabel>KEY EVENTS ({match.keyEvents.length})</SectionLabel>
          <EventsFeed events={match.keyEvents} />
        </section>
        <section
          aria-label="Match statistics"
          style={{ padding: isMobile ? '20px 16px' : '28px 32px' }}
        >
          <SectionLabel>MATCH STATS</SectionLabel>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div aria-hidden="true" style={{ width: 11, height: 11, borderRadius: 2, background: match.homeTeam.color, flexShrink: 0 }} />
              <span className="mono" style={{ fontSize: 11 }}>{match.homeTeam.abbreviation}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span className="mono" style={{ fontSize: 11 }}>{match.awayTeam.abbreviation}</span>
              <div aria-hidden="true" style={{ width: 11, height: 11, borderRadius: 2, background: match.awayTeam.color, flexShrink: 0 }} />
            </div>
          </div>
          <StatsPanel teamStats={match.teamStats} homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
        </section>
      </div>

      {/* ── Leaders ── */}
      {match.teamLeaders.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--rule)' }}>
          <LeadersSection
            teamLeaders={match.teamLeaders}
            homeId={match.homeTeam.id}
            isMatchLeaders={match.isMatchLeaders}
            isMobile={isMobile}
          />
        </div>
      )}

      {/* ── News ── */}
      {match.news.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--rule)' }}>
          <NewsSection news={match.news} isMobile={isMobile} />
        </div>
      )}

      {/* ── Standings ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : match.standings.length ? '1fr 1fr' : '1fr',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        {match.standings.length > 0 && (
          <StandingsTable
            standings={match.standings}
            projectedStandings={match.projectedStandings ?? []}
            homeId={match.homeTeam.id}
            awayId={match.awayTeam.id}
            isLive={match.state === 'in'}
            isMobile={isMobile}
          />
        )}
        <div
          style={{
            padding: isMobile ? '20px 16px' : '28px 32px',
            borderLeft: !isMobile && match.standings.length ? '1px solid var(--rule)' : 'none',
            borderTop: isMobile && match.standings.length ? '1px solid var(--rule)' : 'none',
          }}
        >
          <details>
            <summary
              className="mono"
              style={{ fontSize: 10, color: 'var(--ink-3)', cursor: 'pointer', letterSpacing: '0.16em', marginBottom: 12, userSelect: 'none', minHeight: 36, display: 'flex', alignItems: 'center' }}
            >
              RAW API RESPONSE
            </summary>
            <pre
              style={{ padding: 12, background: 'var(--paper-2)', borderRadius: 8, fontSize: 9, overflow: 'auto', maxHeight: 400, color: 'var(--ink)', tabSize: 2 }}
            >
              {JSON.stringify(match, null, 2)}
            </pre>
          </details>
        </div>
      </div>

      {/* Spacer so last section isn't right at the bottom on mobile */}
      <div style={{ height: isMobile ? 32 : 0 }} aria-hidden="true" />
    </div>
  );
}
