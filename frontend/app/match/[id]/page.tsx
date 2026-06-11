'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useIsMobile } from '@/hooks/useWindowWidth';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useGoalCelebration } from '@/components/LiveGoalCelebration';
import { MatchPrediction } from '@/components/MatchPrediction';
import { PitchPulseToaster } from '@/components/PitchPulseToaster';
import { buildGoalDataFromKeyEvent, isScoringGoalEvent } from '@/lib/goal-notification';
import { fetchPrediction } from '@/lib/predict';
import { showMatchEventToast } from '@/lib/match-toasts';
import { stadiums } from '@/lib/data';
import { posthog } from '@/lib/posthog';
import type { PredictResponse } from '@/types/predict';

const POLL_LIVE = 12_000;
const POLL_IDLE = 30_000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface MatchTeam {
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
  sequence: number;
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

interface MatchData {
  id: string;
  league: string;
  seasonNote: string;
  source: string;
  fotmobMatchId: string | null;
  date: string;
  state: 'pre' | 'in' | 'post';
  isHalftime: boolean;
  isExtraTime: boolean;
  isExtraTimeHalftime: boolean;
  isPenaltyShootout: boolean;
  hadPenaltyShootout: boolean;
  penScore: { home: number; away: number } | null;
  statusDetail: string;
  statusTypeName: string;
  displayClock: string;
  liveClock: string;
  period: number;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  venue: { name: string; city: string; state: string; country?: string };
  broadcast: string;
  keyEvents: KeyEvent[];
  teamStats: TeamStat[];
  news: NewsItem[];
  teamLeaders: TeamLeader[];
  isMatchLeaders: boolean;
  standingsGroups: StandingsGroup[];
  standingsGroupsProjected: StandingsGroup[];
  headToHead: H2HGame[];
}

interface H2HGame {
  id: string;
  date: string;
  score: string;
  homeScore: string;
  awayScore: string;
  result: 'W' | 'L' | 'D';
  competition: string;
  round: string;
  homeTeam: { name: string; abbreviation: string; logo: string };
  awayTeam: { name: string; abbreviation: string; logo: string };
}

// ── Hooks ─────────────────────────────────────────────────────────────────────


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

function clockToSeconds(clock: string): number {
  if (!clock) return 0;
  if (clock.includes("'") || !clock.includes(':')) {
    const m = parseInt(clock, 10);
    return isNaN(m) ? 0 : m * 60;
  }
  const parts = clock.split(':');
  if (parts.length !== 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function secondsToClock(s: number): string {
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
  match: MatchData;
  liveClock: string;
  isMobile: boolean;
}) {
  const {
    homeTeam, awayTeam, state,
    isHalftime, isExtraTime, isExtraTimeHalftime, isPenaltyShootout,
    hadPenaltyShootout, penScore,
    statusDetail, date, venue,
  } = match;

  const stadium = stadiums.find(
    s => s.city?.toLowerCase() === venue.city?.toLowerCase()
  );

  const clockSuppressed = isHalftime || isExtraTimeHalftime || isPenaltyShootout;
  const clockDisplay = state === 'in' && !clockSuppressed ? liveClock || match.liveClock : '';
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
        {state === 'in' && isExtraTimeHalftime && (
          <>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.2em' }}>ET HALF TIME</div>
            <div className="mono" style={{ fontSize: isMobile ? 20 : 26, marginTop: 6, color: 'var(--ink-3)' }}>ET HT</div>
          </>
        )}
        {state === 'in' && isPenaltyShootout && (
          <>
            <div className="mono" style={{
              fontSize: 10, letterSpacing: '0.22em',
              color: 'var(--live)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
              PENALTIES
            </div>
            <div className="mono" style={{ fontSize: isMobile ? 18 : 22, marginTop: 6, letterSpacing: '0.08em' }}>PENS</div>
          </>
        )}
        {state === 'in' && !isHalftime && !isExtraTimeHalftime && !isPenaltyShootout && (
          <>
            <div
              className="mono"
              style={{ fontSize: 10, color: 'var(--live)', letterSpacing: '0.22em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            >
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
              <span className="sr-only">Live — </span>
              {isExtraTime ? 'ET LIVE' : 'LIVE'}
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
            {venue.name && (
              <div style={{ marginTop: 10 }}>
                {stadium ? (
                  <Link href={`/stadium/${stadium.id}`} className="mono"
                    style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', textDecoration: 'none', borderBottom: '1px dotted var(--ink-3)', paddingBottom: 1 }}>
                    {venue.name}
                  </Link>
                ) : (
                  <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{venue.name}</span>
                )}
                {venue.city && (
                  <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.08em', marginTop: 2, opacity: 0.7 }}>{venue.city}</div>
                )}
              </div>
            )}
          </>
        )}
        {state === 'post' && (
          <>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.16em' }}>
              {hadPenaltyShootout ? 'AFTER PENALTIES' : (statusDetail || 'FULL TIME')}
            </div>
            {hadPenaltyShootout && penScore && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="serif tnum" style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, lineHeight: 1 }}>
                    {penScore.home}
                  </span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>–</span>
                  <span className="serif tnum" style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, lineHeight: 1 }}>
                    {penScore.away}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.16em' }}>ON PENS</div>
              </div>
            )}
            {venue.name && (
              <div style={{ marginTop: 10 }}>
                {stadium ? (
                  <Link href={`/stadium/${stadium.id}`} className="mono"
                    style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', textDecoration: 'none', borderBottom: '1px dotted var(--ink-3)', paddingBottom: 1 }}>
                    {venue.name}
                  </Link>
                ) : (
                  <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{venue.name}</span>
                )}
                {venue.city && (
                  <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.08em', marginTop: 2, opacity: 0.7 }}>{venue.city}</div>
                )}
              </div>
            )}
          </>
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
            {venue.name && (
              <div style={{ marginTop: 10 }}>
                {stadium ? (
                  <Link
                    href={`/stadium/${stadium.id}`}
                    className="mono"
                    style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', textDecoration: 'none', borderBottom: '1px dotted var(--ink-3)', paddingBottom: 1 }}
                  >
                    {venue.name}
                  </Link>
                ) : (
                  <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
                    {venue.name}
                  </span>
                )}
                {venue.city && (
                  <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.08em', marginTop: 2, opacity: 0.7 }}>
                    {venue.city}
                  </div>
                )}
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

// ── Penalty shootout panel ────────────────────────────────────────────────────

interface PenKick {
  id: string;
  sequence: number;
  result: 'scored' | 'missed';
  athlete: string;
  teamName: string;
}

function PenaltyShootoutPanel({
  keyEvents, homeTeam, awayTeam, isMobile,
}: {
  keyEvents: KeyEvent[];
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  isMobile: boolean;
}) {
  const penKicks: PenKick[] = keyEvents
    .filter(ev =>
      ev.period === 5 &&
      (ev.typeSlug === 'penalty-scored' || ev.typeSlug === 'penalty-missed')
    )
    .map(ev => ({
      id: ev.id,
      sequence: ev.sequence ?? 0,
      result: (ev.typeSlug === 'penalty-scored' ? 'scored' : 'missed') as 'scored' | 'missed',
      athlete: ev.participants[0]?.athlete || ev.text || '',
      teamName: ev.teamName,
    }))
    .sort((a, b) => (a.sequence - b.sequence) || (parseInt(a.id, 10) - parseInt(b.id, 10)));

  const isHomeKick = (teamName: string) => {
    const n = teamName.toLowerCase();
    const hn = homeTeam.name.toLowerCase();
    return n.includes(hn) || hn.includes(n) || n.includes(homeTeam.abbreviation.toLowerCase());
  };

  const homeKicks = penKicks.filter(k => isHomeKick(k.teamName));
  const awayKicks = penKicks.filter(k => !isHomeKick(k.teamName));
  const homePenScore = homeKicks.filter(k => k.result === 'scored').length;
  const awayPenScore = awayKicks.filter(k => k.result === 'scored').length;
  const totalSlots = Math.max(5, homeKicks.length + 1, awayKicks.length + 1);
  const dotSize = isMobile ? 30 : 36;

  function TeamRow({ team, kicks }: { team: MatchTeam; kicks: PenKick[] }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: isMobile ? 52 : 72, flexShrink: 0 }}>
          <img src={team.logo} alt="" aria-hidden="true" width={20} height={20}
            style={{ width: 20, height: 20, objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em' }}>{team.abbreviation}</span>
        </div>
        <div style={{ display: 'flex', gap: isMobile ? 6 : 8, flexWrap: 'wrap' }}>
          {Array.from({ length: totalSlots }).map((_, i) => {
            const kick = kicks[i];
            const isNext = !kick && i === kicks.length;
            if (!kick) {
              return (
                <div key={i} aria-label="Pending" style={{
                  width: dotSize, height: dotSize, borderRadius: '50%',
                  border: `2px solid var(--rule)`,
                  opacity: isNext ? 0.65 : 0.25,
                  boxSizing: 'border-box',
                }} />
              );
            }
            const scored = kick.result === 'scored';
            return (
              <div key={i} title={kick.athlete}
                aria-label={`${kick.athlete}: ${scored ? 'scored' : 'missed'}`}
                style={{
                  width: dotSize, height: dotSize, borderRadius: '50%',
                  background: scored ? '#22c55e' : '#ef4444',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isMobile ? 14 : 16, flexShrink: 0,
                  boxShadow: scored ? '0 0 0 3px rgba(34,197,94,0.2)' : '0 0 0 3px rgba(239,68,68,0.2)',
                }}
              >
                {scored ? '⚽' : '✕'}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section aria-label="Penalty shootout" style={{
      padding: isMobile ? '18px 16px' : '24px 40px',
      borderTop: '1px solid var(--rule)',
      background: 'var(--paper-2)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--rule)',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span aria-hidden="true" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--live)', display: 'inline-block',
            boxShadow: '0 0 6px var(--live)',
          }} />
          <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--live)', margin: 0 }}>
            PENALTY SHOOTOUT
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{homeTeam.abbreviation}</span>
          <span className="serif tnum" style={{ fontSize: isMobile ? 26 : 34, lineHeight: 1, fontWeight: 700 }}>{homePenScore}</span>
          <span className="mono" style={{ fontSize: 16, color: 'var(--ink-3)' }}>–</span>
          <span className="serif tnum" style={{ fontSize: isMobile ? 26 : 34, lineHeight: 1, fontWeight: 700 }}>{awayPenScore}</span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>{awayTeam.abbreviation}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TeamRow team={homeTeam} kicks={homeKicks} />
        <TeamRow team={awayTeam} kicks={awayKicks} />
      </div>
      {penKicks.length === 0 && (
        <p className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em', marginTop: 14, textAlign: 'center' }}>
          Kicks will appear here as they are taken
        </p>
      )}
    </section>
  );
}

// ── Key events feed ───────────────────────────────────────────────────────────

function EventsFeed({
  events, homeTeam, awayTeam, isMobile,
}: {
  events: KeyEvent[];
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  isMobile: boolean;
}) {
  if (!events.length) return null;
  return (
    <section aria-label="Key match events" style={{ padding: isMobile ? '20px 16px' : '28px 40px', borderTop: '1px solid var(--rule)' }}>
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
            <li key={ev.id}
              aria-label={`${ev.clock} — ${ev.typeText} — ${athlete} (${ev.teamName})`}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '36px 1fr' : '44px 1fr',
                gap: 10, padding: '8px 10px', borderRadius: 6,
                background: isGoal ? 'var(--paper-2)' : 'transparent',
                borderLeft: isGoal ? `3px solid ${teamColor}` : '3px solid transparent',
                alignItems: 'flex-start',
              }}
            >
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', paddingTop: 1, textAlign: 'right' }}>{ev.clock}</div>
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
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
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

  if (!sorted.length) return null;

  return (
    <section aria-label="Match statistics" style={{ padding: isMobile ? '20px 16px' : '28px 40px', borderTop: '1px solid var(--rule)' }}>
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
    <section aria-label={isMatchLeaders ? 'Match leaders' : 'Tournament leaders'} style={{ padding: isMobile ? '20px 16px' : '28px 40px', borderTop: '1px solid var(--rule)' }}>
      <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', margin: '0 0 16px', paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
        {isMatchLeaders ? 'MATCH LEADERS' : 'TOURNAMENT LEADERS'}
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
    <section aria-label="Related news" style={{ padding: isMobile ? '20px 16px' : '28px 40px', borderTop: '1px solid var(--rule)' }}>
      <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', margin: '0 0 16px', paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
        NEWS
      </h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {news.map((item) => (
          <li key={item.id}>
            <a href={item.link} target="_blank" rel="noopener noreferrer" aria-label={item.headline}
              onClick={() => posthog.capture('match_news_article_clicked', { headline: item.headline, source: item.source, link: item.link })}
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

// ── Group standings ───────────────────────────────────────────────────────────

function GroupTable({
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
            <div key={row.teamId} role="row"
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

function GroupStandings({
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
    <section aria-label="Group standings" style={{ padding: isMobile ? '20px 16px' : '28px 40px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--rule)', paddingBottom: 10, marginBottom: 20,
        flexWrap: 'wrap', gap: 6,
      }}>
        <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', margin: 0 }}>GROUP STANDINGS</h2>
        {isLive && (
          <div className="mono" aria-live="polite" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--live)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
            IF RESULT STANDS
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? 28 : 40 }}>
        {standingsGroups.map((group, i) => (
          <GroupTable
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

export default function MatchPage({ params }: { params: { id: string } }) {
  const gameId = params.id;

  const isMobile = useIsMobile();
  const { playGoal, celebration } = useGoalCelebration();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveClock, setLiveClock] = useState('');
  const [, setTick] = useState(0);
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const clockBase = useRef<{ seconds: number; fetchedAt: number } | null>(null);
  const seenEventIds = useRef<Set<string>>(new Set());
  const hasTrackedView = useRef(false);

  if (!gameId) {
    notFound();
    return null;
  }

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/${gameId}?league=fifa.world`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const incoming: MatchData = data.match;

      if (incoming.keyEvents?.length) {
        const isInitialLoad = seenEventIds.current.size === 0;
        for (const ev of incoming.keyEvents) {
          if (!seenEventIds.current.has(ev.id)) {
            seenEventIds.current.add(ev.id);
            if (!isInitialLoad) {
              if (isScoringGoalEvent(ev)) {
                const goalData = buildGoalDataFromKeyEvent(
                  ev,
                  incoming.homeTeam,
                  incoming.awayTeam,
                  incoming.league,
                  gameId
                );
                playGoal({
                  ...goalData,
                  homeScore: ev.homeScore != null ? ev.homeScore : (parseInt(incoming.homeTeam.score, 10) || 0),
                  awayScore: ev.awayScore != null ? ev.awayScore : (parseInt(incoming.awayTeam.score, 10) || 0),
                });
              } else {
                showMatchEventToast(ev, incoming.homeTeam, incoming.awayTeam);
              }
            }
          }
        }
      }

      setMatch(incoming);
      setError(null);

      if (!hasTrackedView.current) {
        hasTrackedView.current = true;
        posthog.capture('match_viewed', {
          match_id: gameId,
          home_team: incoming.homeTeam.abbreviation,
          away_team: incoming.awayTeam.abbreviation,
          match_state: incoming.state,
          league: incoming.league,
        });
      }

      const clockActive =
        incoming.state === 'in' &&
        !incoming.isHalftime &&
        !incoming.isExtraTimeHalftime &&
        !incoming.isPenaltyShootout &&
        incoming.liveClock;

      if (clockActive) {
        const secs = clockToSeconds(incoming.liveClock);
        clockBase.current = secs > 0 ? { seconds: secs, fetchedAt: Date.now() } : null;
      } else {
        clockBase.current = null;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, playGoal]);

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

  useEffect(() => {
    const homeName = match?.homeTeam.name;
    const awayName = match?.awayTeam.name;
    if (!homeName || !awayName) return;
    let cancelled = false;
    const home = homeName;
    const away = awayName;
    async function loadPrediction() {
      setPredictionLoading(true);
      setPredictionError(null);
      try {
        const p = await fetchPrediction(home, away);
        if (!cancelled) setPrediction(p);
      } catch (e) {
        if (!cancelled) {
          setPredictionError(
            e instanceof Error ? e.message : 'Prediction failed'
          );
        }
      } finally {
        if (!cancelled) setPredictionLoading(false);
      }
    }
    loadPrediction();
    return () => {
      cancelled = true;
    };
  }, [match?.homeTeam.name, match?.awayTeam.name]);

  if (loading) {
    return (
      <div className="screen" style={{ padding: isMobile ? 24 : 60 }} role="status" aria-live="polite">
        <p className="serif it" style={{ fontSize: 24, color: 'var(--ink-3)', margin: 0 }}>Loading match…</p>
        <p className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 10 }}>Fetching match data…</p>
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
          <Link href="/matches" className="btn" style={{ minHeight: 44, padding: '0 20px', textDecoration: 'none' }}>← Matches</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {celebration}
      <div className="screen" style={{ minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden' }}>
        <PitchPulseToaster position={isMobile ? 'top-center' : 'bottom-right'} />

        <ScoreHero match={match} liveClock={liveClock} isMobile={isMobile} />

        <section
          aria-label="AI match prediction"
          style={{
            padding: isMobile ? '20px 16px' : '28px 40px',
            borderBottom: '1px solid var(--rule)',
            background: 'var(--paper)',
          }}
        >
          <MatchPrediction
            homeLabel={match.homeTeam.name}
            awayLabel={match.awayTeam.name}
            prediction={prediction}
            loading={predictionLoading}
            error={predictionError}
          />
        </section>

        {match.hadPenaltyShootout && (
          <PenaltyShootoutPanel
            keyEvents={match.keyEvents ?? []}
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            isMobile={isMobile}
          />
        )}

        {match.keyEvents?.length > 0 && (
          <EventsFeed
            events={match.keyEvents}
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            isMobile={isMobile}
          />
        )}

        {match.teamStats?.length > 0 && (
          <StatsPanel
            teamStats={match.teamStats}
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            isMobile={isMobile}
          />
        )}

        {match.teamLeaders?.length > 0 && (
          <LeadersSection
            leaders={match.teamLeaders}
            isMatchLeaders={match.isMatchLeaders}
            isMobile={isMobile}
          />
        )}

        {(match.headToHead?.length > 0) && (
          <H2HSection
            games={match.headToHead}
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            isMobile={isMobile}
          />
        )}

        {/* News + Standings two-column layout */}
        {(match.news?.length > 0 || match.standingsGroups?.length > 0) && (
          <div style={{
            display: isMobile ? 'block' : 'grid',
            gridTemplateColumns: '4fr 1fr',
            alignItems: 'start',
          }}>
            {match.news?.length > 0 && (
              <div style={{ borderRight: isMobile ? 'none' : '1px solid var(--rule)' }}>
                <NewsSection news={match.news} isMobile={isMobile} />
              </div>
            )}
            {match.standingsGroups?.length > 0 && (
              <div>
                <GroupStandings
                  standingsGroups={match.standingsGroups}
                  standingsGroupsProjected={match.standingsGroupsProjected ?? match.standingsGroups}
                  homeId={match.homeTeam.id}
                  awayId={match.awayTeam.id}
                  isLive={match.state === 'in'}
                  isMobile={isMobile}
                />
              </div>
            )}
          </div>
        )}

        <div style={{ height: isMobile ? 32 : 0 }} aria-hidden="true" />
      </div>
    </>
  );
}

// ── H2H Section ───────────────────────────────────────────────────────────────

function H2HSection({
  games, homeTeam, awayTeam, isMobile,
}: {
  games: H2HGame[];
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  isMobile: boolean;
}) {
  // Determine which side is "home" in H2H from the perspective of the first team's list
  // Count record from homeTeam's perspective
  const homeId = homeTeam.id;
  const record = { w: 0, d: 0, l: 0 };
  for (const g of games) {
    const homeIsOurHome = g.homeTeam.name === homeTeam.name || g.homeTeam.abbreviation === homeTeam.abbreviation;
    const hs = parseInt(g.homeScore);
    const as = parseInt(g.awayScore);
    if (homeIsOurHome) {
      if (hs > as) record.w++;
      else if (hs === as) record.d++;
      else record.l++;
    } else {
      if (as > hs) record.w++;
      else if (as === hs) record.d++;
      else record.l++;
    }
  }

  const RESULT_COLOR: Record<string, string> = { W: '#22c55e', D: '#f59e0b', L: '#ef4444' };

  return (
    <section style={{ borderTop: '1px solid var(--rule)', padding: isMobile ? '20px 16px' : '28px 40px' }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--ink-3)', marginBottom: 16 }}>
        HEAD TO HEAD
      </div>

      {/* Record summary */}
      <div style={{ display: 'flex', gap: isMobile ? 16 : 32, alignItems: 'center', marginBottom: 20 }}>
        {homeTeam.logo && (
          <img src={homeTeam.logo} alt={homeTeam.abbreviation} style={{ width: 28, height: 28, objectFit: 'contain' }} />
        )}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color: '#22c55e' }}>{record.w}</span>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>W</span>
          <span style={{ margin: '0 4px', color: 'var(--rule)' }}>·</span>
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color: '#f59e0b' }}>{record.d}</span>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>D</span>
          <span style={{ margin: '0 4px', color: 'var(--rule)' }}>·</span>
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color: '#ef4444' }}>{record.l}</span>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>L</span>
        </div>
        {awayTeam.logo && (
          <img src={awayTeam.logo} alt={awayTeam.abbreviation} style={{ width: 28, height: 28, objectFit: 'contain' }} />
        )}
        <span style={{ fontSize: 12, color: 'var(--ink-3)', marginLeft: 'auto' }}>
          Last {games.length} meeting{games.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Game rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {games.map((g) => {
          const date = new Date(g.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          const homeIsOurHome = g.homeTeam.name === homeTeam.name || g.homeTeam.abbreviation === homeTeam.abbreviation;
          const hs = parseInt(g.homeScore);
          const as = parseInt(g.awayScore);
          let result: 'W' | 'D' | 'L';
          if (homeIsOurHome) result = hs > as ? 'W' : hs === as ? 'D' : 'L';
          else result = as > hs ? 'W' : as === hs ? 'D' : 'L';

          return (
            <div key={g.id} style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '70px 1fr auto 1fr' : '90px 1fr auto 1fr 160px',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--paper-2)',
              border: '1px solid var(--rule)',
            }}>
              {/* Result badge + date */}
              <div>
                <span style={{
                  display: 'inline-block', padding: '1px 6px', borderRadius: 4,
                  fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)',
                  background: RESULT_COLOR[result] + '22', color: RESULT_COLOR[result],
                  marginBottom: 3,
                }}>{result}</span>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{date}</div>
              </div>

              {/* Home team */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>
                  {isMobile ? g.homeTeam.abbreviation : g.homeTeam.name}
                </span>
                {g.homeTeam.logo && (
                  <img src={g.homeTeam.logo} alt={g.homeTeam.abbreviation} style={{ width: 20, height: 20, objectFit: 'contain' }} />
                )}
              </div>

              {/* Score */}
              <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', textAlign: 'center', minWidth: 48 }}>
                {g.homeScore} – {g.awayScore}
              </div>

              {/* Away team */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {g.awayTeam.logo && (
                  <img src={g.awayTeam.logo} alt={g.awayTeam.abbreviation} style={{ width: 20, height: 20, objectFit: 'contain' }} />
                )}
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>
                  {isMobile ? g.awayTeam.abbreviation : g.awayTeam.name}
                </span>
              </div>

              {/* Competition (desktop only) */}
              {!isMobile && (
                <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--mono)', textAlign: 'right', lineHeight: 1.4 }}>
                  {g.competition}
                  {g.round && <><br />{g.round}</>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );

}
