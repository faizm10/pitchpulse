'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Map, MapMarker, MarkerContent, MarkerPopup, MapControls, useMap } from '@/components/ui/map';

// ── Config ────────────────────────────────────────────────────────────────────

const MLS_GAMES = [
  {
    id: '401871128',
    slug: 'atl-orl',
    href: '/test-mls/atl-orl',
    label: 'ATL vs ORL',
    venue: { name: 'Mercedes-Benz Stadium', city: 'Atlanta, GA', longitude: -84.4004, latitude: 33.7553 },
  },
  {
    id: '401871127',
    slug: 'hou-stl',
    href: '/test-mls/hou-stl',
    label: 'HOU vs STL',
    venue: { name: 'Shell Energy Stadium', city: 'Houston, TX', longitude: -95.3510, latitude: 29.7522 },
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface MLSTeam {
  name: string;
  abbreviation: string;
  logo: string;
  score: string;
  color: string;
}

interface MLSPreview {
  state: 'pre' | 'in' | 'post';
  homeTeam: MLSTeam;
  awayTeam: MLSTeam;
  statusDetail: string;
  liveClock: string;
  date: string;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function stateLabel(state: MLSPreview['state']): string {
  if (state === 'in') return 'LIVE';
  if (state === 'post') return 'FT';
  return 'PRE';
}

function stateColor(state: MLSPreview['state']): string {
  return state === 'in' ? 'var(--live)' : 'var(--ink-3)';
}

// ── Map ───────────────────────────────────────────────────────────────────────

function MapLoadedObserver({ onLoad }: { onLoad: () => void }) {
  const { isLoaded } = useMap();
  useEffect(() => { if (isLoaded) onLoad(); }, [isLoaded, onLoad]);
  return null;
}

function MLSMarkers({
  previews,
  onSelect,
}: {
  previews: Record<string, MLSPreview | null>;
  onSelect: (href: string) => void;
}) {
  return (
    <>
      {MLS_GAMES.map((game) => {
        const p = previews[game.id];
        const isLive = p?.state === 'in';
        const color = '#22c55e';

        return (
          <MapMarker key={game.slug} longitude={game.venue.longitude} latitude={game.venue.latitude}>
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
                  borderRadius: '50%', filter: 'blur(7px)', opacity: 0.7,
                  backgroundColor: color, pointerEvents: 'none',
                }} />
                <button
                  type="button"
                  aria-label={`${game.venue.name} — view match`}
                  onClick={() => onSelect(game.href)}
                  style={{
                    display: 'block', width: 20, height: 20, borderRadius: '50%',
                    border: '3px solid white', backgroundColor: color,
                    cursor: 'pointer', padding: 0,
                    boxShadow: `0 2px 8px ${color}99, 0 0 0 1px rgba(0,0,0,0.1)`,
                    transition: 'transform 180ms',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.35)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                />
              </div>
            </MarkerContent>

            <MarkerPopup>
              <div style={{ minWidth: 220, borderRadius: 12, overflow: 'hidden', background: 'var(--paper)' }}>
                <div style={{ height: 4, background: color }} />
                <div style={{ padding: 12, background: 'var(--paper-2)' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--ink)', lineHeight: 1.3 }}>{game.venue.name}</p>
                  <p style={{ margin: '2px 0 8px', fontSize: 12, color: 'var(--ink-3)' }}>{game.venue.city} · MLS</p>

                  {p ? (
                    <div style={{ borderTop: '1px solid var(--rule-soft)', paddingTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                        {isLive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />}
                        <span style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.1em', color: stateColor(p.state) }}>
                          {isLive ? `LIVE${p.liveClock ? ` · ${p.liveClock}` : ''}` : stateLabel(p.state)}
                        </span>
                      </div>
                      {[p.homeTeam, p.awayTeam].map((team, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <img src={team.logo} alt="" aria-hidden="true" width={16} height={16}
                            style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                          <span style={{ flex: 1, fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>{team.abbreviation}</span>
                          <span style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 700 }}>
                            {p.state !== 'pre' ? team.score : '–'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)', textAlign: 'center', padding: '8px 0' }}>Loading…</div>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelect(game.href)}
                    style={{
                      marginTop: 10, width: '100%', borderRadius: 8, border: '1px solid var(--rule)',
                      background: 'var(--paper)', padding: '8px 12px',
                      fontSize: 11, fontWeight: 500, color: 'var(--ink)',
                      cursor: 'pointer', fontFamily: 'var(--mono)', letterSpacing: '0.08em',
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

function MLSMap({
  previews,
  isMobile,
  onSelect,
}: {
  previews: Record<string, MLSPreview | null>;
  isMobile: boolean;
  onSelect: (href: string) => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const handleLoad = useCallback(() => setIsLoaded(true), []);

  return (
    <div style={{ position: 'relative', height: isMobile ? 260 : 380, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--rule)' }}>
      {!isLoaded && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper-2)' }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.14em' }}>Loading map…</span>
        </div>
      )}
      <Map center={[-89, 32]} zoom={isMobile ? 4 : 4.8} minZoom={3} maxZoom={12} theme="light">
        <MapLoadedObserver onLoad={handleLoad} />
        <MLSMarkers previews={previews} onSelect={onSelect} />
        <MapControls position="bottom-right" showZoom />
      </Map>
      <div style={{ position: 'absolute', bottom: 12, left: 14, zIndex: 10, pointerEvents: 'none' }}>
        <span className="mono" style={{
          fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-3)',
          background: 'rgba(255,255,255,0.85)', borderRadius: 4, padding: '3px 7px',
          backdropFilter: 'blur(4px)',
        }}>
          USA · MLS
        </span>
      </div>
    </div>
  );
}

// ── Match card ────────────────────────────────────────────────────────────────

function MatchCard({
  game,
  preview,
  loading,
  isMobile,
}: {
  game: typeof MLS_GAMES[number];
  preview: MLSPreview | null;
  loading: boolean;
  isMobile: boolean;
}) {
  const logoSize = isMobile ? 40 : 52;

  const kickoffLabel = preview?.date
    ? new Date(preview.date).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
      })
    : '';

  return (
    <Link
      href={game.href}
      aria-label={`${preview ? `${preview.homeTeam.name} vs ${preview.awayTeam.name}` : game.label} — open match page`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <article
        style={{
          border: '1px solid var(--rule)', borderRadius: 10,
          overflow: 'hidden', background: 'var(--paper)',
          transition: 'border-color 0.15s', cursor: 'pointer',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--pulse)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--rule)')}
      >
        {/* Card header */}
        <div style={{
          padding: isMobile ? '8px 14px' : '10px 18px',
          background: 'var(--paper-2)', borderBottom: '1px solid var(--rule)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mono" style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, letterSpacing: '0.1em', background: 'rgba(255,60,60,0.12)', color: '#e63c3c' }}>
              ESPN + FOTMOB
            </span>
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
              MLS · {game.venue.city}
            </span>
          </div>
          {preview && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {preview.state === 'in' && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} aria-hidden="true" />
              )}
              <span className="mono" style={{ fontSize: 9, letterSpacing: '0.14em', color: stateColor(preview.state) }}>
                {stateLabel(preview.state)}
                {preview.state === 'in' && preview.liveClock ? ` · ${preview.liveClock}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Score area */}
        <div style={{ padding: isMobile ? '18px 14px' : '24px 18px' }}>
          {loading && !preview && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>Loading…</div>
            </div>
          )}
          {preview && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
              {/* Home */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, minWidth: 0 }}>
                <img src={preview.homeTeam.logo} alt={preview.homeTeam.name} width={logoSize} height={logoSize}
                  style={{ width: logoSize, height: logoSize, objectFit: 'contain', flexShrink: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                <div className="serif" style={{ fontSize: isMobile ? 15 : 18, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {preview.homeTeam.name}
                </div>
              </div>

              {/* Score / VS */}
              <div style={{ textAlign: 'center', minWidth: isMobile ? 56 : 72, flexShrink: 0 }}>
                {preview.state !== 'pre' ? (
                  <div className="serif tnum" style={{ fontSize: isMobile ? 28 : 36, lineHeight: 1, letterSpacing: '0.04em' }}>
                    {preview.homeTeam.score}
                    <span style={{ margin: '0 6px', color: 'var(--ink-3)', fontSize: isMobile ? 20 : 26 }}>–</span>
                    {preview.awayTeam.score}
                  </div>
                ) : (
                  <>
                    <div className="mono" style={{ fontSize: isMobile ? 14 : 18, color: 'var(--ink-3)' }}>VS</div>
                    {kickoffLabel && (
                      <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.5 }}>{kickoffLabel}</div>
                    )}
                  </>
                )}
              </div>

              {/* Away */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, flexDirection: 'row-reverse', minWidth: 0 }}>
                <img src={preview.awayTeam.logo} alt={preview.awayTeam.name} width={logoSize} height={logoSize}
                  style={{ width: logoSize, height: logoSize, objectFit: 'contain', flexShrink: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                <div className="serif" style={{ fontSize: isMobile ? 15 : 18, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {preview.awayTeam.name}
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
            {game.venue.name}
          </span>
          <span className="mono" style={{ fontSize: 9, color: 'var(--pulse)', letterSpacing: '0.12em' }}>
            VIEW DETAILS →
          </span>
        </div>
      </article>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TestMLSIndexPage() {
  const isMobile = useIsMobile();
  const router = useRouter();

  const [previews, setPreviews] = useState<Record<string, MLSPreview | null>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    () => Object.fromEntries(MLS_GAMES.map(g => [g.id, true]))
  );

  useEffect(() => {
    const controllers: Record<string, AbortController> = {};
    const intervals: Record<string, ReturnType<typeof setInterval>> = {};

    for (const game of MLS_GAMES) {
      const load = async () => {
        const ctrl = new AbortController();
        controllers[game.id] = ctrl;
        try {
          const res = await fetch(`/api/test-mls/${game.id}`, { signal: ctrl.signal, cache: 'no-store' });
          const data = await res.json();
          if (!res.ok || !data.match) return;
          const m = data.match;
          setPreviews(prev => ({
            ...prev,
            [game.id]: {
              state: m.state,
              homeTeam: m.homeTeam,
              awayTeam: m.awayTeam,
              statusDetail: m.statusDetail ?? '',
              liveClock: m.liveClock ?? m.displayClock ?? '',
              date: m.date ?? '',
            },
          }));
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') return;
        } finally {
          setLoadingStates(prev => ({ ...prev, [game.id]: false }));
        }
      };

      load();
      intervals[game.id] = setInterval(load, 20_000);
    }

    return () => {
      Object.values(controllers).forEach(c => c.abort());
      Object.values(intervals).forEach(id => clearInterval(id));
    };
  }, []);

  return (
    <main className="screen" style={{ minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden', padding: isMobile ? '24px 16px' : '40px 40px' }}>
      {/* Heading */}
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 className="serif" style={{ fontSize: isMobile ? 28 : 40, lineHeight: 1, margin: 0 }}>
            MLS Round 2
          </h1>
          <span className="mono" style={{ fontSize: 9, padding: '3px 9px', borderRadius: 4, background: 'rgba(255,200,0,0.15)', color: '#b8860b', letterSpacing: '0.12em', border: '1px solid rgba(200,160,0,0.3)' }}>
            DEV ONLY
          </span>
        </div>
        <p className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0, lineHeight: 1.7, maxWidth: 520 }}>
          ESPN + FotMob hybrid · polls every 20s · click any card or map pin to open the full match page.
        </p>
      </div>

      {/* USA map */}
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', margin: '0 0 12px' }}>
          MATCH LOCATIONS
        </h2>
        <MLSMap previews={previews} isMobile={isMobile} onSelect={(href) => router.push(href)} />
      </div>

      {/* Game cards */}
      <section aria-label="MLS games">
        <h2 className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', margin: '0 0 16px' }}>
          GAMES (2)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? 12 : 16 }}>
          {MLS_GAMES.map((game) => (
            <MatchCard
              key={game.id}
              game={game}
              preview={previews[game.id] ?? null}
              loading={loadingStates[game.id] ?? false}
              isMobile={isMobile}
            />
          ))}
        </div>
      </section>

      {/* Nav */}
      <nav aria-label="Quick links" style={{ marginTop: isMobile ? 28 : 36, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/test-mls/atl-orl" className="btn" style={{ fontSize: 11, minHeight: 40, padding: '0 16px', textDecoration: 'none' }}>
          ATL vs ORL →
        </Link>
        <Link href="/test-mls/hou-stl" className="btn" style={{ fontSize: 11, minHeight: 40, padding: '0 16px', textDecoration: 'none' }}>
          HOU vs STL →
        </Link>
        <Link href="/tests" className="btn" style={{ fontSize: 11, minHeight: 40, padding: '0 16px', textDecoration: 'none' }}>
          ← All Tests
        </Link>
        <Link href="/" className="btn" style={{ fontSize: 11, minHeight: 40, padding: '0 16px', textDecoration: 'none' }}>
          ← Home
        </Link>
      </nav>

      <div style={{ height: isMobile ? 32 : 0 }} aria-hidden="true" />
    </main>
  );
}
