'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Map, MapMarker, MarkerContent, MarkerPopup, MapControls, useMap } from '@/components/ui/map';
import { DEFAULT_MAP_VIEW } from '@/data/venues';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TestGame {
  slug: string;
  href: string;
  source: 'espn' | 'fotmob';
  matchId: string;
  apiPath: string;
  league: string;
  round?: string;
}

interface LiveInfo {
  state: 'pre' | 'in' | 'post';
  homeTeam: { name: string; shortName?: string; logo: string; score: string };
  awayTeam: { name: string; shortName?: string; logo: string; score: string };
  statusDetail: string;
  liveClock?: string;
  displayClock?: string;
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
  },
  {
    slug: 'mls-hou-stl',
    href: '/test-mls/hou-stl',
    source: 'espn',
    matchId: '401871127',
    apiPath: '/api/test-mls/401871127?league=usa.open&fotmob=9441',
    league: 'US Open Cup',
    round: 'QF',
  },
  {
    slug: 'mls-clb-nyc',
    href: '/test-mls/clb-nyc',
    source: 'espn',
    matchId: '401871130',
    apiPath: '/api/test-mls/401871130?league=usa.open&fotmob=9441',
    league: 'US Open Cup',
    round: 'QF',
  },
  {
    slug: 'mls-col-sj',
    href: '/test-mls/col-sj',
    source: 'espn',
    matchId: '401871129',
    apiPath: '/api/test-mls/401871129?league=usa.open&fotmob=9441',
    league: 'US Open Cup',
    round: 'QF',
  },
];

const VENUES: Record<string, { name: string; city: string; longitude: number; latitude: number }> = {
  'uel-fri-vil': { name: 'Vodafone Park', city: 'Istanbul, Turkey', longitude: 29.0097, latitude: 41.0340 },
  'mls-hou-stl': { name: 'Shell Energy Stadium', city: 'Houston, TX', longitude: -95.3510, latitude: 29.7522 },
  'mls-clb-nyc': { name: 'ScottsMiracle-Gro Field', city: 'Columbus, OH', longitude: -82.9917, latitude: 39.9689 },
  'mls-col-sj':  { name: "Dick's Sporting Goods Park", city: 'Commerce City, CO', longitude: -104.8919, latitude: 39.8052 },
};

const DATA_SOURCES = [
  { label: 'ESPN', color: '#e63c3c', bg: 'rgba(255,60,60,0.1)', desc: 'Match stats, events, timeline, news, standings' },
  { label: 'FOTMOB', color: '#0078ff', bg: 'rgba(0,120,255,0.1)', desc: 'Live score, clock, standings' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function stateLabel(state: LiveInfo['state'], hadPK?: boolean) {
  if (state === 'in') return 'LIVE';
  if (state === 'post') return hadPK ? 'FT (P)' : 'FT';
  return 'PRE';
}

function stateColor(state: LiveInfo['state']) {
  if (state === 'in') return 'var(--live)';
  return 'var(--ink-3)';
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

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 100,
      padding: '16px 20px',
      border: '1px solid var(--rule)',
      borderRadius: 10,
      background: 'var(--paper)',
      borderTop: `3px solid ${accent ?? 'var(--rule)'}`,
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

function ApiRow({ game, info, error }: { game: TestGame; info: LiveInfo | null; error: boolean }) {
  const status = error ? 'ERROR' : info ? 'OK' : 'LOADING';
  const statusColor = error ? '#e63c3c' : info ? '#22c55e' : 'var(--ink-3)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 0',
      borderBottom: '1px solid var(--rule-soft)',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
      <span className="mono" style={{ fontSize: 10, color: 'var(--ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {game.apiPath}
      </span>
      <span className="mono" style={{ fontSize: 9, letterSpacing: '0.1em', color: statusColor, flexShrink: 0 }}>
        {status}
      </span>
    </div>
  );
}

function MapLoadedObserver({ onLoad }: { onLoad: () => void }) {
  const { isLoaded } = useMap();
  useEffect(() => { if (isLoaded) onLoad(); }, [isLoaded, onLoad]);
  return null;
}

function DashboardMarkers({
  games,
  liveInfos,
  onSelect,
}: {
  games: TestGame[];
  liveInfos: Record<string, LiveInfo | null>;
  onSelect: (href: string) => void;
}) {
  return (
    <>
      {games.map(game => {
        const venue = VENUES[game.slug];
        if (!venue) return null;
        const info = liveInfos[game.slug];
        const isLive = info?.state === 'in';
        const color = '#e63c3c';

        return (
          <MapMarker key={game.slug} longitude={venue.longitude} latitude={venue.latitude}>
            <MarkerContent>
              <div style={{ position: 'relative', width: 20, height: 20 }}>
                {isLive && (
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    backgroundColor: color,
                    animation: 'pulse-ring 1.8s ease-out infinite',
                  }} />
                )}
                <div style={{
                  position: 'absolute', top: -5, left: -5, right: -5, bottom: -5,
                  borderRadius: '50%', filter: 'blur(7px)', opacity: 0.65,
                  backgroundColor: color, pointerEvents: 'none',
                }} />
                <button
                  type="button"
                  aria-label={`${venue.name} — view match`}
                  style={{
                    display: 'block', width: 20, height: 20, borderRadius: '50%',
                    border: '3px solid white', backgroundColor: color,
                    cursor: 'pointer', padding: 0,
                    boxShadow: `0 2px 8px ${color}99, 0 0 0 1px rgba(0,0,0,0.1)`,
                    transition: 'transform 180ms',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.35)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                />
              </div>
            </MarkerContent>
            <MarkerPopup>
              <div style={{ minWidth: 200, borderRadius: 12, overflow: 'hidden', background: 'var(--paper)' }}>
                <div style={{ height: 4, background: color }} />
                <div style={{ padding: 12, background: 'var(--paper-2)' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{venue.name}</p>
                  <p style={{ margin: '2px 0 8px', fontSize: 11, color: 'var(--ink-3)' }}>{venue.city} · {game.league}</p>
                  {info ? (
                    [info.homeTeam, info.awayTeam].map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                        <img src={t.logo} alt="" width={14} height={14} style={{ width: 14, height: 14, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                        <span style={{ flex: 1, fontSize: 11, color: 'var(--ink)' }}>{t.shortName ?? t.name}</span>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{info.state !== 'pre' ? t.score : '–'}</span>
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
                      border: '1px solid var(--rule)', background: 'var(--paper)',
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

function MatchCard({
  game,
  info,
  loading,
  error,
  isMobile,
}: {
  game: TestGame;
  info: LiveInfo | null;
  loading: boolean;
  error: boolean;
  isMobile: boolean;
}) {
  const logoSize = isMobile ? 38 : 48;

  return (
    <Link
      href={game.href}
      aria-label={`${info ? `${info.homeTeam.name} vs ${info.awayTeam.name}` : game.slug} — open match`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <article
        style={{
          border: '1px solid var(--rule)', borderRadius: 10, overflow: 'hidden',
          background: 'var(--paper)', transition: 'border-color 0.15s, box-shadow 0.15s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = 'var(--pulse)';
          el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = 'var(--rule)';
          el.style.boxShadow = 'none';
        }}
      >
        {/* Header */}
        <div style={{
          padding: '9px 16px', background: 'var(--paper-2)',
          borderBottom: '1px solid var(--rule)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className="mono" style={{
              fontSize: 8, padding: '2px 6px', borderRadius: 3, letterSpacing: '0.1em',
              background: 'rgba(255,60,60,0.12)', color: '#e63c3c',
            }}>
              {game.source.toUpperCase()}
            </span>
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
              {game.league}{game.round ? ` · ${game.round}` : ''}
            </span>
          </div>
          {info && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {info.state === 'in' && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
              )}
              <span className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', color: stateColor(info.state) }}>
                {stateLabel(info.state, info.hadPenaltyShootout)}
                {info.state === 'in' && info.liveClock ? ` · ${info.liveClock}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Score */}
        <div style={{ padding: isMobile ? '16px 14px' : '20px 16px' }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 52 }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading…</span>
            </div>
          )}
          {error && !loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 52 }}>
              <span className="mono" style={{ fontSize: 10, color: '#e63c3c' }}>Failed to load</span>
            </div>
          )}
          {info && !loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: 10 }}>
              {/* Home */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <img src={info.homeTeam.logo} alt={info.homeTeam.name} width={logoSize} height={logoSize}
                  style={{ width: logoSize, height: logoSize, objectFit: 'contain', flexShrink: 0 }}
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                <span className="serif" style={{ fontSize: isMobile ? 14 : 16, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isMobile ? (info.homeTeam.shortName ?? info.homeTeam.name) : info.homeTeam.name}
                </span>
              </div>

              {/* Scoreline */}
              <div style={{ textAlign: 'center', flexShrink: 0, minWidth: isMobile ? 52 : 64 }}>
                {info.state !== 'pre' ? (
                  <>
                    <div className="serif tnum" style={{ fontSize: isMobile ? 26 : 32, lineHeight: 1, letterSpacing: '0.04em' }}>
                      {info.homeTeam.score}
                      <span style={{ margin: '0 5px', color: 'var(--ink-3)', fontSize: isMobile ? 18 : 22 }}>–</span>
                      {info.awayTeam.score}
                    </div>
                    {info.hadPenaltyShootout && info.penScore && (
                      <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <div className="serif tnum" style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                          {info.penScore.home}<span style={{ margin: '0 3px', fontSize: 10 }}>–</span>{info.penScore.away}
                        </div>
                        <div className="mono" style={{ fontSize: 7, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>ON PENS</div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mono" style={{ fontSize: isMobile ? 13 : 16, color: 'var(--ink-3)' }}>VS</div>
                )}
              </div>

              {/* Away */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row-reverse', minWidth: 0 }}>
                <img src={info.awayTeam.logo} alt={info.awayTeam.name} width={logoSize} height={logoSize}
                  style={{ width: logoSize, height: logoSize, objectFit: 'contain', flexShrink: 0 }}
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                <span className="serif" style={{ fontSize: isMobile ? 14 : 16, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {isMobile ? (info.awayTeam.shortName ?? info.awayTeam.name) : info.awayTeam.name}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 16px', borderTop: '1px solid var(--rule-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
            ID {game.matchId}
          </span>
          <span className="mono" style={{ fontSize: 9, color: 'var(--pulse)', letterSpacing: '0.1em' }}>
            VIEW DETAILS →
          </span>
        </div>
      </article>
    </Link>
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

      {/* Top bar */}
      <div style={{
        padding: isMobile ? '16px' : '20px 40px',
        background: 'var(--paper)',
        borderBottom: '1px solid var(--rule)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="serif" style={{ fontSize: isMobile ? 22 : 28, lineHeight: 1, margin: 0 }}>
            Admin Dashboard
          </h1>
          <span className="mono" style={{
            fontSize: 8, padding: '3px 8px', borderRadius: 3,
            background: 'rgba(255,200,0,0.15)', color: '#b8860b',
            letterSpacing: '0.14em', border: '1px solid rgba(200,160,0,0.3)',
          }}>
            DEV ONLY
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastRefresh && (
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
              REFRESHED {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Link href="/" className="btn" style={{ fontSize: 10, padding: '0 14px', minHeight: 34, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            ← Home
          </Link>
        </div>
      </div>

      <div style={{ padding: pad }}>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: isMobile ? 24 : 32, flexWrap: 'wrap' }}>
          <StatCard label="TOTAL MATCHES" value={stats.total} />
          <StatCard label="LIVE NOW" value={stats.live} accent="var(--live)" />
          <StatCard label="FINISHED" value={stats.finished} accent="var(--ink-3)" />
          <StatCard label="UPCOMING" value={stats.upcoming} accent="#6366f1" />
        </div>

        {/* Two-column layout on desktop */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
          gap: isMobile ? 24 : 28,
          alignItems: 'start',
        }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 24 }}>

            {/* Map */}
            <section>
              <div className="mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--ink-3)', marginBottom: 12 }}>
                MATCH LOCATIONS
              </div>
              <div style={{ position: 'relative', height: isMobile ? 280 : 400, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--rule)' }}>
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
                  <DashboardMarkers games={TEST_GAMES} liveInfos={liveInfos} onSelect={href => router.push(href)} />
                  <MapControls position="bottom-right" showZoom />
                </Map>
                <div style={{ position: 'absolute', bottom: 12, left: 14, zIndex: 10, pointerEvents: 'none' }}>
                  <span className="mono" style={{
                    fontSize: 8, letterSpacing: '0.18em', color: 'var(--ink-3)',
                    background: 'rgba(255,255,255,0.85)', borderRadius: 4, padding: '3px 7px',
                    backdropFilter: 'blur(4px)',
                  }}>
                    PITCHPULSE · TEST MATCHES
                  </span>
                </div>
              </div>
            </section>

            {/* Match cards */}
            <section>
              <div className="mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--ink-3)', marginBottom: 12 }}>
                MONITORED MATCHES ({TEST_GAMES.length})
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 12,
              }}>
                {TEST_GAMES.map(game => (
                  <MatchCard
                    key={game.slug}
                    game={game}
                    info={liveInfos[game.slug] ?? null}
                    loading={loadingStates[game.slug] ?? false}
                    error={errorStates[game.slug] ?? false}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* API health */}
            <div style={{ padding: '18px 20px', border: '1px solid var(--rule)', borderRadius: 10, background: 'var(--paper)' }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-3)', marginBottom: 12 }}>
                API HEALTH
              </div>
              <div style={{ marginBottom: 4 }}>
                {TEST_GAMES.map(game => (
                  <ApiRow
                    key={game.slug}
                    game={game}
                    info={liveInfos[game.slug] ?? null}
                    error={errorStates[game.slug] ?? false}
                  />
                ))}
              </div>
              <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', marginTop: 10, letterSpacing: '0.1em' }}>
                POLLING EVERY 20s
              </div>
            </div>

            {/* Data sources */}
            <div style={{ padding: '18px 20px', border: '1px solid var(--rule)', borderRadius: 10, background: 'var(--paper)' }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-3)', marginBottom: 12 }}>
                DATA SOURCES
              </div>
              {DATA_SOURCES.map(s => (
                <div key={s.label} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <span className="mono" style={{
                    fontSize: 8, padding: '2px 6px', borderRadius: 3,
                    background: s.bg, color: s.color,
                    letterSpacing: '0.1em', flexShrink: 0, height: 'fit-content', marginTop: 1,
                  }}>
                    {s.label}
                  </span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                    {s.desc}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div style={{ padding: '18px 20px', border: '1px solid var(--rule)', borderRadius: 10, background: 'var(--paper)' }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-3)', marginBottom: 12 }}>
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
                      border: '1px solid var(--rule-soft)', background: 'var(--paper-2)',
                      textDecoration: 'none', color: 'var(--ink)',
                      fontSize: 11, transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--pulse)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--rule-soft)'; }}
                  >
                    <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                      {game.slug.toUpperCase()}
                    </span>
                    <span className="mono" style={{ fontSize: 8, color: 'var(--pulse)', letterSpacing: '0.1em' }}>→</span>
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
