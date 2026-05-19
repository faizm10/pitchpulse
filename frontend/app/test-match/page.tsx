'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Toaster, toast } from 'sonner';

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
  type: string;
  typeId: string;
  text: string;
  scoringPlay: boolean;
  homeScore: number | null;
  awayScore: number | null;
  participants: { athlete: string; type: string }[];
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
}

interface LeaderCategory {
  category: string;
  value: string;
  shortValue: string;
  athlete: { name: string; id: string; headshot: string | null };
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
  displayClock: string;
  homeTeam: Team;
  awayTeam: Team;
  venue: { name: string; city: string; country: string };
  broadcast: string;
  keyEvents: KeyEvent[];
  teamStats: TeamStats[];
  news: NewsItem[];
  standings: StandingRow[];
  teamLeaders: TeamLeaders[];
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

function eventIcon(typeId: string, scoringPlay: boolean): string {
  if (scoringPlay) return '⚽';
  if (typeId === '28' || typeId === '27') return '🟨';
  if (typeId === '52' || typeId === '51') return '🟥';
  if (typeId === '1') return '↔';
  return '•';
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

// ── Score hero ────────────────────────────────────────────────────────────────

function ScoreHero({ match, liveClock }: { match: MatchData; liveClock: string }) {
  const { homeTeam, awayTeam, state, statusDetail, displayClock, date } = match;
  // Use the locally-ticking clock when live, fall back to ESPN value
  const clockDisplay = state === 'in' ? (liveClock || displayClock) : displayClock;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', gap: 16,
      alignItems: 'center', padding: '36px 32px',
      borderBottom: '1px solid var(--rule)', width: '100%', boxSizing: 'border-box',
    }}>
      {/* Home */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        {homeTeam.logo && <img src={homeTeam.logo} alt={homeTeam.name} style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <div className="serif" style={{ fontSize: 28, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{homeTeam.name}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.18em', marginTop: 5 }}>{homeTeam.abbreviation}</div>
        </div>
        {state !== 'pre' && (
          <div className="serif tnum" style={{ fontSize: 64, lineHeight: 1, marginLeft: 8, flexShrink: 0 }}>{homeTeam.score}</div>
        )}
      </div>

      {/* Centre status */}
      <div style={{ textAlign: 'center', minWidth: 80, flexShrink: 0 }}>
        {state === 'in' && (
          <>
            <div className="mono" style={{ fontSize: 10, color: 'var(--live)', letterSpacing: '0.2em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
              LIVE
            </div>
            <div className="mono" style={{ fontSize: 22, marginTop: 5, fontVariantNumeric: 'tabular-nums' }}>
              {clockDisplay || '–'}
            </div>
            {statusDetail && (
              <div className="serif" style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--ink-3)', marginTop: 3 }}>{statusDetail}</div>
            )}
          </>
        )}
        {state === 'post' && (
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.16em' }}>{statusDetail || 'FULL TIME'}</div>
        )}
        {state === 'pre' && (
          <>
            <div className="mono" style={{ fontSize: 20, color: 'var(--ink)' }}>VS</div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 7, lineHeight: 1.6 }}>{formatKickoff(date)}</div>
          </>
        )}
      </div>

      {/* Away */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexDirection: 'row-reverse', minWidth: 0 }}>
        {awayTeam.logo && <img src={awayTeam.logo} alt={awayTeam.name} style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }} />}
        <div style={{ textAlign: 'right', minWidth: 0 }}>
          <div className="serif" style={{ fontSize: 28, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{awayTeam.name}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.18em', marginTop: 5 }}>{awayTeam.abbreviation}</div>
        </div>
        {state !== 'pre' && (
          <div className="serif tnum" style={{ fontSize: 64, lineHeight: 1, marginRight: 8, flexShrink: 0 }}>{awayTeam.score}</div>
        )}
      </div>
    </div>
  );
}

// ── Events feed ───────────────────────────────────────────────────────────────

function EventsFeed({ events }: { events: KeyEvent[] }) {
  if (!events.length) {
    return <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', padding: '24px 0' }}>No key events yet.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[...events].reverse().map((ev) => {
        const alignRight = ev.participants?.[0]?.type?.toLowerCase().includes('away');
        return (
          <div key={ev.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
            borderBottom: '1px solid var(--rule-soft)',
            justifyContent: alignRight ? 'flex-end' : 'flex-start',
          }}>
            {!alignRight && <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', minWidth: 36 }}>{ev.clock}</div>}
            <div style={{ fontSize: 18 }}>{eventIcon(ev.typeId, ev.scoringPlay)}</div>
            <div style={{ textAlign: alignRight ? 'right' : 'left' }}>
              <div className="serif" style={{ fontSize: 15 }}>{ev.participants?.[0]?.athlete || ev.text}</div>
              {ev.text && ev.participants?.[0]?.athlete && (
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{ev.text}</div>
              )}
              {ev.scoringPlay && ev.homeScore != null && (
                <div className="mono" style={{ fontSize: 10, color: 'var(--live)', marginTop: 2 }}>{ev.homeScore} – {ev.awayScore}</div>
              )}
            </div>
            {alignRight && <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', minWidth: 36, textAlign: 'right' }}>{ev.clock}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── Stats bars ────────────────────────────────────────────────────────────────

function StatsPanel({ teamStats, homeTeam, awayTeam }: { teamStats: TeamStats[]; homeTeam: Team; awayTeam: Team }) {
  const homeStats = teamStats.find((t) => t.teamId === homeTeam.id);
  const awayStats = teamStats.find((t) => t.teamId === awayTeam.id);
  if (!homeStats || !awayStats) return <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>Stats available once match begins.</div>;

  const homeMap = Object.fromEntries(homeStats.stats.map((s) => [s.name, s.displayValue]));
  const awayMap = Object.fromEntries(awayStats.stats.map((s) => [s.name, s.displayValue]));
  const available = STAT_KEYS.filter((k) => homeMap[k] !== undefined || awayMap[k] !== undefined);
  if (!available.length) return <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>No stats yet.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {available.map((key) => {
        const hVal = homeMap[key] ?? '–';
        const aVal = awayMap[key] ?? '–';
        const hNum = parseFloat(hVal.replace('%', '')) || 0;
        const aNum = parseFloat(aVal.replace('%', '')) || 0;
        const total = hNum + aNum || 1;
        const hPct = Math.round((hNum / total) * 100);
        return (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span className="mono" style={{ fontSize: 13 }}>{hVal}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>{(STAT_LABELS[key] ?? key).toUpperCase()}</span>
              <span className="mono" style={{ fontSize: 13 }}>{aVal}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--rule)', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${hPct}%`, background: homeTeam.color || 'var(--ink)', transition: 'width 0.6s ease' }} />
              <div style={{ flex: 1, background: awayTeam.color || 'var(--ink-3)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Team leaders ──────────────────────────────────────────────────────────────

function LeadersSection({ teamLeaders, homeId }: { teamLeaders: TeamLeaders[]; homeId: string }) {
  if (!teamLeaders.length) return null;
  // home first
  const sorted = [...teamLeaders].sort((a) => (a.teamId === homeId ? -1 : 1));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--rule)' }}>
      {sorted.map((team) => (
        <div key={team.teamId} style={{ background: 'var(--paper)', padding: '24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            {team.teamLogo && <img src={team.teamLogo} alt={team.teamName} style={{ width: 28, height: 28, objectFit: 'contain' }} />}
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)' }}>{team.teamName.toUpperCase()} · SEASON LEADERS</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {team.categories.map((cat) => (
              <div key={cat.category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--rule-soft)' }}>
                <div>
                  <div className="mono" style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-3)', marginBottom: 3 }}>{cat.category.toUpperCase()}</div>
                  <div className="serif" style={{ fontSize: 17 }}>{cat.athlete.name || '–'}</div>
                </div>
                <div className="serif tnum" style={{ fontSize: 28, color: 'var(--ink)' }}>
                  {/* extract just the key number from displayValue e.g. "Goals: 12" */}
                  {cat.value.match(/\d+/g)?.slice(-1)?.[0] ?? cat.shortValue}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Standings ─────────────────────────────────────────────────────────────────

function StandingsTable({ standings, homeId, awayId }: { standings: StandingRow[]; homeId: string; awayId: string }) {
  if (!standings.length) return null;
  return (
    <div style={{ padding: '28px 32px' }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', marginBottom: 20, borderBottom: '1px solid var(--rule)', paddingBottom: 10 }}>
        PREMIER LEAGUE TABLE
      </div>
      <div style={{ overflowX: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 32px 32px 32px 32px 32px 40px', gap: 8, padding: '6px 8px', borderBottom: '1px solid var(--rule)', marginBottom: 4 }}>
          {['#', 'Team', 'P', 'W', 'D', 'L', 'GD', 'Pts'].map((h) => (
            <div key={h} className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.14em', textAlign: h === 'Team' ? 'left' : 'right' }}>{h}</div>
          ))}
        </div>
        {standings.map((row) => {
          const isHighlighted = row.teamId === homeId || row.teamId === awayId;
          return (
            <div key={row.teamId} style={{
              display: 'grid', gridTemplateColumns: '24px 1fr 32px 32px 32px 32px 32px 40px', gap: 8,
              padding: '7px 8px', borderRadius: 4, alignItems: 'center',
              background: isHighlighted ? 'var(--paper-2)' : 'transparent',
              borderLeft: isHighlighted ? '2px solid var(--pulse)' : '2px solid transparent',
            }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right' }}>{row.rank || '–'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {row.logo && <img src={row.logo} alt={row.name} style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }} />}
                <span className={isHighlighted ? 'serif' : 'mono'} style={{ fontSize: isHighlighted ? 14 : 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.abbreviation || row.name}
                </span>
              </div>
              {[row.played, row.wins, row.draws, row.losses, row.gd >= 0 ? `+${row.gd}` : row.gd].map((val, i) => (
                <div key={i} className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--ink-3)' }}>{val}</div>
              ))}
              <div className="mono" style={{ fontSize: 12, textAlign: 'right', fontWeight: isHighlighted ? 700 : 400 }}>{row.points}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── News ──────────────────────────────────────────────────────────────────────

function NewsSection({ news }: { news: NewsItem[] }) {
  if (!news.length) return null;
  return (
    <div style={{ padding: '28px 32px', borderTop: '1px solid var(--rule)' }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', marginBottom: 20 }}>
        LATEST NEWS
      </div>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
        {news.map((item) => (
          <a
            key={item.id}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flexShrink: 0, width: 260, textDecoration: 'none', color: 'inherit',
              border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden',
              background: 'var(--paper)', display: 'flex', flexDirection: 'column',
              transition: 'border-color 0.15s',
            }}
          >
            {item.image && (
              <div style={{ height: 140, overflow: 'hidden', background: 'var(--paper-2)' }}>
                <img
                  src={item.image}
                  alt={item.headline}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="serif" style={{ fontSize: 14, lineHeight: 1.4 }}>{item.headline}</div>
              {item.description && (
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.description}
                </div>
              )}
              <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 'auto', letterSpacing: '0.1em' }}>
                ESPN · {timeAgo(item.published)}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

// ── Event toast helpers ───────────────────────────────────────────────────────

// Shared base style — monospace, paper-toned, consistent sizing
const BASE_TOAST: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: 12,
  letterSpacing: '0.04em',
  borderRadius: 8,
  padding: '14px 16px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
  minWidth: 280,
  maxWidth: 340,
};

function toastForEvent(ev: KeyEvent, home: Team, away: Team) {
  const typeId = ev.typeId;
  const athlete = ev.participants?.[0]?.athlete || ev.text || 'Unknown';
  const isHome = !ev.participants?.[0]?.type?.toLowerCase().includes('away');
  const team = isHome ? home : away;
  const clock = ev.clock ? `${ev.clock}` : '';
  // Always show home – away order regardless of scorer
  const scoreStr = ev.homeScore != null
    ? `${home.name}  ${ev.homeScore} – ${ev.awayScore}  ${away.name}`
    : '';

  if (ev.scoringPlay) {
    toast(`⚽  GOAL!  ${athlete}`, {
      description: scoreStr ? `${clock ? clock + '  ·  ' : ''}${scoreStr}` : clock,
      duration: 8000,
      style: {
        ...BASE_TOAST,
        background: '#111',
        color: '#f2ede3',
        border: '1.5px solid #e63c3c',
      },
    });
  } else if (typeId === '28' || typeId === '27') {
    toast(`🟨  Yellow Card  —  ${athlete}`, {
      description: `${clock ? clock + '  ·  ' : ''}${team.name}`,
      duration: 5000,
      style: {
        ...BASE_TOAST,
        background: '#fffbea',
        color: '#1a1a1a',
        border: '1.5px solid #e6b800',
      },
    });
  } else if (typeId === '52' || typeId === '51') {
    toast(`🟥  Red Card  —  ${athlete}`, {
      description: `${clock ? clock + '  ·  ' : ''}${team.name}`,
      duration: 7000,
      style: {
        ...BASE_TOAST,
        background: '#1e0505',
        color: '#f2ede3',
        border: '1.5px solid #c0392b',
      },
    });
  } else if (typeId === '1') {
    toast(`↔  Substitution  —  ${athlete}`, {
      description: `${clock ? clock + '  ·  ' : ''}${team.name}`,
      duration: 4000,
      style: {
        ...BASE_TOAST,
        background: 'var(--paper, #f2ede3)',
        color: 'var(--ink, #1a1a1a)',
        border: '1px solid #ccc',
      },
    });
  } else {
    toast(ev.text || ev.type, {
      description: `${clock ? clock + '  ·  ' : ''}${team.name}`,
      duration: 4000,
      style: {
        ...BASE_TOAST,
        background: 'var(--paper, #f2ede3)',
        color: 'var(--ink, #1a1a1a)',
        border: '1px solid #ccc',
      },
    });
  }
}

// ── Clock ticker helpers ──────────────────────────────────────────────────────

// Parse "45+2'" or "7'" into total seconds
function parseClockToSeconds(clock: string): number {
  const m = clock.match(/^(\d+)(?:\+(\d+))?/);
  if (!m) return 0;
  const base = parseInt(m[1], 10);
  const added = m[2] ? parseInt(m[2], 10) : 0;
  return (base + added) * 60;
}

// Render total seconds back to "MM:SS" display
function secondsToClock(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function TestMatchPage() {
  const [match, setMatch] = useState<MatchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [liveClock, setLiveClock] = useState<string>('');
  // { seconds: number at fetch time, fetchedAt: ms timestamp }
  const clockBase = useRef<{ seconds: number; fetchedAt: number } | null>(null);
  const seenEventIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/test-match/${GAME_ID}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const incoming: MatchData = data.match;

      // On first load, seed seen IDs without toasting
      if (isFirstLoad.current) {
        incoming.keyEvents.forEach((ev) => seenEventIds.current.add(ev.id));
        isFirstLoad.current = false;
      } else {
        // Find events we haven't seen yet
        const newEvents = incoming.keyEvents.filter(
          (ev) => !seenEventIds.current.has(ev.id)
        );
        newEvents.forEach((ev) => {
          seenEventIds.current.add(ev.id);
          toastForEvent(ev, incoming.homeTeam, incoming.awayTeam);
        });
      }

      setMatch(incoming);
      setError(null);
      setLastFetched(Date.now());

      // Seed the live clock base so the ticker can count up between polls
      if (incoming.state === 'in' && incoming.displayClock) {
        clockBase.current = {
          seconds: parseClockToSeconds(incoming.displayClock),
          fetchedAt: Date.now(),
        };
      } else {
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

  // 1-second ticker: drives live clock AND the "X ago" counter
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      if (clockBase.current) {
        const elapsed = Math.floor((Date.now() - clockBase.current.fetchedAt) / 1000);
        setLiveClock(secondsToClock(clockBase.current.seconds + elapsed));
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="screen" style={{ padding: 60 }}>
        <div className="serif it" style={{ fontSize: 28, color: 'var(--ink-3)' }}>Loading match…</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 12 }}>Fetching game {GAME_ID} from ESPN</div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="screen" style={{ padding: 60 }}>
        <div className="serif" style={{ fontSize: 28 }}>Match not found</div>
        <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 12 }}>{error}</div>
        <button className="btn" onClick={fetchMatch} style={{ marginTop: 24 }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="screen" style={{ minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden' }}>

      <Toaster position="bottom-right" expand gap={10} />

      {/* Header bar */}
      <div style={{ padding: '12px 32px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--paper-2)', flexWrap: 'wrap', gap: 8 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)' }}>
          ESPN TEST · GAME {GAME_ID} · {match.league.toUpperCase()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
            {lastFetched ? `Updated ${ago(lastFetched)}` : 'Fetching…'}
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
            Polls every {match.state === 'in' ? '15s' : '30s'}
          </div>
          <button className="btn" onClick={fetchMatch} style={{ fontSize: 10, padding: '4px 12px' }}>Refresh</button>
          <button
            className="btn"
            style={{ fontSize: 10, padding: '4px 12px', background: 'var(--pulse)', color: '#fff', border: 'none' }}
            onClick={() => {
              const fakeEvents: KeyEvent[] = [
                { id: 'demo-goal', clock: "23'", period: 1, type: 'Goal', typeId: 'goal', text: 'Goal scored!', scoringPlay: true, homeScore: 1, awayScore: 0, participants: [{ athlete: 'Erling Haaland', type: 'away' }] },
                { id: 'demo-yellow', clock: "45+2'", period: 1, type: 'Yellow Card', typeId: '27', text: 'Foul', scoringPlay: false, homeScore: null, awayScore: null, participants: [{ athlete: 'Lewis Cook', type: 'home' }] },
                { id: 'demo-red', clock: "78'", period: 2, type: 'Red Card', typeId: '52', text: 'Serious foul', scoringPlay: false, homeScore: null, awayScore: null, participants: [{ athlete: 'Marcos Senesi', type: 'home' }] },
              ];
              if (!match) return;
              fakeEvents.forEach((ev, i) => {
                setTimeout(() => toastForEvent(ev, match.homeTeam, match.awayTeam), i * 800);
              });
            }}
          >
            Test Toasts
          </button>
        </div>
      </div>

      {/* Score */}
      <ScoreHero match={match} liveClock={liveClock} />

      {/* Venue */}
      <div style={{ padding: '10px 32px', borderBottom: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em' }}>
          {[match.venue.name, match.venue.city, match.venue.country].filter(Boolean).join(' · ').toUpperCase()}
          {match.broadcast ? ` · ${match.broadcast.toUpperCase()}` : ''}
        </div>
      </div>

      {/* Events + Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ padding: '28px 32px', borderRight: '1px solid var(--rule)' }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', marginBottom: 16, borderBottom: '1px solid var(--rule)', paddingBottom: 10 }}>
            KEY EVENTS ({match.keyEvents.length})
          </div>
          <EventsFeed events={match.keyEvents} />
        </div>
        <div style={{ padding: '28px 32px' }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', marginBottom: 16, borderBottom: '1px solid var(--rule)', paddingBottom: 10 }}>
            MATCH STATS
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 11, height: 11, borderRadius: 2, background: match.homeTeam.color }} />
              <span className="mono" style={{ fontSize: 11 }}>{match.homeTeam.abbreviation}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span className="mono" style={{ fontSize: 11 }}>{match.awayTeam.abbreviation}</span>
              <div style={{ width: 11, height: 11, borderRadius: 2, background: match.awayTeam.color }} />
            </div>
          </div>
          <StatsPanel teamStats={match.teamStats} homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
        </div>
      </div>

      {/* Team leaders */}
      {match.teamLeaders.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--rule)' }}>
          <LeadersSection teamLeaders={match.teamLeaders} homeId={match.homeTeam.id} />
        </div>
      )}

      {/* News */}
      {match.news.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--rule)' }}>
          <NewsSection news={match.news} />
        </div>
      )}

      {/* Standings + raw response */}
      <div style={{ display: 'grid', gridTemplateColumns: match.standings.length ? '1fr 1fr' : '1fr', borderBottom: '1px solid var(--rule)' }}>
        {match.standings.length > 0 && (
          <StandingsTable standings={match.standings} homeId={match.homeTeam.id} awayId={match.awayTeam.id} />
        )}
        <div style={{ padding: '28px 32px', borderLeft: match.standings.length ? '1px solid var(--rule)' : 'none' }}>
          <details>
            <summary className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', cursor: 'pointer', letterSpacing: '0.16em', marginBottom: 12 }}>
              RAW API RESPONSE
            </summary>
            <pre style={{ padding: 16, background: 'var(--paper-2)', borderRadius: 8, fontSize: 10, overflow: 'auto', maxHeight: 480, color: 'var(--ink)' }}>
              {JSON.stringify(match, null, 2)}
            </pre>
          </details>
        </div>
      </div>

    </div>
  );
}
