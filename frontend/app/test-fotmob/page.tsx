'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { PitchPulseToaster } from '@/components/PitchPulseToaster';
import { showMatchEventToast } from '@/lib/match-toasts';

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
  espnId: string;
  color: string;
  abbreviation: string;
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

interface TeamStat {
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

interface LeaderCategory {
  category: string;
  value: string;
  athlete: { name: string; id: string };
}

interface TeamLeader {
  teamId: string;
  teamName: string;
  teamLogo: string;
  categories: LeaderCategory[];
}

interface MatchData {
  id: string;
  league: string;
  leagueId: number;
  source: string;
  round: string;
  date: string;
  state: 'pre' | 'in' | 'post';
  isHalftime: boolean;
  statusDetail: string;
  liveClock: string;
  homeTeam: FotmobTeam;
  awayTeam: FotmobTeam;
  keyEvents: KeyEvent[];
  teamStats: TeamStat[];
  news: NewsItem[];
  teamLeaders: TeamLeader[];
  isMatchLeaders: boolean;
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

function eventIcon(typeSlug: string): string {
  switch (typeSlug) {
    case 'goal': case 'penalty-scored': return '⚽';
    case 'own-goal': return '⚽';
    case 'yellow-card': return '🟨';
    case 'red-card': return '🟥';
    case 'yellow-red-card': return '🟧';
    case 'substitution': return '🔄';
    case 'shot-on-target': return '🎯';
    default: return '•';
  }
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
  const { homeTeam, awayTeam, state, isHalftime, statusDetail, date } = match;
  const clockDisplay = state === 'in' && !isHalftime ? liveClock || match.liveClock : '';
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
              {homeTeam.abbreviation}
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
        {state === 'in' && isHalftime && (
          <>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.22em' }}>
              HALF TIME
            </div>
            <div className="mono" style={{ fontSize: isMobile ? 20 : 26, marginTop: 6, color: 'var(--ink-3)' }}>
              HT
            </div>
          </>
        )}
        {state === 'in' && !isHalftime && (
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
              {awayTeam.abbreviation}
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

// ── Key events feed ───────────────────────────────────────────────────────────

function EventsFeed({
  events,
  homeTeam,
  awayTeam,
  isMobile,
}: {
  events: KeyEvent[];
  homeTeam: FotmobTeam;
  awayTeam: FotmobTeam;
  isMobile: boolean;
}) {
  if (!events.length) return null;

  return (
    <section
      aria-label="Key match events"
      style={{ padding: isMobile ? '20px 16px' : '28px 40px', borderTop: '1px solid var(--rule)' }}
    >
      <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', margin: '0 0 16px', paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
        KEY EVENTS
      </h2>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[...events].reverse().map((ev) => {
          const isHome = ev.teamName === homeTeam.name;
          const isAway = ev.teamName === awayTeam.name;
          const icon = eventIcon(ev.typeSlug);
          const athlete = ev.participants[0]?.athlete ?? ev.text;
          const isGoal = ev.scoringPlay || ev.typeSlug === 'goal' || ev.typeSlug === 'penalty-scored';
          const teamColor = isHome ? homeTeam.color : isAway ? awayTeam.color : 'var(--ink-3)';

          return (
            <li
              key={ev.id}
              aria-label={`${ev.clock} — ${ev.typeText} — ${athlete} (${ev.teamName})`}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '36px 1fr' : '44px 1fr',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 6,
                background: isGoal ? 'var(--paper-2)' : 'transparent',
                borderLeft: isGoal ? `3px solid ${teamColor}` : '3px solid transparent',
                alignItems: 'flex-start',
              }}
            >
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', paddingTop: 1, textAlign: 'right' }}>
                {ev.clock}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
                  <span className="serif" style={{ fontSize: isMobile ? 13 : 14, lineHeight: 1.2 }}>
                    {athlete}
                  </span>
                  {isGoal && ev.homeScore != null && ev.awayScore != null && (
                    <span className="mono tnum" style={{
                      fontSize: 11, padding: '1px 7px', borderRadius: 3,
                      background: teamColor, color: '#fff', letterSpacing: '0.05em',
                    }}>
                      {ev.homeScore}–{ev.awayScore}
                    </span>
                  )}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                  {ev.typeText}{ev.teamName ? ` · ${ev.teamName}` : ''}
                </div>
                {ev.fullText && ev.fullText !== ev.text && (
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.5, fontStyle: 'italic' }}>
                    {ev.fullText}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ── Match stats ───────────────────────────────────────────────────────────────

function parseNum(v: string): number {
  return parseFloat(v.replace(/[^0-9.]/g, '')) || 0;
}

function StatsPanel({
  teamStats,
  homeTeam,
  awayTeam,
  isMobile,
}: {
  teamStats: TeamStat[];
  homeTeam: FotmobTeam;
  awayTeam: FotmobTeam;
  isMobile: boolean;
}) {
  if (!teamStats.length) return null;

  const home = teamStats.find(t => t.teamId === homeTeam.espnId || t.teamName === homeTeam.name) ?? teamStats[0];
  const away = teamStats.find(t => t.teamId === awayTeam.espnId || t.teamName === awayTeam.name) ?? teamStats[1];

  if (!home || !away) return null;

  const PRIORITY = ['possessionPct', 'totalShots', 'shotsOnTarget', 'saves', 'fouls', 'yellowCards', 'offsides', 'corners', 'totalPasses', 'passingAccuracy'];
  const allStats = home.stats.filter(s => s.displayValue && s.displayValue !== '0' && s.displayValue !== '');

  const sorted = [...allStats].sort((a, b) => {
    const ai = PRIORITY.indexOf(a.name);
    const bi = PRIORITY.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  }).slice(0, 10);

  return (
    <section
      aria-label="Match statistics"
      style={{ padding: isMobile ? '20px 16px' : '28px 40px', borderTop: '1px solid var(--rule)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--rule)', paddingBottom: 10, marginBottom: 18 }}>
        <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', margin: 0 }}>MATCH STATS</h2>
        <div style={{ display: 'flex', gap: 14 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em' }}>{homeTeam.abbreviation}</span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)' }}>vs</span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em' }}>{awayTeam.abbreviation}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map((stat) => {
          const awayStat = away.stats.find(s => s.name === stat.name);
          const hVal = parseNum(stat.displayValue);
          const aVal = parseNum(awayStat?.displayValue ?? '0');
          const total = hVal + aVal;
          const hPct = total > 0 ? (hVal / total) * 100 : 50;

          return (
            <div key={stat.name} aria-label={`${stat.label}: ${homeTeam.abbreviation} ${stat.displayValue}, ${awayTeam.abbreviation} ${awayStat?.displayValue ?? '0'}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span className="mono" style={{ fontSize: isMobile ? 11 : 12, fontVariantNumeric: 'tabular-nums' }}>{stat.displayValue}</span>
                <span className="mono" style={{ fontSize: isMobile ? 9 : 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{stat.label || stat.name}</span>
                <span className="mono" style={{ fontSize: isMobile ? 11 : 12, fontVariantNumeric: 'tabular-nums' }}>{awayStat?.displayValue ?? '–'}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'var(--rule)', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${hPct}%`, background: homeTeam.color, transition: 'width 0.4s ease' }} />
                <div style={{ flex: 1, background: awayTeam.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Team leaders ──────────────────────────────────────────────────────────────

function LeadersSection({
  leaders,
  isMatchLeaders,
  isMobile,
}: {
  leaders: TeamLeader[];
  isMatchLeaders: boolean;
  isMobile: boolean;
}) {
  const teams = leaders.filter(t => t.categories.length > 0);
  if (!teams.length) return null;

  return (
    <section
      aria-label={isMatchLeaders ? 'Match leaders' : 'Season leaders'}
      style={{ padding: isMobile ? '20px 16px' : '28px 40px', borderTop: '1px solid var(--rule)' }}
    >
      <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', margin: '0 0 16px', paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
        {isMatchLeaders ? 'MATCH LEADERS' : 'SEASON LEADERS'}
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: isMobile ? 16 : 20,
      }}>
        {teams.map((team) => (
          <div key={team.teamId} style={{ padding: '14px 16px', border: '1px solid var(--rule)', borderRadius: 8, background: 'var(--paper-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              {team.teamLogo && (
                <img
                  src={team.teamLogo}
                  alt=""
                  aria-hidden="true"
                  width={20}
                  height={20}
                  style={{ width: 20, height: 20, objectFit: 'contain' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>
                {team.teamName.toUpperCase()}
              </span>
            </div>
            <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {team.categories.map((cat) => (
                <div key={cat.category} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <dt className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{cat.category}</dt>
                    <dd className="serif" style={{ fontSize: 14, margin: 0, marginTop: 2 }}>{cat.athlete.name}</dd>
                  </div>
                  <span className="mono tnum" style={{ fontSize: 18, fontWeight: 700, flexShrink: 0 }}>{cat.value}</span>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── News ──────────────────────────────────────────────────────────────────────

function NewsSection({
  news,
  isMobile,
}: {
  news: NewsItem[];
  isMobile: boolean;
}) {
  if (!news.length) return null;

  return (
    <section
      aria-label="Related news"
      style={{ padding: isMobile ? '20px 16px' : '28px 40px', borderTop: '1px solid var(--rule)' }}
    >
      <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', margin: '0 0 16px', paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
        NEWS
      </h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {news.map((item) => (
          <li key={item.id}>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.headline}
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <article
                style={{
                  display: 'grid',
                  gridTemplateColumns: item.image && !isMobile ? '80px 1fr' : '1fr',
                  gap: 14,
                  padding: '14px 12px',
                  borderRadius: 8,
                  transition: 'background 0.1s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--paper-2)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {item.image && !isMobile && (
                  <img
                    src={item.image}
                    alt=""
                    aria-hidden="true"
                    width={80}
                    height={54}
                    style={{ width: 80, height: 54, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div>
                  <p className="serif" style={{ fontSize: isMobile ? 14 : 15, lineHeight: 1.35, margin: '0 0 4px' }}>
                    {item.headline}
                  </p>
                  {item.description && (
                    <p className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', margin: '0 0 4px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </p>
                  )}
                  <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
                    {item.source}
                    {item.published && ` · ${new Date(item.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  </div>
                </div>
              </article>
            </a>
          </li>
        ))}
      </ul>
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
          PREMIER LEAGUE STANDINGS
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
  const seenEventIds = useRef<Set<string>>(new Set());

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/test-fotmob/${MATCH_ID}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const incoming: MatchData = data.match;

      // Toast new key events (skip on initial load — seed the seen set silently)
      if (incoming.keyEvents?.length) {
        const isInitialLoad = seenEventIds.current.size === 0;
        for (const ev of incoming.keyEvents) {
          if (!seenEventIds.current.has(ev.id)) {
            seenEventIds.current.add(ev.id);
            if (!isInitialLoad) {
              showMatchEventToast(ev, incoming.homeTeam, incoming.awayTeam);
            }
          }
        }
      }

      setMatch(incoming);
      setError(null);
      setLastFetched(Date.now());

      if (incoming.state === 'in' && !incoming.isHalftime && incoming.liveClock) {
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
        <p className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 10 }}>Fetching data for match {MATCH_ID}</p>
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

  const isHybrid = match.source === 'fotmob+espn';

  return (
    <div className="screen" style={{ minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden' }}>
      <PitchPulseToaster position={isMobile ? 'top-center' : 'bottom-right'} />

      {/* Header */}
      <header style={{
        padding: isMobile ? '10px 16px' : '12px 40px',
        borderBottom: '1px solid var(--rule)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--paper-2)', flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)' }}>
            {match.league.toUpperCase()} · {match.round ? `GW${match.round}` : ''}
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
          {isHybrid && (
            <div
              className="mono"
              style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 3,
                background: 'rgba(255,60,60,0.12)', color: '#e63c3c',
                letterSpacing: '0.1em',
              }}
            >
              + ESPN
            </div>
          )}
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

      {/* Source attribution */}
      {isHybrid && (
        <div
          role="note"
          style={{
            margin: isMobile ? '16px 16px 0' : '20px 40px 0',
            padding: '10px 14px',
            borderRadius: 6,
            border: '1px solid var(--rule-soft)',
            background: 'var(--paper-2)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>DATA SOURCES</span>
          <span className="mono" style={{ fontSize: 9, padding: '1px 6px', borderRadius: 2, background: 'rgba(0,120,255,0.12)', color: '#0078ff', letterSpacing: '0.1em' }}>FOTMOB</span>
          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>Live score · Clock · Standings</span>
          <span className="mono" style={{ fontSize: 9, padding: '1px 6px', borderRadius: 2, background: 'rgba(255,60,60,0.12)', color: '#e63c3c', letterSpacing: '0.1em', marginLeft: 6 }}>ESPN</span>
          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>Events · Stats · News · Leaders</span>
        </div>
      )}

      {/* Key events */}
      {match.keyEvents?.length > 0 && (
        <EventsFeed
          events={match.keyEvents}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          isMobile={isMobile}
        />
      )}

      {/* Match stats */}
      {match.teamStats?.length > 0 && (
        <StatsPanel
          teamStats={match.teamStats}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          isMobile={isMobile}
        />
      )}

      {/* Team leaders */}
      {match.teamLeaders?.length > 0 && (
        <LeadersSection
          leaders={match.teamLeaders}
          isMatchLeaders={match.isMatchLeaders}
          isMobile={isMobile}
        />
      )}

      {/* News */}
      {match.news?.length > 0 && (
        <NewsSection news={match.news} isMobile={isMobile} />
      )}

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
