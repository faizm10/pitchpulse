'use client';

import React, { useCallback, useEffect, useState } from 'react';
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

// ── Test game registry ────────────────────────────────────────────────────────

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

// ── EPL venue coordinates ─────────────────────────────────────────────────────

const EPL_VENUES: Record<string, { name: string; city: string; longitude: number; latitude: number }> = {
  'uel-fri-vil': {
    name: 'Vodafone Park',
    city: 'Istanbul, Turkey',
    longitude: 29.0097,
    latitude: 41.0340,
  },
  'mls-hou-stl': {
    name: 'Shell Energy Stadium',
    city: 'Houston, TX',
    longitude: -95.3510,
    latitude: 29.7522,
  },
  'mls-clb-nyc': {
    name: 'ScottsMiracle-Gro Field',
    city: 'Columbus, OH',
    longitude: -82.9917,
    latitude: 39.9689,
  },
  'mls-col-sj': {
    name: "Dick's Sporting Goods Park",
    city: 'Commerce City, CO',
    longitude: -104.8919,
    latitude: 39.8052,
  },
};

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

function stateLabel(state: LiveInfo['state'], hadPenaltyShootout?: boolean): string {
  if (state === 'in') return 'LIVE';
  if (state === 'post') return hadPenaltyShootout ? 'FT (P)' : 'FT';
  return 'PRE';
}

function stateColor(state: LiveInfo['state']): string {
  if (state === 'in') return 'var(--live)';
  if (state === 'post') return 'var(--ink-3)';
  return 'var(--ink-3)';
}

const CARD_FETCH_RETRIES = 3;
const CARD_RETRY_DELAY_MS = 500;

function matchFromPayload(m: Record<string, unknown>): LiveInfo {
  const home = m.homeTeam as LiveInfo['homeTeam'];
  const away = m.awayTeam as LiveInfo['awayTeam'];
  return {
    state: m.state as LiveInfo['state'],
    homeTeam: home,
    awayTeam: away,
    statusDetail: (m.statusDetail as string) ?? '',
    liveClock: (m.liveClock as string) ?? (m.displayClock as string) ?? '',
    league: (m.league as string) ?? '',
    round: m.round as string | undefined,
    hadPenaltyShootout: (m.hadPenaltyShootout as boolean) ?? false,
    penScore: (m.penScore as { home: number; away: number } | null) ?? null,
  };
}

async function fetchMatchCard(
  apiPath: string,
  signal: AbortSignal,
): Promise<LiveInfo> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < CARD_FETCH_RETRIES; attempt++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const res = await fetch(apiPath, { signal, cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.match) {
        throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${res.status}`);
      }
      return matchFromPayload(data.match);
    } catch (err) {
      if (signal.aborted) throw err;
      lastErr = err;
      if (attempt < CARD_FETCH_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, CARD_RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

// ── Map ───────────────────────────────────────────────────────────────────────

function MapLoadedObserver({ onLoad }: { onLoad: () => void }) {
  const { isLoaded } = useMap();
  useEffect(() => { if (isLoaded) onLoad(); }, [isLoaded, onLoad]);
  return null;
}

// Separate component so it lives inside Map's context tree — same pattern as StadiumMarkers
function EPLMarkers({
  games,
  liveInfos,
  onSelectGame,
}: {
  games: TestGame[];
  liveInfos: Record<string, LiveInfo | null>;
  onSelectGame: (href: string) => void;
}) {
  return (
    <>
      {games.map((game) => {
        const venue = EPL_VENUES[game.slug];
        if (!venue) return null;
        const info = liveInfos[game.slug];
        const isLive = info?.state === 'in';
        const color = game.source === 'fotmob' ? '#0078ff' : '#e63c3c';

        return (
          <MapMarker key={game.slug} longitude={venue.longitude} latitude={venue.latitude}>
            <MarkerContent>
              {/* Explicit 20×20 wrapper so MapLibre can measure the element */}
              <div style={{ position: 'relative', width: 20, height: 20 }}>
                {isLive && (
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    backgroundColor: color,
                    animation: 'pulse-ring 1.8s ease-out infinite',
                  }} />
                )}
                {/* glow */}
                <div style={{
                  position: 'absolute', top: -5, left: -5, right: -5, bottom: -5,
                  borderRadius: '50%',
                  filter: 'blur(7px)', opacity: 0.75,
                  backgroundColor: color,
                  pointerEvents: 'none',
                }} />
                {/* dot */}
                <button
                  type="button"
                  aria-label={`${venue.name} — view match`}
                  style={{
                    display: 'block',
                    width: 20, height: 20,
                    borderRadius: '50%',
                    border: '3px solid white',
                    backgroundColor: color,
                    cursor: 'pointer',
                    padding: 0,
                    boxShadow: `0 2px 8px ${color}99, 0 0 0 1px rgba(0,0,0,0.1)`,
                    transition: 'transform 180ms',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.35)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                />
              </div>
            </MarkerContent>

            <MarkerPopup>
              <div style={{ minWidth: 210, borderRadius: 12, overflow: 'hidden', background: 'var(--paper)' }}>
                <div style={{ height: 4, background: color }} />
                <div style={{ padding: 12, background: 'var(--paper-2)' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--ink)', lineHeight: 1.3 }}>
                    {venue.name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>
                    {venue.city} · {game.league}
                  </p>

                  <div style={{ borderTop: '1px solid var(--rule-soft)', paddingTop: 8, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.1em', color: info ? stateColor(info.state) : 'var(--ink-3)' }}>
                        {info
                          ? isLive
                            ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
                                LIVE{info.liveClock ? ` · ${info.liveClock}` : ''}
                              </span>
                            : stateLabel(info.state, info.hadPenaltyShootout)
                          : '…'}
                      </span>
                      <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
                        {game.round ?? ''}
                      </span>
                    </div>

                    {info && [info.homeTeam, info.awayTeam].map((team, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <img src={team.logo} alt="" aria-hidden="true" width={16} height={16}
                          style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                        <span style={{ flex: 1, fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>
                          {team.shortName ?? team.name}
                        </span>
                        <span style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink)' }}>
                          {info.state !== 'pre' ? team.score : '–'}
                        </span>
                      </div>
                    ))}

                    {!info && (
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)', textAlign: 'center', padding: '8px 0' }}>
                        Loading…
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectGame(game.href)}
                    style={{
                      marginTop: 10, width: '100%',
                      borderRadius: 8, border: '1px solid var(--rule)',
                      background: 'var(--paper)', padding: '8px 12px',
                      fontSize: 11, fontWeight: 500, color: 'var(--ink)',
                      cursor: 'pointer', fontFamily: 'var(--mono)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    VIEW MATCH DETAILS →
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

function TestsMap({
  games,
  liveInfos,
  isMobile,
  onSelectGame,
}: {
  games: TestGame[];
  liveInfos: Record<string, LiveInfo | null>;
  isMobile: boolean;
  onSelectGame: (href: string) => void;
}) {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const handleLoad = useCallback(() => setIsMapLoaded(true), []);

  return (
    <div style={{ position: 'relative', height: isMobile ? 300 : 440, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--rule)' }}>
      {!isMapLoaded && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--paper-2)',
        }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.14em' }}>Loading map…</span>
        </div>
      )}

      <Map
        center={DEFAULT_MAP_VIEW.center}
        zoom={isMobile ? DEFAULT_MAP_VIEW.zoom - 0.2 : DEFAULT_MAP_VIEW.zoom}
        minZoom={DEFAULT_MAP_VIEW.minZoom}
        maxZoom={DEFAULT_MAP_VIEW.maxZoom}
        theme="light"
      >
        <MapLoadedObserver onLoad={handleLoad} />
        <EPLMarkers games={games} liveInfos={liveInfos} onSelectGame={onSelectGame} />
        <MapControls position="bottom-right" showZoom />
      </Map>

      <div style={{
        position: 'absolute', bottom: 12, left: 14, zIndex: 10,
        pointerEvents: 'none',
      }}>
        <span className="mono" style={{
          fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-3)',
          background: 'rgba(255,255,255,0.85)', borderRadius: 4, padding: '3px 7px',
          backdropFilter: 'blur(4px)',
        }}>
          USA · TEST MATCHES
        </span>
      </div>
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
}: {
  game: TestGame;
  info: LiveInfo | null;
  loading: boolean;
  error: boolean;
  isMobile: boolean;
}) {
  const logoSize = isMobile ? 40 : 52;

  return (
    <Link
      href={game.href}
      aria-label={`${info ? `${info.homeTeam.name} vs ${info.awayTeam.name}` : game.slug} — open match page`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <article
        style={{
          border: '1px solid var(--rule)',
          borderRadius: 10,
          overflow: 'hidden',
          background: 'var(--paper)',
          transition: 'border-color 0.15s',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--pulse)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--rule)')}
      >
        {/* Card header */}
        <div style={{
          padding: isMobile ? '8px 14px' : '10px 18px',
          background: 'var(--paper-2)',
          borderBottom: '1px solid var(--rule)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="mono"
              style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 3, letterSpacing: '0.1em',
                background: game.source === 'fotmob' ? 'rgba(0,120,255,0.12)' : 'rgba(255,60,60,0.12)',
                color: game.source === 'fotmob' ? '#0078ff' : '#e63c3c',
              }}
            >
              {game.source.toUpperCase()}
            </span>
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
              {game.league} {game.round ? `· ${game.round}` : ''}
            </span>
          </div>
          {info && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {info.state === 'in' && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} aria-hidden="true" />
              )}
              <span className="mono" style={{ fontSize: 9, letterSpacing: '0.14em', color: stateColor(info.state) }}>
                {stateLabel(info.state, info.hadPenaltyShootout)}
                {info.state === 'in' && (info.liveClock || info.statusDetail) ? ` · ${info.liveClock || info.statusDetail}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Score area */}
        <div style={{ padding: isMobile ? '18px 14px' : '24px 18px' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>Loading…</div>
            </div>
          )}
          {error && !loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>Failed to load</div>
            </div>
          )}
          {info && !loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
              {/* Home */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, minWidth: 0 }}>
                <img
                  src={info.homeTeam.logo}
                  alt={info.homeTeam.name}
                  width={logoSize}
                  height={logoSize}
                  style={{ width: logoSize, height: logoSize, objectFit: 'contain', flexShrink: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
                />
                <div className="serif" style={{ fontSize: isMobile ? 15 : 18, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isMobile ? (info.homeTeam.shortName ?? info.homeTeam.name) : info.homeTeam.name}
                </div>
              </div>

              {/* Scores / VS */}
              <div style={{ textAlign: 'center', minWidth: isMobile ? 56 : 72, flexShrink: 0 }}>
                {info.state !== 'pre' ? (
                  <>
                    <div className="serif tnum" style={{ fontSize: isMobile ? 28 : 36, lineHeight: 1, letterSpacing: '0.04em' }}>
                      {info.homeTeam.score}
                      <span style={{ margin: '0 6px', color: 'var(--ink-3)', fontSize: isMobile ? 20 : 26 }}>–</span>
                      {info.awayTeam.score}
                    </div>
                    {info.hadPenaltyShootout && info.penScore && (
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <div className="serif tnum" style={{ fontSize: isMobile ? 14 : 17, lineHeight: 1, color: 'var(--ink-3)' }}>
                          {info.penScore.home}
                          <span style={{ margin: '0 4px', fontSize: isMobile ? 10 : 12 }}>–</span>
                          {info.penScore.away}
                        </div>
                        <div className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>
                          ON PENS
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mono" style={{ fontSize: isMobile ? 14 : 18, color: 'var(--ink-3)' }}>VS</div>
                )}
              </div>

              {/* Away */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, flexDirection: 'row-reverse', minWidth: 0 }}>
                <img
                  src={info.awayTeam.logo}
                  alt={info.awayTeam.name}
                  width={logoSize}
                  height={logoSize}
                  style={{ width: logoSize, height: logoSize, objectFit: 'contain', flexShrink: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
                />
                <div className="serif" style={{ fontSize: isMobile ? 15 : 18, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {isMobile ? (info.awayTeam.shortName ?? info.awayTeam.name) : info.awayTeam.name}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: isMobile ? '8px 14px' : '10px 18px',
          borderTop: '1px solid var(--rule-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
            ID {game.matchId}
          </span>
          <span className="mono" style={{ fontSize: 9, color: 'var(--pulse)', letterSpacing: '0.12em' }}>
            VIEW DETAILS →
          </span>
        </div>
      </article>
    </Link>
  );
}

// ── Source badge legend ───────────────────────────────────────────────────────

function Legend() {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {[
        { label: 'ESPN', color: '#e63c3c', bg: 'rgba(255,60,60,0.1)', desc: 'Full match stats, events, news, standings' },
        { label: 'FOTMOB', color: '#0078ff', bg: 'rgba(0,120,255,0.1)', desc: 'Live score, clock, standings (events blocked by Turnstile)' },
      ].map(s => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span className="mono" style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, background: s.bg, color: s.color, letterSpacing: '0.1em', flexShrink: 0, marginTop: 1 }}>
            {s.label}
          </span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', lineHeight: 1.5 }}>{s.desc}</span>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TestsIndexPage() {
  const isMobile = useIsMobile();
  const router = useRouter();

  // Shared live info state — fetched once for map + polled per card
  const [liveInfos, setLiveInfos] = useState<Record<string, LiveInfo | null>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    () => Object.fromEntries(TEST_GAMES.map(g => [g.slug, true]))
  );
  const [errorStates, setErrorStates] = useState<Record<string, boolean>>({});

  // Initial fetch + polling for each game
  useEffect(() => {
    const controllers: Record<string, AbortController> = {};
    const intervals: Record<string, ReturnType<typeof setInterval>> = {};

    for (const game of TEST_GAMES) {
      const load = async () => {
        const ctrl = new AbortController();
        controllers[game.slug] = ctrl;
        try {
          const info = await fetchMatchCard(game.apiPath, ctrl.signal);
          setLiveInfos(prev => ({ ...prev, [game.slug]: info }));
          setErrorStates(prev => ({ ...prev, [game.slug]: false }));
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

  return (
    <main
      className="screen"
      style={{ minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden', padding: isMobile ? '24px 16px' : '40px 40px' }}
    >
      {/* Page heading */}
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 className="serif" style={{ fontSize: isMobile ? 28 : 40, lineHeight: 1, margin: 0 }}>
            API Test Games
          </h1>
          <span
            className="mono"
            style={{ fontSize: 9, padding: '3px 9px', borderRadius: 4, background: 'rgba(255,200,0,0.15)', color: '#b8860b', letterSpacing: '0.12em', border: '1px solid rgba(200,160,0,0.3)' }}
          >
            DEV ONLY
          </span>
        </div>
        <p className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0, lineHeight: 1.7, maxWidth: 560 }}>
          Live data harness for testing ESPN and FotMob integrations.
          Cards poll every 20s — click any card or map pin to open the full match page.
        </p>
      </div>

      {/* Match locations map */}
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', margin: '0 0 12px' }}>
          MATCH LOCATIONS
        </h2>
        <TestsMap
          games={TEST_GAMES}
          liveInfos={liveInfos}
          isMobile={isMobile}
          onSelectGame={(href) => router.push(href)}
        />
      </div>

      {/* Source legend */}
      <div style={{ marginBottom: isMobile ? 20 : 28, padding: '16px 20px', border: '1px solid var(--rule-soft)', borderRadius: 8, background: 'var(--paper-2)' }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-3)', marginBottom: 10 }}>DATA SOURCES</div>
        <Legend />
      </div>

      {/* Game cards grid */}
      <section aria-label="Test game cards">
        <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', margin: '0 0 16px' }}>
          ACTIVE TESTS ({TEST_GAMES.length})
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: isMobile ? 12 : 16,
        }}>
          {TEST_GAMES.map((game) => (
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

      {/* Quick nav to test pages */}
      <nav aria-label="Quick links" style={{ marginTop: isMobile ? 28 : 36, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/" className="btn" style={{ fontSize: 11, minHeight: 40, padding: '0 16px', textDecoration: 'none' }}>
          ← Home
        </Link>
      </nav>

      <div style={{ height: isMobile ? 32 : 0 }} aria-hidden="true" />
    </main>
  );
}
