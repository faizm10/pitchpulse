'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

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
}

// ── Test game registry ────────────────────────────────────────────────────────

const TEST_GAMES: TestGame[] = [
  {
    slug: 'espn-bournemouth-mancity',
    href: '/test-match',
    source: 'espn',
    matchId: '740958',
    apiPath: '/api/test-match/740958',
    league: 'Premier League',
    round: 'GW37',
  },
  {
    slug: 'fotmob-chelsea-spurs',
    href: '/test-fotmob',
    source: 'fotmob',
    matchId: '4813739',
    apiPath: '/api/test-fotmob/4813739',
    league: 'Premier League',
    round: 'GW37',
  },
];

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

function stateLabel(state: LiveInfo['state']): string {
  if (state === 'in') return 'LIVE';
  if (state === 'post') return 'FT';
  return 'PRE';
}

function stateColor(state: LiveInfo['state']): string {
  if (state === 'in') return 'var(--live)';
  if (state === 'post') return 'var(--ink-3)';
  return 'var(--ink-3)';
}

// ── Match card ────────────────────────────────────────────────────────────────

function MatchCard({ game, isMobile }: { game: TestGame; isMobile: boolean }) {
  const [info, setInfo] = useState<LiveInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(game.apiPath);
        const data = await res.json();
        if (!res.ok || !data.match) throw new Error();
        const m = data.match;
        if (!cancelled) {
          setInfo({
            state: m.state,
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            statusDetail: m.statusDetail ?? '',
            liveClock: m.liveClock ?? m.displayClock ?? '',
            league: m.league,
            round: m.round,
          });
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    // Poll live games faster
    const interval = setInterval(load, 20_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [game.apiPath]);

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
                {stateLabel(info.state)}
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
                  <div className="serif tnum" style={{ fontSize: isMobile ? 28 : 36, lineHeight: 1, letterSpacing: '0.04em' }}>
                    {info.homeTeam.score}
                    <span style={{ margin: '0 6px', color: 'var(--ink-3)', fontSize: isMobile ? 20 : 26 }}>–</span>
                    {info.awayTeam.score}
                  </div>
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

  return (
    <main
      className="screen"
      style={{ minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden', padding: isMobile ? '24px 16px' : '40px 40px' }}
    >
      {/* Page heading */}
      <div style={{ marginBottom: isMobile ? 24 : 32 }}>
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
          Cards poll every 20s — click any card to open the full match page.
        </p>
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
            <MatchCard key={game.slug} game={game} isMobile={isMobile} />
          ))}
        </div>
      </section>

      {/* Quick nav to test pages */}
      <nav aria-label="Quick links" style={{ marginTop: isMobile ? 28 : 36, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/test-match" className="btn" style={{ fontSize: 11, minHeight: 40, padding: '0 16px', textDecoration: 'none' }}>
          ESPN Match →
        </Link>
        <Link href="/test-fotmob" className="btn" style={{ fontSize: 11, minHeight: 40, padding: '0 16px', textDecoration: 'none' }}>
          FotMob Match →
        </Link>
        <Link href="/" className="btn" style={{ fontSize: 11, minHeight: 40, padding: '0 16px', textDecoration: 'none' }}>
          ← Home
        </Link>
      </nav>

      <div style={{ height: isMobile ? 32 : 0 }} aria-hidden="true" />
    </main>
  );
}
