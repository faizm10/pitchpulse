'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Map, MapMarker, MarkerContent, MarkerPopup, MapControls, useMap } from '@/components/ui/map';
import { DEFAULT_MAP_VIEW } from '@/data/venues';
import { GoalNotification } from '@/components/GoalNotification';
import type { GoalData } from '@/components/GoalNotification';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TestGame {
  slug: string;
  href: string;
  source: 'espn' | 'fotmob';
  matchId: string;
  apiPath: string;
  league: string;
  round?: string;
  homeColor?: string;
  awayColor?: string;
}

interface LiveInfo {
  state: 'pre' | 'in' | 'post';
  homeTeam: { name: string; shortName?: string; logo: string; score: string };
  awayTeam: { name: string; shortName?: string; logo: string; score: string };
  statusDetail: string;
  liveClock?: string;
  league: string;
  round?: string;
  hadPenaltyShootout?: boolean;
  penScore?: { home: number; away: number } | null;
}

// ── Game registry ─────────────────────────────────────────────────────────────

const TEST_GAMES: TestGame[] = [
  {
    slug: 'uel-fri-vil',
    href: '/test-mls/fri-vil',
    source: 'espn',
    matchId: '401862911',
    apiPath: '/api/test-mls/401862911?league=uefa.europa',
    league: 'UEFA Europa League',
    round: 'Final',
    homeColor: '#e30613',
    awayColor: '#e30613',
  },
  {
    slug: 'mls-hou-stl',
    href: '/test-mls/hou-stl',
    source: 'espn',
    matchId: '401871127',
    apiPath: '/api/test-mls/401871127?league=usa.open&fotmob=9441',
    league: 'US Open Cup',
    round: 'QF',
    homeColor: '#f6891f',
    awayColor: '#003087',
  },
  {
    slug: 'mls-clb-nyc',
    href: '/test-mls/clb-nyc',
    source: 'espn',
    matchId: '401871130',
    apiPath: '/api/test-mls/401871130?league=usa.open&fotmob=9441',
    league: 'US Open Cup',
    round: 'QF',
    homeColor: '#ffd200',
    awayColor: '#69b3e7',
  },
  {
    slug: 'mls-col-sj',
    href: '/test-mls/col-sj',
    source: 'espn',
    matchId: '401871129',
    apiPath: '/api/test-mls/401871129?league=usa.open&fotmob=9441',
    league: 'US Open Cup',
    round: 'QF',
    homeColor: '#862633',
    awayColor: '#0d4c92',
  },
];

const VENUES: Record<string, { name: string; city: string; longitude: number; latitude: number }> = {
  'uel-fri-vil': { name: 'Vodafone Park', city: 'Istanbul, Turkey', longitude: 29.0097, latitude: 41.034 },
  'mls-hou-stl': { name: 'Shell Energy Stadium', city: 'Houston, TX', longitude: -95.351, latitude: 29.7522 },
  'mls-clb-nyc': { name: 'ScottsMiracle-Gro Field', city: 'Columbus, OH', longitude: -82.9917, latitude: 39.9689 },
  'mls-col-sj':  { name: "Dick's Sporting Goods Park", city: 'Commerce City, CO', longitude: -104.8919, latitude: 39.8052 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function stateLabel(state: LiveInfo['state'], hadPK?: boolean) {
  if (state === 'in') return 'LIVE';
  if (state === 'post') return hadPK ? 'FT (P)' : 'FT';
  return 'PRE';
}

function stateColor(state: LiveInfo['state']) {
  return state === 'in' ? 'var(--live)' : 'var(--ink-3)';
}

function matchFromPayload(m: Record<string, unknown>): LiveInfo {
  return {
    state: m.state as LiveInfo['state'],
    homeTeam: m.homeTeam as LiveInfo['homeTeam'],
    awayTeam: m.awayTeam as LiveInfo['awayTeam'],
    statusDetail: (m.statusDetail as string) ?? '',
    liveClock: (m.liveClock as string) ?? (m.displayClock as string) ?? '',
    league: (m.league as string) ?? '',
    round: m.round as string | undefined,
    hadPenaltyShootout: (m.hadPenaltyShootout as boolean) ?? false,
    penScore: (m.penScore as { home: number; away: number } | null) ?? null,
  };
}

async function fetchMatchInfo(apiPath: string, signal: AbortSignal): Promise<LiveInfo> {
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const res = await fetch(apiPath, { signal, cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.match) throw new Error(data.error ?? `HTTP ${res.status}`);
      return matchFromPayload(data.match);
    } catch (err) {
      if (signal.aborted) throw err;
      lastErr = err;
      if (i < 2) await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

function useIsMobile(bp = 768) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp - 1}px)`);
    setV(mq.matches);
    const h = (e: MediaQueryListEvent) => setV(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [bp]);
  return v;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 100, padding: '16px 20px',
      borderRadius: 10, background: 'var(--paper)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      borderTop: `3px solid ${accent ?? 'var(--ink-2)'}`,
    }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-3)', marginBottom: 6 }}>
        {label}
      </div>
      <div className="serif" style={{ fontSize: 28, lineHeight: 1, color: accent ?? 'var(--ink)' }}>
        {value}
      </div>
    </div>
  );
}

// ── API health row ─────────────────────────────────────────────────────────────

function ApiRow({ game, info, error }: { game: TestGame; info: LiveInfo | null; error: boolean }) {
  const status = error ? 'ERROR' : info ? 'OK' : 'POLLING';
  const color = error ? '#e63c3c' : info ? '#22c55e' : 'var(--ink-3)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--rule-soft)' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>
        {game.slug.toUpperCase()}
      </span>
      <span className="mono" style={{ fontSize: 8, letterSpacing: '0.1em', color, flexShrink: 0 }}>{status}</span>
    </div>
  );
}

// ── Map ───────────────────────────────────────────────────────────────────────

function MapLoadedObserver({ onLoad }: { onLoad: () => void }) {
  const { isLoaded } = useMap();
  useEffect(() => { if (isLoaded) onLoad(); }, [isLoaded, onLoad]);
  return null;
}

function DashboardMarkers({
  games,
  liveInfos,
  goalFiredFor,
  onSelect,
}: {
  games: TestGame[];
  liveInfos: Record<string, LiveInfo | null>;
  goalFiredFor: string | null;
  onSelect: (href: string) => void;
}) {
  return (
    <>
      {games.map(game => {
        const venue = VENUES[game.slug];
        if (!venue) return null;
        const info = liveInfos[game.slug];
        const isLive = info?.state === 'in';
        const isGoal = goalFiredFor === game.slug;
        const color = '#e63c3c';

        return (
          <MapMarker key={game.slug} longitude={venue.longitude} latitude={venue.latitude}>
            <MarkerContent>
              <div style={{ position: 'relative', width: isGoal ? 32 : 20, height: isGoal ? 32 : 20, transition: 'width 0.3s, height 0.3s' }}>
                {/* Goal burst ring */}
                {isGoal && (
                  <>
                    <span style={{
                      position: 'absolute', inset: -8, borderRadius: '50%',
                      background: '#fbbf24',
                      animation: 'pulse-ring 0.7s ease-out infinite',
                      zIndex: 0,
                    }} />
                    <span style={{
                      position: 'absolute', inset: -16, borderRadius: '50%',
                      background: 'rgba(251,191,36,0.3)',
                      animation: 'pulse-ring 0.7s 0.15s ease-out infinite',
                      zIndex: 0,
                    }} />
                  </>
                )}
                {/* Live pulse */}
                {isLive && !isGoal && (
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    backgroundColor: color,
                    animation: 'pulse-ring 1.8s ease-out infinite',
                  }} />
                )}
                {/* Glow */}
                <div style={{
                  position: 'absolute', top: -5, left: -5, right: -5, bottom: -5,
                  borderRadius: '50%', filter: 'blur(7px)', opacity: isGoal ? 1 : 0.65,
                  backgroundColor: isGoal ? '#fbbf24' : color,
                  pointerEvents: 'none', transition: 'background-color 0.3s',
                }} />
                {/* Dot */}
                <button
                  type="button"
                  aria-label={`${venue.name} — view match`}
                  style={{
                    display: 'block',
                    width: isGoal ? 32 : 20,
                    height: isGoal ? 32 : 20,
                    borderRadius: '50%',
                    border: isGoal ? '3px solid #fbbf24' : '3px solid white',
                    backgroundColor: isGoal ? '#fbbf24' : color,
                    cursor: 'pointer', padding: 0,
                    boxShadow: isGoal
                      ? '0 0 0 4px rgba(251,191,36,0.4), 0 4px 16px rgba(251,191,36,0.6)'
                      : `0 2px 8px ${color}99, 0 0 0 1px rgba(0,0,0,0.1)`,
                    transition: 'all 0.3s',
                    zIndex: 1, position: 'relative',
                    fontSize: isGoal ? 16 : 0,
                    lineHeight: 1,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.35)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                >
                  {isGoal ? '⚽' : ''}
                </button>

                {/* GOAL! badge */}
                {isGoal && (
                  <div style={{
                    position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)',
                    background: '#fbbf24', color: '#000', fontWeight: 900,
                    fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
                    padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    animation: 'ar-pop 0.4s cubic-bezier(.2,1.6,.4,1) both',
                  }}>
                    GOAL!
                  </div>
                )}
              </div>
            </MarkerContent>

            <MarkerPopup>
              <div style={{ minWidth: 200, borderRadius: 12, overflow: 'hidden', background: 'var(--paper)' }}>
                <div style={{ height: 4, background: isGoal ? '#fbbf24' : color }} />
                <div style={{ padding: 12, background: 'var(--paper-2)' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{venue.name}</p>
                  <p style={{ margin: '2px 0 8px', fontSize: 11, color: 'var(--ink-3)' }}>
                    {venue.city} · {game.league}
                  </p>
                  {info ? (
                    [info.homeTeam, info.awayTeam].map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                        <img src={t.logo} alt="" width={14} height={14}
                          style={{ width: 14, height: 14, objectFit: 'contain' }}
                          onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                        <span style={{ flex: 1, fontSize: 11, color: 'var(--ink)' }}>{t.shortName ?? t.name}</span>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                          {info.state !== 'pre' ? t.score : '–'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', padding: '4px 0' }}>Loading…</div>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(game.href)}
                    style={{
                      marginTop: 10, width: '100%', borderRadius: 7,
                      border: 'none', background: 'var(--paper)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                      padding: '7px 12px', fontSize: 10, fontWeight: 500,
                      color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--mono)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    VIEW MATCH →
                  </button>
                </div>
              </div>
            </MarkerPopup>
          </MapMarker>
        );
      })}
    </>
  );
}

// ── Match detail modal ────────────────────────────────────────────────────────

function MatchDetailModal({
  game,
  info,
  onClose,
}: {
  game: TestGame;
  info: LiveInfo | null;
  onClose: () => void;
}) {
  const venue = VENUES[game.slug];

  // Close on backdrop click
  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Match details"
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 520,
        background: 'var(--paper)', borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>
        {/* Modal header */}
        <div style={{
          padding: '16px 20px', background: 'var(--paper-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div className="mono" style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-3)', marginBottom: 3 }}>
              {game.league}{game.round ? ` · ${game.round}` : ''}
            </div>
            <div className="serif" style={{ fontSize: 18, lineHeight: 1 }}>
              {info ? `${info.homeTeam.shortName ?? info.homeTeam.name} vs ${info.awayTeam.shortName ?? info.awayTeam.name}` : game.slug.toUpperCase()}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              border: 'none', background: 'var(--paper)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              cursor: 'pointer', fontSize: 16, color: 'var(--ink-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Score section */}
        <div style={{ padding: '28px 24px 20px' }}>
          {info ? (
            <>
              {/* Teams + score */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
                  <img src={info.homeTeam.logo} alt={info.homeTeam.name} width={56} height={56}
                    style={{ width: 56, height: 56, objectFit: 'contain' }}
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                  <span className="serif" style={{ fontSize: 15, lineHeight: 1.2 }}>{info.homeTeam.name}</span>
                </div>

                <div style={{ textAlign: 'center' }}>
                  {info.state !== 'pre' ? (
                    <>
                      <div className="serif tnum" style={{ fontSize: 44, lineHeight: 1, letterSpacing: '0.04em' }}>
                        {info.homeTeam.score}
                        <span style={{ margin: '0 8px', color: 'var(--ink-3)', fontSize: 32 }}>–</span>
                        {info.awayTeam.score}
                      </div>
                      {info.hadPenaltyShootout && info.penScore && (
                        <div style={{ marginTop: 6, textAlign: 'center' }}>
                          <span className="serif tnum" style={{ fontSize: 16, color: 'var(--ink-3)' }}>
                            {info.penScore.home} – {info.penScore.away}
                          </span>
                          <div className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)', marginTop: 2 }}>ON PENS</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mono" style={{ fontSize: 20, color: 'var(--ink-3)' }}>VS</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8 }}>
                    {info.state === 'in' && (
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
                    )}
                    <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: stateColor(info.state) }}>
                      {stateLabel(info.state, info.hadPenaltyShootout)}
                      {info.state === 'in' && info.liveClock ? ` · ${info.liveClock}` : ''}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
                  <img src={info.awayTeam.logo} alt={info.awayTeam.name} width={56} height={56}
                    style={{ width: 56, height: 56, objectFit: 'contain' }}
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                  <span className="serif" style={{ fontSize: 15, lineHeight: 1.2 }}>{info.awayTeam.name}</span>
                </div>
              </div>

              {/* Meta rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {[
                  { label: 'Venue', value: venue ? `${venue.name}, ${venue.city}` : '—' },
                  { label: 'Match ID', value: game.matchId },
                  { label: 'Source', value: game.source.toUpperCase() },
                  { label: 'API Path', value: game.apiPath },
                ].map((row, i) => (
                  <div key={row.label} style={{
                    display: 'flex', gap: 12,
                    padding: '10px 14px',
                    background: i % 2 === 0 ? 'var(--paper-2)' : 'var(--paper)',
                  }}>
                    <span className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--ink-3)', width: 64, flexShrink: 0, paddingTop: 1 }}>
                      {row.label.toUpperCase()}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink)', wordBreak: 'break-all' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>Loading match data…</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          display: 'flex', gap: 10, justifyContent: 'flex-end',
          background: 'var(--paper-2)',
        }}>
          <button
            type="button"
            onClick={onClose}
            className="mono"
            style={{
              padding: '8px 16px', borderRadius: 7, border: 'none',
              background: 'var(--paper)', fontSize: 10, cursor: 'pointer',
              color: 'var(--ink-3)', letterSpacing: '0.1em',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            CLOSE
          </button>
          <Link
            href={game.href}
            className="mono"
            style={{
              padding: '8px 16px', borderRadius: 7,
              background: 'var(--pulse)', color: '#fff',
              fontSize: 10, textDecoration: 'none', letterSpacing: '0.1em',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            FULL MATCH PAGE →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Goal scorer test panel ────────────────────────────────────────────────────

const DEFAULT_GOAL_FORM = {
  gameSlug: 'mls-hou-stl',
  side: 'home' as 'home' | 'away',
  playerName: 'Fafà Picault',
  number: 10,
  minute: 45,
  flag: '🇭🇹',
  assist: '',
};

function GoalTestPanel({
  liveInfos,
  onFireGoal,
}: {
  liveInfos: Record<string, LiveInfo | null>;
  onFireGoal: (data: GoalData, slug: string) => void;
}) {
  const [form, setForm] = useState(DEFAULT_GOAL_FORM);
  const [open, setOpen] = useState(false);

  const selectedGame = TEST_GAMES.find(g => g.slug === form.gameSlug)!;
  const info = liveInfos[form.gameSlug];

  // Auto-fill player name when game/side changes
  const handleGameChange = useCallback((slug: string) => {
    setForm(prev => ({ ...prev, gameSlug: slug }));
  }, []);

  const handleFire = useCallback(() => {
    const parts = form.playerName.trim().split(/\s+/);
    const given = parts.length > 1 ? parts[0] : '';
    const surname = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];

    const scoringTeam = form.side === 'home' ? info?.homeTeam : info?.awayTeam;
    const teamColor = form.side === 'home'
      ? (selectedGame.homeColor ?? '#1d4ed8')
      : (selectedGame.awayColor ?? '#0f766e');

    const homeScore = parseInt(info?.homeTeam.score ?? '0', 10) || 0;
    const awayScore = parseInt(info?.awayTeam.score ?? '0', 10) || 0;

    const goalData: GoalData = {
      given,
      surname,
      number: form.number,
      minute: form.minute,
      homeTeam: info?.homeTeam.shortName ?? info?.homeTeam.name ?? 'HOM',
      awayTeam: info?.awayTeam.shortName ?? info?.awayTeam.name ?? 'AWY',
      homeScore: form.side === 'home' ? homeScore + 1 : homeScore,
      awayScore: form.side === 'away' ? awayScore + 1 : awayScore,
      teamColor,
      accentColor: '#f4d35e',
      matchLabel: selectedGame.league.toUpperCase(),
      assist: form.assist,
      flag: form.flag,
    };

    onFireGoal(goalData, form.gameSlug);
    setOpen(false);
  }, [form, info, selectedGame]);

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', background: 'var(--paper)' }}>
      {/* Panel toggle header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--paper)', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚽</span>
          <div>
            <div className="mono" style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-3)' }}>TEST</div>
            <div className="serif" style={{ fontSize: 15, lineHeight: 1.1 }}>Goal Scorer</div>
          </div>
        </div>
        <span className="mono" style={{ fontSize: 14, color: 'var(--ink-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ↓
        </span>
      </button>

      {/* Form */}
      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--rule-soft)' }}>
          <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Match select */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>MATCH</span>
              <select
                value={form.gameSlug}
                onChange={e => handleGameChange(e.target.value)}
                style={{
                  padding: '7px 10px', borderRadius: 7, border: 'none',
                  background: 'var(--paper-2)', fontSize: 11, color: 'var(--ink)',
                  fontFamily: 'var(--mono)', cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                }}
              >
                {TEST_GAMES.map(g => (
                  <option key={g.slug} value={g.slug}>
                    {g.slug.toUpperCase()} · {g.league}
                  </option>
                ))}
              </select>
            </label>

            {/* Side */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>SCORING SIDE</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['home', 'away'] as const).map(side => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, side }))}
                    style={{
                      flex: 1, padding: '7px 10px', borderRadius: 7,
                      border: 'none', cursor: 'pointer',
                      background: form.side === side ? 'var(--pulse)' : 'var(--paper-2)',
                      color: form.side === side ? '#fff' : 'var(--ink)',
                      fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em',
                      fontWeight: form.side === side ? 600 : 400,
                    }}
                  >
                    {info && side === 'home'
                      ? (info.homeTeam.shortName ?? 'HOME')
                      : info && side === 'away'
                      ? (info.awayTeam.shortName ?? 'AWAY')
                      : side.toUpperCase()}
                  </button>
                ))}
              </div>
            </label>

            {/* Player + flag row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px', gap: 6 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>PLAYER NAME</span>
                <input
                  type="text"
                  value={form.playerName}
                  onChange={e => setForm(prev => ({ ...prev, playerName: e.target.value }))}
                  style={{
                    padding: '7px 10px', borderRadius: 7, border: 'none',
                    background: 'var(--paper-2)', fontSize: 11, color: 'var(--ink)',
                    fontFamily: 'var(--mono)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>FLAG</span>
                <input
                  type="text"
                  value={form.flag}
                  onChange={e => setForm(prev => ({ ...prev, flag: e.target.value }))}
                  style={{
                    padding: '7px 10px', borderRadius: 7, border: 'none',
                    background: 'var(--paper-2)', fontSize: 18, textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                  }}
                />
              </label>
            </div>

            {/* Number + Minute row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>JERSEY #</span>
                <input
                  type="number"
                  min={1} max={99}
                  value={form.number}
                  onChange={e => setForm(prev => ({ ...prev, number: parseInt(e.target.value, 10) || 9 }))}
                  style={{
                    padding: '7px 10px', borderRadius: 7, border: 'none',
                    background: 'var(--paper-2)', fontSize: 11, color: 'var(--ink)',
                    fontFamily: 'var(--mono)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>MINUTE</span>
                <input
                  type="number"
                  min={1} max={120}
                  value={form.minute}
                  onChange={e => setForm(prev => ({ ...prev, minute: parseInt(e.target.value, 10) || 45 }))}
                  style={{
                    padding: '7px 10px', borderRadius: 7, border: 'none',
                    background: 'var(--paper-2)', fontSize: 11, color: 'var(--ink)',
                    fontFamily: 'var(--mono)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                  }}
                />
              </label>
            </div>

            {/* Assist */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>ASSIST (OPTIONAL)</span>
              <input
                type="text"
                value={form.assist}
                placeholder="Assisting player"
                onChange={e => setForm(prev => ({ ...prev, assist: e.target.value }))}
                style={{
                  padding: '7px 10px', borderRadius: 7, border: 'none',
                  background: 'var(--paper-2)', fontSize: 11, color: 'var(--ink)',
                  fontFamily: 'var(--mono)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                }}
              />
            </label>

            {/* Fire button */}
            <button
              type="button"
              onClick={handleFire}
              style={{
                marginTop: 4, padding: '10px 0', borderRadius: 8,
                border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #e63c3c, #c0392b)',
                color: '#fff', fontFamily: 'var(--mono)', fontSize: 11,
                letterSpacing: '0.14em', fontWeight: 700,
                boxShadow: '0 4px 12px rgba(230,60,60,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span>⚽</span> FIRE GOAL CELEBRATION
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Match card ────────────────────────────────────────────────────────────────

function MatchCard({
  game,
  info,
  loading,
  error,
  isMobile,
  onExpand,
}: {
  game: TestGame;
  info: LiveInfo | null;
  loading: boolean;
  error: boolean;
  isMobile: boolean;
  onExpand: () => void;
}) {
  const logoSize = isMobile ? 38 : 44;

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${info ? `${info.homeTeam.name} vs ${info.awayTeam.name}` : game.slug} — click for details`}
      onClick={onExpand}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onExpand(); }}
      style={{
        borderRadius: 10, overflow: 'hidden',
        background: 'var(--paper)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.15s, transform 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
        el.style.transform = 'none';
      }}
    >
      {/* Header */}
      <div style={{
        padding: '9px 14px', background: 'var(--paper-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="mono" style={{
            fontSize: 8, padding: '2px 6px', borderRadius: 3, letterSpacing: '0.1em',
            background: 'rgba(255,60,60,0.12)', color: '#e63c3c',
          }}>
            ESPN
          </span>
          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
            {game.league}{game.round ? ` · ${game.round}` : ''}
          </span>
        </div>
        {info && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {info.state === 'in' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />}
            <span className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', color: stateColor(info.state) }}>
              {stateLabel(info.state, info.hadPenaltyShootout)}
              {info.state === 'in' && info.liveClock ? ` · ${info.liveClock}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Score */}
      <div style={{ padding: isMobile ? '14px 12px' : '18px 14px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 48 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading…</span>
          </div>
        )}
        {error && !loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 48 }}>
            <span className="mono" style={{ fontSize: 10, color: '#e63c3c' }}>Failed to load</span>
          </div>
        )}
        {info && !loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <img src={info.homeTeam.logo} alt={info.homeTeam.name} width={logoSize} height={logoSize}
                style={{ width: logoSize, height: logoSize, objectFit: 'contain', flexShrink: 0 }}
                onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
              <span className="serif" style={{ fontSize: isMobile ? 13 : 15, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {info.homeTeam.shortName ?? info.homeTeam.name}
              </span>
            </div>

            <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 52 }}>
              {info.state !== 'pre' ? (
                <>
                  <div className="serif tnum" style={{ fontSize: isMobile ? 24 : 30, lineHeight: 1, letterSpacing: '0.04em' }}>
                    {info.homeTeam.score}
                    <span style={{ margin: '0 4px', color: 'var(--ink-3)', fontSize: isMobile ? 17 : 20 }}>–</span>
                    {info.awayTeam.score}
                  </div>
                  {info.hadPenaltyShootout && info.penScore && (
                    <div className="serif tnum" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                      {info.penScore.home} – {info.penScore.away}
                      <div className="mono" style={{ fontSize: 7, letterSpacing: '0.12em' }}>ON PENS</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="mono" style={{ fontSize: 14, color: 'var(--ink-3)' }}>VS</div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexDirection: 'row-reverse', minWidth: 0 }}>
              <img src={info.awayTeam.logo} alt={info.awayTeam.name} width={logoSize} height={logoSize}
                style={{ width: logoSize, height: logoSize, objectFit: 'contain', flexShrink: 0 }}
                onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
              <span className="serif" style={{ fontSize: isMobile ? 13 : 15, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                {info.awayTeam.shortName ?? info.awayTeam.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--paper-2)',
      }}>
        <span className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
          ID {game.matchId}
        </span>
        <span className="mono" style={{ fontSize: 9, color: 'var(--pulse)', letterSpacing: '0.1em' }}>
          DETAILS →
        </span>
      </div>
    </article>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const isMobile = useIsMobile();
  const router = useRouter();

  const [liveInfos, setLiveInfos] = useState<Record<string, LiveInfo | null>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    () => Object.fromEntries(TEST_GAMES.map(g => [g.slug, true]))
  );
  const [errorStates, setErrorStates] = useState<Record<string, boolean>>({});
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const handleMapLoad = useCallback(() => setIsMapLoaded(true), []);

  // Modal
  const [detailGame, setDetailGame] = useState<TestGame | null>(null);

  // Goal celebration
  const [goalTrigger, setGoalTrigger] = useState(0);
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [goalFiredFor, setGoalFiredFor] = useState<string | null>(null);
  const goalFiredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFireGoal = useCallback((data: GoalData, slug: string) => {
    setGoalData(data);
    setGoalTrigger(n => n + 1);
    setGoalFiredFor(slug);
    if (goalFiredTimerRef.current) clearTimeout(goalFiredTimerRef.current);
    goalFiredTimerRef.current = setTimeout(() => setGoalFiredFor(null), 6000);
  }, []);

  useEffect(() => () => {
    if (goalFiredTimerRef.current) clearTimeout(goalFiredTimerRef.current);
  }, []);

  // Derived stats
  const stats = useMemo(() => {
    const infos = Object.values(liveInfos).filter(Boolean) as LiveInfo[];
    return {
      total: TEST_GAMES.length,
      live: infos.filter(i => i.state === 'in').length,
      finished: infos.filter(i => i.state === 'post').length,
      upcoming: infos.filter(i => i.state === 'pre').length,
    };
  }, [liveInfos]);

  // Polling
  useEffect(() => {
    const controllers: Record<string, AbortController> = {};
    const intervals: Record<string, ReturnType<typeof setInterval>> = {};

    for (const game of TEST_GAMES) {
      const load = async () => {
        const ctrl = new AbortController();
        controllers[game.slug] = ctrl;
        try {
          const info = await fetchMatchInfo(game.apiPath, ctrl.signal);
          setLiveInfos(prev => ({ ...prev, [game.slug]: info }));
          setErrorStates(prev => ({ ...prev, [game.slug]: false }));
          setLastRefresh(new Date());
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') return;
          setErrorStates(prev => ({ ...prev, [game.slug]: true }));
        } finally {
          setLoadingStates(prev => ({ ...prev, [game.slug]: false }));
        }
      };
      load();
      intervals[game.slug] = setInterval(load, 20_000);
    }

    return () => {
      Object.values(controllers).forEach(c => c.abort());
      Object.values(intervals).forEach(id => clearInterval(id));
    };
  }, []);

  const pad = isMobile ? '20px 16px' : '32px 40px';

  return (
    <div className="screen" style={{ minHeight: '100vh', background: 'var(--paper-2)' }}>

      {/* Goal celebration — full screen overlay */}
      {goalData && (
        <GoalNotification
          trigger={goalTrigger}
          data={goalData}
        />
      )}

      {/* Match detail modal */}
      {detailGame && (
        <MatchDetailModal
          game={detailGame}
          info={liveInfos[detailGame.slug] ?? null}
          onClose={() => setDetailGame(null)}
        />
      )}

      {/* Top bar */}
      <div style={{
        padding: isMobile ? '14px 16px' : '18px 40px',
        background: 'var(--paper)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="serif" style={{ fontSize: isMobile ? 20 : 26, lineHeight: 1, margin: 0 }}>
            Admin Dashboard
          </h1>
          <span className="mono" style={{
            fontSize: 8, padding: '3px 8px', borderRadius: 3,
            background: 'rgba(255,200,0,0.15)', color: '#b8860b',
            letterSpacing: '0.14em',
          }}>
            DEV ONLY
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastRefresh && (
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Link href="/" style={{
            padding: '0 14px', height: 34, display: 'inline-flex', alignItems: 'center',
            borderRadius: 8, background: 'var(--paper-2)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            fontSize: 10, fontFamily: 'var(--mono)', textDecoration: 'none',
            color: 'var(--ink)', letterSpacing: '0.08em',
          }}>
            ← Home
          </Link>
        </div>
      </div>

      <div style={{ padding: pad }}>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: isMobile ? 24 : 28, flexWrap: 'wrap' }}>
          <StatCard label="TOTAL" value={stats.total} />
          <StatCard label="LIVE" value={stats.live} accent="var(--live)" />
          <StatCard label="FINISHED" value={stats.finished} accent="var(--ink-3)" />
          <StatCard label="UPCOMING" value={stats.upcoming} accent="#6366f1" />
        </div>

        {/* Two-column layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 300px',
          gap: isMobile ? 20 : 24,
          alignItems: 'start',
        }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 24 }}>

            {/* Map */}
            <section>
              <div className="mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--ink-3)', marginBottom: 10 }}>
                MATCH LOCATIONS
              </div>
              <div style={{ position: 'relative', height: isMobile ? 260 : 380, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
                {!isMapLoaded && (
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--paper-2)',
                  }}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em' }}>Loading map…</span>
                  </div>
                )}
                <Map
                  center={DEFAULT_MAP_VIEW.center}
                  zoom={isMobile ? DEFAULT_MAP_VIEW.zoom - 0.3 : DEFAULT_MAP_VIEW.zoom}
                  minZoom={DEFAULT_MAP_VIEW.minZoom}
                  maxZoom={DEFAULT_MAP_VIEW.maxZoom}
                  theme="light"
                >
                  <MapLoadedObserver onLoad={handleMapLoad} />
                  <DashboardMarkers
                    games={TEST_GAMES}
                    liveInfos={liveInfos}
                    goalFiredFor={goalFiredFor}
                    onSelect={href => router.push(href)}
                  />
                  <MapControls position="bottom-right" showZoom />
                </Map>
                <div style={{ position: 'absolute', bottom: 12, left: 14, zIndex: 10, pointerEvents: 'none' }}>
                  <span className="mono" style={{
                    fontSize: 8, letterSpacing: '0.16em', color: 'var(--ink-3)',
                    background: 'rgba(255,255,255,0.88)', borderRadius: 4, padding: '3px 7px',
                    backdropFilter: 'blur(4px)',
                  }}>
                    PITCHPULSE · TEST MATCHES
                  </span>
                </div>
              </div>
            </section>

            {/* Match cards */}
            <section>
              <div className="mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--ink-3)', marginBottom: 10 }}>
                MONITORED MATCHES ({TEST_GAMES.length})
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 10,
              }}>
                {TEST_GAMES.map(game => (
                  <MatchCard
                    key={game.slug}
                    game={game}
                    info={liveInfos[game.slug] ?? null}
                    loading={loadingStates[game.slug] ?? false}
                    error={errorStates[game.slug] ?? false}
                    isMobile={isMobile}
                    onExpand={() => setDetailGame(game)}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Goal scorer test panel */}
            <GoalTestPanel liveInfos={liveInfos} onFireGoal={handleFireGoal} />

            {/* API health */}
            <div style={{ padding: '16px 18px', borderRadius: 10, background: 'var(--paper)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-3)', marginBottom: 10 }}>
                API HEALTH · 20s POLL
              </div>
              {TEST_GAMES.map(game => (
                <ApiRow key={game.slug} game={game} info={liveInfos[game.slug] ?? null} error={errorStates[game.slug] ?? false} />
              ))}
            </div>

            {/* Quick links */}
            <div style={{ padding: '16px 18px', borderRadius: 10, background: 'var(--paper)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-3)', marginBottom: 10 }}>
                QUICK LINKS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {TEST_GAMES.map(game => (
                  <Link
                    key={game.slug}
                    href={game.href}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 7,
                      background: 'var(--paper-2)',
                      textDecoration: 'none', color: 'var(--ink)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 3px 10px rgba(0,0,0,0.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
                  >
                    <div>
                      <div className="mono" style={{ fontSize: 9, color: 'var(--ink)', letterSpacing: '0.08em' }}>
                        {game.slug.toUpperCase()}
                      </div>
                      <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.06em', marginTop: 1 }}>
                        {game.league}
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--pulse)' }}>→</span>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
