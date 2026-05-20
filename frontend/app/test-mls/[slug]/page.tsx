'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useGoalCelebration } from '@/components/LiveGoalCelebration';
import { PitchPulseToaster } from '@/components/PitchPulseToaster';
import { buildGoalDataFromKeyEvent, isScoringGoalEvent } from '@/lib/goal-notification';
import { showMatchEventToast } from '@/lib/match-toasts';

// ── Game config ───────────────────────────────────────────────────────────────

const MLS_GAME_CONFIG: Record<string, { gameId: string }> = {
  'atl-orl': { gameId: '401871128' },
  'hou-stl': { gameId: '401871127' },
};

const POLL_LIVE = 12_000;
const POLL_IDLE = 30_000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface MLSTeam {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  score: string;
  color: string;
  winner: boolean;
  espnId: string;
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
  qualColor: string | null;
  projectedPoints: number;
  projectedGd: number;
  projectedRank: number;
  rankChange: number;
}

interface StandingsGroup { label: string; rows: StandingRow[]; }

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

interface StatLine { name: string; label: string; displayValue: string; }
interface TeamStat { teamId: string; teamName: string; stats: StatLine[]; }

interface NewsItem {
  id: string;
  headline: string;
  description: string;
  published: string;
  image: string | null;
  link: string;
  source: string;
}

interface LeaderCategory { category: string; value: string; athlete: { name: string; id: string }; }
interface TeamLeader { teamId: string; teamName: string; teamLogo: string; categories: LeaderCategory[]; }

interface BracketTeam {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  score: string | null;
  winner: boolean;
}

interface BracketMatch {
  id: string;
  roundLabel: string;
  homeTeam: BracketTeam;
  awayTeam: BracketTeam;
  state: 'pre' | 'in' | 'post';
  statusDetail: string;
  date: string;
  isCurrentGame: boolean;
}

interface BracketRound {
  label: string;
  date: string;
  matches: BracketMatch[];
}

interface OpenCupBracket {
  rounds: BracketRound[];
  upcomingRounds: { label: string; date: string }[];
}

interface MLSMatchData {
  id: string;
  league: string;
  source: string;
  fotmobMatchId: string | null;
  date: string;
  state: 'pre' | 'in' | 'post';
  isHalftime: boolean;
  statusDetail: string;
  statusTypeName: string;
  displayClock: string;
  liveClock: string;
  period: number;
  homeTeam: MLSTeam;
  awayTeam: MLSTeam;
  venue: { name: string; city: string; state: string };
  broadcast: string;
  keyEvents: KeyEvent[];
  teamStats: TeamStat[];
  news: NewsItem[];
  teamLeaders: TeamLeader[];
  isMatchLeaders: boolean;
  standingsGroups: StandingsGroup[];
  standingsGroupsProjected: StandingsGroup[];
  openCupBracket?: OpenCupBracket;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

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

function useCountdown(dateStr: string): number | null {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    if (!dateStr) return;
    const update = () => {
      const diff = new Date(dateStr).getTime() - Date.now();
      setMs(diff > 0 ? diff : null);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [dateStr]);
  return ms;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function clockToSeconds(clock: string): number {
  if (!clock) return 0;
  // FotMob format: "16'" or "45+2'" — extract leading digits as minutes
  if (clock.includes("'") || !clock.includes(':')) {
    const m = parseInt(clock, 10);
    return isNaN(m) ? 0 : m * 60;
  }
  // ESPN format: "MM:SS"
  const parts = clock.split(':');
  if (parts.length !== 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function secondsToClock(s: number): string {
  // Display as soccer minutes ("16'") not a countdown timer
  return `${Math.floor(s / 60)}'`;
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
  match: MLSMatchData;
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

  const countdownMs = useCountdown(date);
  const showCountdown = state === 'pre' && countdownMs !== null && countdownMs <= 30 * 60 * 1000;
  const countdownSecs = showCountdown && countdownMs != null ? Math.floor(countdownMs / 1000) : 0;
  const countdownStr = showCountdown
    ? `${Math.floor(countdownSecs / 60)}:${String(countdownSecs % 60).padStart(2, '0')}`
    : '';

  const scoreDesc = state !== 'pre'
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
            {isMobile ? homeTeam.abbreviation : homeTeam.name}
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
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.22em' }}>HALF TIME</div>
            <div className="mono" style={{ fontSize: isMobile ? 20 : 26, marginTop: 6, color: 'var(--ink-3)' }}>HT</div>
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
            {statusDetail && !clockDisplay && (
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
            {showCountdown ? (
              <>
                <div className="mono" style={{ fontSize: 9, color: 'var(--live)', marginTop: 6, letterSpacing: '0.14em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
                  KICKS OFF IN
                </div>
                <div className="mono tnum" aria-live="polite"
                  style={{ fontSize: isMobile ? 22 : 28, marginTop: 4, fontVariantNumeric: 'tabular-nums', color: 'var(--live)' }}>
                  {countdownStr}
                </div>
              </>
            ) : (
              <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.6 }}>
                {kickoffLabel}
              </div>
            )}
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
            {isMobile ? awayTeam.abbreviation : awayTeam.name}
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
  events, homeTeam, awayTeam, isMobile,
}: {
  events: KeyEvent[];
  homeTeam: MLSTeam;
  awayTeam: MLSTeam;
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
                  <span className="serif" style={{ fontSize: isMobile ? 13 : 14, lineHeight: 1.2 }}>{athlete}</span>
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

function parseNum(v: string): number { return parseFloat(v.replace(/[^0-9.]/g, '')) || 0; }

function StatsPanel({
  teamStats, homeTeam, awayTeam, isMobile,
}: {
  teamStats: TeamStat[];
  homeTeam: MLSTeam;
  awayTeam: MLSTeam;
  isMobile: boolean;
}) {
  if (!teamStats.length) return null;

  const home = teamStats.find(t => t.teamId === homeTeam.espnId || t.teamName === homeTeam.name) ?? teamStats[0];
  const away = teamStats.find(t => t.teamId === awayTeam.espnId || t.teamName === awayTeam.name) ?? teamStats[1];
  if (!home || !away) return null;

  const PRIORITY = ['possessionPct', 'totalShots', 'shotsOnTarget', 'saves', 'fouls', 'yellowCards', 'offsides', 'corners', 'totalPasses', 'passingAccuracy'];
  const sorted = [...home.stats.filter(s => s.displayValue && s.displayValue !== '0' && s.displayValue !== '')]
    .sort((a, b) => {
      const ai = PRIORITY.indexOf(a.name), bi = PRIORITY.indexOf(b.name);
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
          const hVal = parseNum(stat.displayValue), aVal = parseNum(awayStat?.displayValue ?? '0');
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
  leaders, isMatchLeaders, isMobile,
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
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? 16 : 20 }}>
        {teams.map((team) => (
          <div key={team.teamId} style={{ padding: '14px 16px', border: '1px solid var(--rule)', borderRadius: 8, background: 'var(--paper-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              {team.teamLogo && (
                <img src={team.teamLogo} alt="" aria-hidden="true" width={20} height={20}
                  style={{ width: 20, height: 20, objectFit: 'contain' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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

function NewsSection({ news, isMobile }: { news: NewsItem[]; isMobile: boolean }) {
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
            <a href={item.link} target="_blank" rel="noopener noreferrer" aria-label={item.headline}
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <article
                style={{ display: 'grid', gridTemplateColumns: item.image && !isMobile ? '80px 1fr' : '1fr', gap: 14, padding: '14px 12px', borderRadius: 8, transition: 'background 0.1s', cursor: 'pointer' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--paper-2)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {item.image && !isMobile && (
                  <img src={item.image} alt="" aria-hidden="true" width={80} height={54}
                    style={{ width: 80, height: 54, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div>
                  <p className="serif" style={{ fontSize: isMobile ? 14 : 15, lineHeight: 1.35, margin: '0 0 4px' }}>{item.headline}</p>
                  {item.description && (
                    <p className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', margin: '0 0 4px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </p>
                  )}
                  <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
                    {item.source}{item.published && ` · ${new Date(item.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
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

// ── Open Cup bracket ──────────────────────────────────────────────────────────

function BracketMatchCard({
  match, isMobile, compact,
}: {
  match: BracketMatch;
  isMobile: boolean;
  compact?: boolean;
}) {
  const isPost = match.state === 'post';
  const isPre = match.state === 'pre';
  const isLive = match.state === 'in';
  const kickoff = match.date
    ? new Date(match.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';

  const accentColor = match.isCurrentGame ? 'var(--pulse)' : isPost ? 'var(--ink-3)' : 'var(--rule)';

  return (
    <div
      style={{
        border: `1px solid var(--rule)`,
        borderLeft: match.isCurrentGame ? '3px solid var(--pulse)' : `1px solid var(--rule)`,
        borderRadius: 7,
        padding: compact ? '8px 10px' : '10px 14px',
        background: match.isCurrentGame ? 'var(--paper-2)' : 'transparent',
        position: 'relative',
      }}
    >
      {match.isCurrentGame && (
        <div className="mono" style={{
          fontSize: 8, letterSpacing: '0.16em', color: 'var(--pulse)',
          marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--pulse)', display: 'inline-block' }} />
          THIS MATCH
        </div>
      )}
      {[match.homeTeam, match.awayTeam].map((team, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, padding: '3px 0',
          opacity: isPost && !team.winner ? 0.45 : 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 6 : 8, minWidth: 0 }}>
            <img src={team.logo} alt="" aria-hidden="true"
              width={compact ? 16 : 20} height={compact ? 16 : 20}
              style={{ width: compact ? 16 : 20, height: compact ? 16 : 20, objectFit: 'contain', flexShrink: 0 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span
              className={team.winner ? 'serif' : 'mono'}
              style={{
                fontSize: compact ? 11 : (isMobile ? 12 : 13),
                fontWeight: team.winner ? 600 : 400,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {team.abbreviation}
            </span>
            {isPost && team.winner && (
              <span style={{ fontSize: 9, color: accentColor }}>✓</span>
            )}
          </div>
          <span className="mono tnum" style={{
            fontSize: compact ? 12 : 14,
            fontWeight: team.winner ? 700 : 400,
            flexShrink: 0,
            color: team.score != null ? 'var(--ink)' : 'var(--ink-3)',
          }}>
            {team.score ?? '–'}
          </span>
        </div>
      ))}
      {isPre && !match.isCurrentGame && kickoff && (
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 5, letterSpacing: '0.08em' }}>
          {kickoff}
        </div>
      )}
      {isPost && match.statusDetail && (
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.08em' }}>
          {match.statusDetail.includes('Final') ? match.statusDetail : `FT · ${match.statusDetail}`}
        </div>
      )}
      {isLive && (
        <div className="mono" style={{ fontSize: 9, color: 'var(--live)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
          LIVE
        </div>
      )}
    </div>
  );
}

function OpenCupBracketSection({
  bracket, isMobile,
}: {
  bracket: OpenCupBracket;
  isMobile: boolean;
}) {
  const qfRound = bracket.rounds.find(r => r.label === 'Quarterfinals');
  const r16Round = bracket.rounds.find(r => r.label === 'Round of 16');
  const [showR16, setShowR16] = React.useState(false);

  if (!qfRound?.matches.length) return null;

  return (
    <section
      aria-label="U.S. Open Cup bracket"
      style={{ padding: isMobile ? '20px 16px' : '28px 40px', borderTop: '1px solid var(--rule)' }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--rule)', paddingBottom: 10, marginBottom: 20,
        flexWrap: 'wrap', gap: 6,
      }}>
        <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', margin: 0 }}>
          U.S. OPEN CUP · BRACKET
        </h2>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
          {qfRound.date}
        </div>
      </div>

      {/* QF grid — current round */}
      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-3)', marginBottom: 10, textTransform: 'uppercase' }}>
          Quarterfinals
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: 10,
        }}>
          {qfRound.matches.map(m => (
            <BracketMatchCard key={m.id} match={m} isMobile={isMobile} />
          ))}
        </div>
      </div>

      {/* Future rounds */}
      <div style={{ display: 'flex', gap: isMobile ? 10 : 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {bracket.upcomingRounds.map((r) => (
          <div key={r.label} style={{
            flex: 1, minWidth: isMobile ? 120 : 140,
            border: '1px dashed var(--rule)',
            borderRadius: 7,
            padding: '10px 14px',
            opacity: 0.6,
          }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-3)', marginBottom: 4, textTransform: 'uppercase' }}>
              {r.label}
            </div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{r.date}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>TBD</div>
          </div>
        ))}
      </div>

      {/* R16 collapsible */}
      {r16Round && r16Round.matches.length > 0 && (
        <div>
          <button
            className="mono"
            onClick={() => setShowR16(v => !v)}
            style={{
              fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-3)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 0', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <span style={{ display: 'inline-block', transform: showR16 ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
            {showR16 ? 'HIDE' : 'SHOW'} ROUND OF 16 RESULTS
          </button>
          {showR16 && (
            <div style={{
              marginTop: 12,
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: 8,
            }}>
              {r16Round.matches.map(m => (
                <BracketMatchCard key={m.id} match={m} isMobile={isMobile} compact />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Conference standings ──────────────────────────────────────────────────────

function ConferenceTable({
  group, projectedGroup, homeId, awayId, isLive, isMobile,
}: {
  group: StandingsGroup;
  projectedGroup: StandingsGroup;
  homeId: string;
  awayId: string;
  isLive: boolean;
  isMobile: boolean;
}) {
  const rows = isLive && projectedGroup.rows.length ? projectedGroup.rows : group.rows;
  if (!rows.length) return null;

  const showWDL = !isMobile;
  const cols = showWDL
    ? '20px 16px 1fr 32px 32px 32px 32px 32px 44px'
    : '20px 16px 1fr 28px 32px 44px';
  const headers = showWDL
    ? ['', '', 'Club', 'P', 'W', 'D', 'L', 'GD', 'Pts']
    : ['', '', 'Club', 'P', 'GD', 'Pts'];

  return (
    <div>
      <div className="mono" style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-3)', marginBottom: 10, textTransform: 'uppercase' }}>
        {group.label}
      </div>
      <div role="table" aria-label={`${group.label} standings`}>
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
          if (isHighlighted && isLive) {
            if (change > 0) changeEl = <span aria-hidden="true" style={{ color: '#22c55e', fontSize: 10, fontWeight: 600 }}>↑{change}</span>;
            else if (change < 0) changeEl = <span aria-hidden="true" style={{ color: '#ef4444', fontSize: 10, fontWeight: 600 }}>↓{Math.abs(change)}</span>;
            else changeEl = <span aria-hidden="true" style={{ color: 'var(--ink-3)', fontSize: 10 }}>–</span>;
          }

          const qualBorder = !isMobile && row.qualColor
            ? `3px solid ${row.qualColor}`
            : isHighlighted ? '3px solid var(--pulse)' : '3px solid transparent';

          return (
            <div
              key={row.teamId}
              role="row"
              aria-label={`${rank}. ${row.name}, ${row.played} played, ${pts} points`}
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
                  {row.abbreviation || row.name}
                </span>
              </div>
              {showWDL ? (
                [row.played, row.wins, row.draws, row.losses, gdStr].map((val, i) => (
                  <div key={i} role="cell" aria-hidden="true" className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--ink-3)' }}>{val}</div>
                ))
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
    </div>
  );
}

function ConferenceStandings({
  standingsGroups, standingsGroupsProjected, homeId, awayId, isLive, isMobile,
}: {
  standingsGroups: StandingsGroup[];
  standingsGroupsProjected: StandingsGroup[];
  homeId: string;
  awayId: string;
  isLive: boolean;
  isMobile: boolean;
}) {
  if (!standingsGroups.length) return null;

  return (
    <section aria-label="MLS standings" style={{ padding: isMobile ? '20px 16px' : '28px 40px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--rule)', paddingBottom: 10, marginBottom: 20,
        flexWrap: 'wrap', gap: 6,
      }}>
        <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', margin: 0 }}>MLS STANDINGS</h2>
        {isLive && (
          <div className="mono" aria-live="polite" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--live)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
            IF RESULT STANDS
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? 28 : 40 }}>
        {standingsGroups.map((group, i) => (
          <ConferenceTable
            key={group.label || i}
            group={group}
            projectedGroup={standingsGroupsProjected[i] ?? group}
            homeId={homeId}
            awayId={awayId}
            isLive={isLive}
            isMobile={isMobile}
          />
        ))}
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MLSGamePage({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  const isMobile = useIsMobile();
  const { playGoal, celebration } = useGoalCelebration();
  const [match, setMatch] = useState<MLSMatchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [liveClock, setLiveClock] = useState('');
  const [, setTick] = useState(0);
  const clockBase = useRef<{ seconds: number; fetchedAt: number } | null>(null);
  const seenEventIds = useRef<Set<string>>(new Set());

  const config = slug ? MLS_GAME_CONFIG[slug] : null;

  const fetchMatch = useCallback(async () => {
    if (!config) return;
    try {
      const res = await fetch(`/api/test-mls/${config.gameId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const incoming: MLSMatchData = data.match;

      if (incoming.keyEvents?.length) {
        const isInitialLoad = seenEventIds.current.size === 0;
        for (const ev of incoming.keyEvents) {
          if (!seenEventIds.current.has(ev.id)) {
            seenEventIds.current.add(ev.id);
            if (!isInitialLoad) {
              if (isScoringGoalEvent(ev)) {
                playGoal(
                  buildGoalDataFromKeyEvent(
                    ev,
                    incoming.homeTeam,
                    incoming.awayTeam,
                    incoming.league,
                    slug
                  )
                );
              } else {
                showMatchEventToast(ev, incoming.homeTeam, incoming.awayTeam);
              }
            }
          }
        }
      }

      setMatch(incoming);
      setError(null);
      setLastFetched(Date.now());

      if (incoming.state === 'in' && !incoming.isHalftime && incoming.liveClock) {
        const secs = clockToSeconds(incoming.liveClock);
        // Only interpolate when we have a meaningful base — a 0 parse means
        // the format wasn't recognised; fall back to showing the raw API string
        clockBase.current = secs > 0 ? { seconds: secs, fetchedAt: Date.now() } : null;
      } else {
        clockBase.current = null;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [config, slug, playGoal]);

  useEffect(() => { if (config) fetchMatch(); }, [fetchMatch, config]);

  useEffect(() => {
    if (!config) return;
    const interval = match?.state === 'in' ? POLL_LIVE : POLL_IDLE;
    const id = setInterval(fetchMatch, interval);
    return () => clearInterval(id);
  }, [fetchMatch, match?.state, config]);

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

  if (!config) {
    notFound();
    return null;
  }

  if (loading) {
    return (
      <div className="screen" style={{ padding: isMobile ? 24 : 60 }} role="status" aria-live="polite">
        <p className="serif it" style={{ fontSize: 24, color: 'var(--ink-3)', margin: 0 }}>Loading match…</p>
        <p className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 10 }}>Fetching MLS data…</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="screen" style={{ padding: isMobile ? 24 : 60 }} role="alert">
        <p className="serif" style={{ fontSize: 24, margin: 0 }}>Could not load match</p>
        <p className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10 }}>{error}</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn" onClick={fetchMatch} style={{ minHeight: 44, padding: '0 20px' }}>Retry</button>
          <Link href="/tests" className="btn" style={{ minHeight: 44, padding: '0 20px', textDecoration: 'none' }}>← Back</Link>
        </div>
      </div>
    );
  }

  // ESPN is primary; FotMob enriches clock + standings
  const isHybrid = match.source === 'espn+fotmob';

  return (
    <div className="screen" style={{ minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden' }}>
      {celebration}
      <PitchPulseToaster position={isMobile ? 'top-center' : 'bottom-right'} />

      {/* Header — matches Chelsea page layout exactly */}
      <header style={{
        padding: isMobile ? '10px 16px' : '12px 40px',
        borderBottom: '1px solid var(--rule)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--paper-2)', flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Link
            href="/tests"
            className="mono"
            style={{ fontSize: 10, color: 'var(--ink-3)', textDecoration: 'none', letterSpacing: '0.12em', marginRight: 4 }}
          >
            ← Tests
          </Link>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)' }}>
            MLS · R2
          </div>
          <div className="mono" style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 3,
            background: 'rgba(255,60,60,0.12)', color: '#e63c3c',
            letterSpacing: '0.1em',
          }}>
            ESPN
          </div>
          {isHybrid && (
            <div className="mono" style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 3,
              background: 'rgba(0,120,255,0.12)', color: '#0078ff',
              letterSpacing: '0.1em',
            }}>
              + FOTMOB
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

      {/* Score hero */}
      <ScoreHero match={match} liveClock={liveClock} isMobile={isMobile} />

      {/* Data sources attribution — same style as Chelsea page */}
      <div
        role="note"
        style={{
          margin: isMobile ? '16px 16px 0' : '20px 40px 0',
          padding: '10px 14px',
          borderRadius: 6,
          border: '1px solid var(--rule-soft)',
          background: 'var(--paper-2)',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}
      >
        <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>DATA SOURCES</span>
        <span className="mono" style={{ fontSize: 9, padding: '1px 6px', borderRadius: 2, background: 'rgba(255,60,60,0.12)', color: '#e63c3c', letterSpacing: '0.1em' }}>ESPN</span>
        <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>Events · Stats · News · Leaders</span>
        {isHybrid && (
          <>
            <span className="mono" style={{ fontSize: 9, padding: '1px 6px', borderRadius: 2, background: 'rgba(0,120,255,0.12)', color: '#0078ff', letterSpacing: '0.1em', marginLeft: 6 }}>FOTMOB</span>
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>Live clock · Standings</span>
          </>
        )}
      </div>

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

      {/* Open Cup bracket */}
      {match.openCupBracket && (
        <OpenCupBracketSection bracket={match.openCupBracket} isMobile={isMobile} />
      )}

      {/* Conference standings */}
      {match.standingsGroups?.length > 0 && (
        <div style={{ borderTop: '1px solid var(--rule)' }}>
          <ConferenceStandings
            standingsGroups={match.standingsGroups}
            standingsGroupsProjected={match.standingsGroupsProjected ?? match.standingsGroups}
            homeId={match.homeTeam.id}
            awayId={match.awayTeam.id}
            isLive={match.state === 'in'}
            isMobile={isMobile}
          />
        </div>
      )}

      {/* Raw response */}
      <div style={{ padding: isMobile ? '16px' : '24px 40px', borderTop: '1px solid var(--rule)' }}>
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
