'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Map, MapMarker, MarkerContent, MarkerPopup, MapControls, useMap } from '@/components/ui/map';
import { VENUES as WC_VENUES } from '@/data/venues';
import { useGoalCelebration } from '@/components/GoalCelebration';
import type { GoalData, GoalVariant } from '@/components/GoalCelebration';
import type { Match } from '@/types/espn';
import { posthog } from '@/lib/posthog';

// ── Helpers ───────────────────────────────────────────────────────────────────

type MatchState = 'pre' | 'in' | 'post';

function stateLabel(state: MatchState) {
  if (state === 'in') return 'LIVE';
  if (state === 'post') return 'FT';
  return 'PRE';
}

function stateColor(state: MatchState) {
  return state === 'in' ? 'var(--live)' : 'var(--ink-3)';
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

// ── Map ───────────────────────────────────────────────────────────────────────

function MapLoadedObserver({ onLoad }: { onLoad: () => void }) {
  const { isLoaded } = useMap();
  useEffect(() => { if (isLoaded) onLoad(); }, [isLoaded, onLoad]);
  return null;
}

function WC2026VenueMarkers({
  matches,
  goalFiredForVenueId,
  onNavigate,
}: {
  matches: Match[];
  goalFiredForVenueId: string | null;
  onNavigate: (id: string) => void;
}) {
  const matchByVenue = useMemo(() => {
    const map: Record<string, Match[]> = {};
    for (const m of matches) {
      const vid = m.venueId;
      if (!vid) continue;
      if (!map[vid]) map[vid] = [];
      map[vid].push(m);
    }
    return map;
  }, [matches]);

  return (
    <>
      {WC_VENUES.map(venue => {
        const vMatches = matchByVenue[venue.id] ?? [];
        const liveMatch = vMatches.find(m => m.state === 'in');
        const nextMatch = vMatches.find(m => m.state === 'pre');
        const displayMatch = liveMatch ?? nextMatch ?? vMatches[0] ?? null;
        const isLive = !!liveMatch;
        const isGoal = goalFiredForVenueId === venue.id;
        const dotColor = isGoal ? '#fbbf24' : isLive ? '#e63c3c' : 'var(--ink-3)';

        return (
          <MapMarker key={venue.id} longitude={venue.longitude} latitude={venue.latitude}>
            <MarkerContent>
              <div style={{ position: 'relative', width: isGoal ? 26 : 16, height: isGoal ? 26 : 16, transition: 'width 0.3s, height 0.3s' }}>
                {isGoal && (
                  <>
                    <span style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: '#fbbf24', animation: 'pulse-ring 0.7s ease-out infinite', zIndex: 0 }} />
                    <span style={{ position: 'absolute', inset: -16, borderRadius: '50%', background: 'rgba(251,191,36,0.3)', animation: 'pulse-ring 0.7s 0.15s ease-out infinite', zIndex: 0 }} />
                  </>
                )}
                {isLive && !isGoal && (
                  <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: '#e63c3c', animation: 'pulse-ring 1.8s ease-out infinite' }} />
                )}
                <div style={{ position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: '50%', filter: 'blur(6px)', opacity: 0.55, backgroundColor: dotColor, pointerEvents: 'none' }} />
                <button
                  type="button"
                  aria-label={`${venue.name}`}
                  style={{
                    display: 'block', width: isGoal ? 26 : 16, height: isGoal ? 26 : 16,
                    borderRadius: '50%', border: `2px solid white`,
                    backgroundColor: dotColor, cursor: 'pointer', padding: 0,
                    boxShadow: `0 2px 8px ${dotColor}99, 0 0 0 1px rgba(0,0,0,0.1)`,
                    transition: 'all 0.3s', zIndex: 1, position: 'relative',
                    fontSize: isGoal ? 13 : 0,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.35)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                >
                  {isGoal ? '⚽' : ''}
                </button>
                {isGoal && (
                  <div style={{ position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)', background: '#fbbf24', color: '#000', fontWeight: 900, fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.12em', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', animation: 'ar-pop 0.4s cubic-bezier(.2,1.6,.4,1) both' }}>
                    GOAL!
                  </div>
                )}
              </div>
            </MarkerContent>

            <MarkerPopup>
              <div style={{ minWidth: 200, borderRadius: 12, overflow: 'hidden', background: 'var(--paper)' }}>
                <div style={{ height: 4, background: isGoal ? '#fbbf24' : isLive ? '#e63c3c' : 'var(--ink-3)' }} />
                <div style={{ padding: 12, background: 'var(--paper-2)' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{venue.name}</p>
                  <p style={{ margin: '2px 0 8px', fontSize: 11, color: 'var(--ink-3)' }}>{venue.city}</p>
                  {displayMatch ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                        <img src={displayMatch.homeTeam.logo} alt="" width={14} height={14} style={{ width: 14, height: 14, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                        <span style={{ flex: 1, fontSize: 11, color: 'var(--ink)' }}>{displayMatch.homeTeam.abbreviation}</span>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{displayMatch.state !== 'pre' ? displayMatch.homeTeam.score : '–'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                        <img src={displayMatch.awayTeam.logo} alt="" width={14} height={14} style={{ width: 14, height: 14, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                        <span style={{ flex: 1, fontSize: 11, color: 'var(--ink)' }}>{displayMatch.awayTeam.abbreviation}</span>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{displayMatch.state !== 'pre' ? displayMatch.awayTeam.score : '–'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate(displayMatch.id)}
                        style={{ width: '100%', borderRadius: 7, border: 'none', background: 'var(--paper)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', padding: '7px 12px', fontSize: 10, fontWeight: 500, color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--mono)', letterSpacing: '0.08em' }}
                      >
                        VIEW MATCH →
                      </button>
                    </>
                  ) : (
                    <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>No matches scheduled</div>
                  )}
                </div>
              </div>
            </MarkerPopup>
          </MapMarker>
        );
      })}
    </>
  );
}

// ── Service health panel ──────────────────────────────────────────────────────

interface ServiceHealth {
  espn: { status: 'ok' | 'error' | 'checking'; latency_ms?: number; matchCount?: number };
  backend: { status: 'ok' | 'error' | 'checking'; latency_ms?: number; model_loaded?: boolean; training_rows?: number | null; error?: string };
}

function ServiceHealthPanel() {
  const [health, setHealth] = useState<ServiceHealth>({
    espn: { status: 'checking' },
    backend: { status: 'checking' },
  });
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const check = useCallback(async () => {
    setHealth({ espn: { status: 'checking' }, backend: { status: 'checking' } });
    const [espnResult, backendResult] = await Promise.allSettled([
      (async () => {
        const t = Date.now();
        const res = await fetch('/api/scores', { cache: 'no-store' });
        const latency_ms = Date.now() - t;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return { status: 'ok' as const, latency_ms, matchCount: (data.matches ?? []).length };
      })(),
      (async () => {
        const res = await fetch('/api/admin/health', { cache: 'no-store' });
        const data = await res.json();
        return {
          status: data.status === 'ok' ? 'ok' as const : 'error' as const,
          latency_ms: data.latency_ms,
          model_loaded: data.model_loaded,
          training_rows: data.training_rows,
          error: data.error,
        };
      })(),
    ]);

    setHealth({
      espn: espnResult.status === 'fulfilled' ? espnResult.value : { status: 'error' },
      backend: backendResult.status === 'fulfilled' ? backendResult.value : { status: 'error', error: String((backendResult as PromiseRejectedResult).reason) },
    });
    setLastChecked(new Date());
    posthog.capture?.('admin_health_check_ran');
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [check]);

  const dot = (status: 'ok' | 'error' | 'checking') =>
    status === 'ok' ? '#22c55e' : status === 'error' ? '#e63c3c' : 'var(--ink-3)';

  return (
    <div style={{ padding: '16px 18px', borderRadius: 10, background: 'var(--paper)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-3)' }}>SERVICE HEALTH</div>
        <button type="button" onClick={check} className="mono" style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, border: 'none', background: 'var(--paper-2)', color: 'var(--ink-3)', cursor: 'pointer', letterSpacing: '0.08em' }}>
          ↻ Refresh
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--rule-soft)' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot(health.espn.status), flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink)', letterSpacing: '0.06em' }}>ESPN API</span>
            <span className="mono" style={{ fontSize: 8, letterSpacing: '0.1em', color: dot(health.espn.status) }}>{health.espn.status.toUpperCase()}</span>
          </div>
          {health.espn.status !== 'checking' && (
            <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', marginTop: 2 }}>
              {health.espn.latency_ms != null ? `${health.espn.latency_ms}ms` : ''}
              {health.espn.matchCount != null ? ` · ${health.espn.matchCount} matches` : ''}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot(health.backend.status), flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink)', letterSpacing: '0.06em' }}>Backend (ML)</span>
            <span className="mono" style={{ fontSize: 8, letterSpacing: '0.1em', color: dot(health.backend.status) }}>{health.backend.status.toUpperCase()}</span>
          </div>
          {health.backend.status !== 'checking' && (
            <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', marginTop: 2 }}>
              {health.backend.latency_ms != null ? `${health.backend.latency_ms}ms` : ''}
              {health.backend.model_loaded != null ? ` · model ${health.backend.model_loaded ? '✓' : '✗'}` : ''}
              {health.backend.training_rows != null ? ` · ${health.backend.training_rows} rows` : ''}
              {health.backend.error ? ` · ${health.backend.error}` : ''}
            </div>
          )}
        </div>
      </div>

      {lastChecked && (
        <div className="mono" style={{ fontSize: 7, color: 'var(--ink-3)', marginTop: 6, textAlign: 'right', letterSpacing: '0.06em' }}>
          checked {lastChecked.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

// ── Goal scorer test panel ────────────────────────────────────────────────────

const GOAL_VARIANTS: GoalVariant[] = ['broadcast', 'arcade', 'cinematic', 'stadium', 'siuuu'];

const CR7_PRESET = {
  playerName: 'Cristiano Ronaldo',
  number: 7,
  flag: '🇵🇹',
  assist: '',
  minute: 77,
};

function GoalTestPanel({
  matches,
  onFireGoal,
}: {
  matches: Match[];
  onFireGoal: (data: GoalData, venueId: string | undefined, variant: GoalVariant) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [side, setSide] = useState<'home' | 'away'>('home');
  const [playerName, setPlayerName] = useState('Lionel Messi');
  const [number, setNumber] = useState(10);
  const [minute, setMinute] = useState(45);
  const [flag, setFlag] = useState('🇦🇷');
  const [assist, setAssist] = useState('');
  const [variant, setVariant] = useState<GoalVariant>('broadcast');

  const displayMatches = useMemo(
    () => matches.filter(m => m.state === 'in' || m.state === 'pre').sort((a, b) => {
      if (a.state === 'in' && b.state !== 'in') return -1;
      if (b.state === 'in' && a.state !== 'in') return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }),
    [matches]
  );

  const selected = displayMatches.find(m => m.id === selectedId) ?? displayMatches[0] ?? null;

  useEffect(() => {
    if (!selectedId && displayMatches.length > 0) setSelectedId(displayMatches[0].id);
  }, [displayMatches, selectedId]);

  const handleFire = useCallback(() => {
    if (!selected) return;
    const parts = playerName.trim().split(/\s+/);
    const given = parts.length > 1 ? parts[0] : '';
    const surname = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    const scoringTeam = side === 'home' ? selected.homeTeam : selected.awayTeam;
    const teamColor = `#${(side === 'home' ? selected.homeTeam.color : selected.awayTeam.color) || '1d4ed8'}`;
    const homeScore = parseInt(selected.homeTeam.score, 10) || 0;
    const awayScore = parseInt(selected.awayTeam.score, 10) || 0;

    const goalData: GoalData = {
      given,
      surname,
      number,
      minute,
      homeTeam: selected.homeTeam.abbreviation,
      awayTeam: selected.awayTeam.abbreviation,
      homeScore: side === 'home' ? homeScore + 1 : homeScore,
      awayScore: side === 'away' ? awayScore + 1 : awayScore,
      teamColor,
      accentColor: '#f4d35e',
      matchLabel: 'FIFA WORLD CUP 2026',
      assist,
      flag,
    };
    void scoringTeam;
    onFireGoal(goalData, selected.venueId, variant);
    setOpen(false);
  }, [selected, playerName, side, number, minute, flag, assist, variant, onFireGoal]);

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', background: 'var(--paper)' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--paper)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚽</span>
          <div>
            <div className="mono" style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-3)' }}>TEST</div>
            <div className="serif" style={{ fontSize: 15, lineHeight: 1.1 }}>Goal Scorer</div>
          </div>
        </div>
        <span className="mono" style={{ fontSize: 14, color: 'var(--ink-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>↓</span>
      </button>

      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--rule-soft)' }}>
          <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Match select */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>MATCH</span>
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 7, border: 'none', background: 'var(--paper-2)', fontSize: 11, color: 'var(--ink)', fontFamily: 'var(--mono)', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}
              >
                {displayMatches.length === 0 && <option value="">No upcoming matches</option>}
                {displayMatches.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.state === 'in' ? '● ' : ''}{m.homeTeam.abbreviation} vs {m.awayTeam.abbreviation}
                  </option>
                ))}
              </select>
            </label>

            {/* Side */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>SCORING SIDE</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['home', 'away'] as const).map(s => (
                  <button key={s} type="button" onClick={() => setSide(s)} style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: side === s ? 'var(--pulse)' : 'var(--paper-2)', color: side === s ? '#fff' : 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', fontWeight: side === s ? 600 : 400 }}>
                    {selected ? (s === 'home' ? selected.homeTeam.abbreviation : selected.awayTeam.abbreviation) : s.toUpperCase()}
                  </button>
                ))}
              </div>
            </label>

            {/* Player + flag */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px', gap: 6 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>PLAYER NAME</span>
                <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} style={{ padding: '7px 10px', borderRadius: 7, border: 'none', background: 'var(--paper-2)', fontSize: 11, color: 'var(--ink)', fontFamily: 'var(--mono)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>FLAG</span>
                <input type="text" value={flag} onChange={e => setFlag(e.target.value)} style={{ padding: '7px 10px', borderRadius: 7, border: 'none', background: 'var(--paper-2)', fontSize: 18, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} />
              </label>
            </div>

            {/* Number + Minute */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>JERSEY #</span>
                <input type="number" min={1} max={99} value={number} onChange={e => setNumber(parseInt(e.target.value, 10) || 9)} style={{ padding: '7px 10px', borderRadius: 7, border: 'none', background: 'var(--paper-2)', fontSize: 11, color: 'var(--ink)', fontFamily: 'var(--mono)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>MINUTE</span>
                <input type="number" min={1} max={120} value={minute} onChange={e => setMinute(parseInt(e.target.value, 10) || 45)} style={{ padding: '7px 10px', borderRadius: 7, border: 'none', background: 'var(--paper-2)', fontSize: 11, color: 'var(--ink)', fontFamily: 'var(--mono)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} />
              </label>
            </div>

            {/* Assist */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>ASSIST (OPTIONAL)</span>
              <input type="text" value={assist} placeholder="Assisting player" onChange={e => setAssist(e.target.value)} style={{ padding: '7px 10px', borderRadius: 7, border: 'none', background: 'var(--paper-2)', fontSize: 11, color: 'var(--ink)', fontFamily: 'var(--mono)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} />
            </label>

            {/* Variant picker */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="mono" style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>ANIMATION STYLE</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {GOAL_VARIANTS.map(v => (
                  <button key={v} type="button" onClick={() => setVariant(v)} style={{ padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: variant === v ? '#1d4ed8' : 'var(--paper-2)', color: variant === v ? '#fff' : 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em', fontWeight: variant === v ? 700 : 400, textTransform: 'uppercase' }}>
                    {v}
                  </button>
                ))}
              </div>
            </label>

            {/* CR7 Easter egg preset */}
            <button
              type="button"
              onClick={() => {
                setPlayerName(CR7_PRESET.playerName);
                setNumber(CR7_PRESET.number);
                setFlag(CR7_PRESET.flag);
                setAssist(CR7_PRESET.assist);
                setMinute(CR7_PRESET.minute);
                setVariant('siuuu');
              }}
              style={{ padding: '8px 0', borderRadius: 7, border: '2px solid #E10600', cursor: 'pointer', background: 'linear-gradient(135deg, #006600, #E10600)', color: '#FFD700', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              🇵🇹 CR7 SIUUU PRESET
            </button>

            <button
              type="button"
              onClick={handleFire}
              style={{ marginTop: 4, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #e63c3c, #c0392b)', color: '#fff', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', fontWeight: 700, boxShadow: '0 4px 12px rgba(230,60,60,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <span>⚽</span> FIRE GOAL CELEBRATION
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Match list (monitor tab) ──────────────────────────────────────────────────

type MatchFilter = 'all' | 'live' | 'upcoming' | 'finished';

function MatchListPanel({
  matches,
  loading,
  onNavigate,
}: {
  matches: Match[];
  loading: boolean;
  onNavigate: (id: string) => void;
}) {
  const [filter, setFilter] = useState<MatchFilter>('all');

  const counts = useMemo(() => ({
    all: matches.length,
    live: matches.filter(m => m.state === 'in').length,
    upcoming: matches.filter(m => m.state === 'pre').length,
    finished: matches.filter(m => m.state === 'post').length,
  }), [matches]);

  const filtered = useMemo(() => {
    if (filter === 'live') return matches.filter(m => m.state === 'in');
    if (filter === 'upcoming') return matches.filter(m => m.state === 'pre');
    if (filter === 'finished') return matches.filter(m => m.state === 'post');
    return matches;
  }, [matches, filter]);

  const FILTERS: { key: MatchFilter; label: string }[] = [
    { key: 'all', label: `ALL (${counts.all})` },
    { key: 'live', label: `LIVE (${counts.live})` },
    { key: 'upcoming', label: `UPCOMING (${counts.upcoming})` },
    { key: 'finished', label: `FINISHED (${counts.finished})` },
  ];

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--ink-3)' }}>
          WC2026 MATCHES
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {FILTERS.map(f => (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)} className="mono" style={{ padding: '4px 9px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 8, letterSpacing: '0.1em', background: filter === f.key ? 'var(--pulse)' : 'var(--paper)', color: filter === f.key ? '#fff' : 'var(--ink-3)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', background: 'var(--paper)', maxHeight: 480, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading…</span>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>No matches</span>
          </div>
        )}
        {filtered.map((m, i) => {
          const isLive = m.state === 'in';
          const isPre = m.state === 'pre';
          const dateStr = isPre
            ? new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : null;

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                posthog.capture?.('admin_match_expanded', { matchId: m.id, league: 'fifa.world' });
                onNavigate(m.id);
              }}
              style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto 60px', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 'none', background: i % 2 === 0 ? 'var(--paper)' : 'var(--paper-2)', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--rule-soft)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.07)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = i % 2 === 0 ? 'var(--paper)' : 'var(--paper-2)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {isLive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)', display: 'inline-block', flexShrink: 0 }} />}
                <span className="mono" style={{ fontSize: 8, letterSpacing: '0.1em', color: isLive ? 'var(--live)' : 'var(--ink-3)', fontWeight: isLive ? 700 : 400 }}>
                  {stateLabel(m.state)}
                </span>
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <img src={m.homeTeam.logo} alt="" width={14} height={14} style={{ width: 14, height: 14, objectFit: 'contain', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                  <span className="serif" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink)' }}>{m.homeTeam.abbreviation}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <img src={m.awayTeam.logo} alt="" width={14} height={14} style={{ width: 14, height: 14, objectFit: 'contain', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                  <span className="serif" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink-3)' }}>{m.awayTeam.abbreviation}</span>
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                {m.state !== 'pre' ? (
                  <div className="serif tnum" style={{ fontSize: 14, letterSpacing: '0.04em', color: 'var(--ink)' }}>{m.homeTeam.score} – {m.awayTeam.score}</div>
                ) : (
                  <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{dateStr}</span>
                )}
                {isLive && m.displayClock && (
                  <div className="mono" style={{ fontSize: 8, color: 'var(--live)', marginTop: 2 }}>{m.displayClock}</div>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--pulse)' }}>→</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Simulate tab ──────────────────────────────────────────────────────────────

interface SimState {
  state: MatchState;
  homeScore: number;
  awayScore: number;
  clock: string;
  hasPens: boolean;
  penHome: number;
  penAway: number;
}

// ── Roster types ─────────────────────────────────────────────────────────────

interface RosterPlayer {
  id: string;
  name: string;
  shortName: string;
  firstName: string;
  lastName: string;
  position: string;
  positionName: string;
  jersey: string | null;
  countryCode: string;
  flagEmoji: string;
  flagAlt: string;
}

type RosterSide = 'home' | 'away';
const POS_LABELS: Record<string, string> = { G: 'GK', D: 'DEF', M: 'MID', F: 'FWD' };
const POS_COLORS: Record<string, string> = { G: '#f59e0b', D: '#3b82f6', M: '#22c55e', F: '#e63c3c' };

function SimulateTab({
  matches,
  onFireGoal,
}: {
  matches: Match[];
  onFireGoal: (data: GoalData, venueId: string | undefined, variant: GoalVariant) => void;
}) {
  const router = useRouter();
  const upcoming = useMemo(
    () => matches.filter(m => m.state === 'pre').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [matches]
  );

  // Match selection
  const [selectedId, setSelectedId] = useState<string>('');
  const selected = upcoming.find(m => m.id === selectedId) ?? upcoming[0] ?? null;
  useEffect(() => {
    if (!selectedId && upcoming.length > 0) setSelectedId(upcoming[0].id);
  }, [upcoming, selectedId]);

  // Sim state
  const [sim, setSim] = useState<SimState>({ state: 'pre', homeScore: 0, awayScore: 0, clock: "45'", hasPens: false, penHome: 0, penAway: 0 });
  const set = <K extends keyof SimState>(k: K, v: SimState[K]) => setSim(prev => ({ ...prev, [k]: v }));

  // Roster state
  const [rosters, setRosters] = useState<{ home: RosterPlayer[]; away: RosterPlayer[] }>({ home: [], away: [] });
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSide, setRosterSide] = useState<RosterSide>('home');

  // Fetch rosters when selected match changes
  useEffect(() => {
    if (!selected) return;
    setRosters({ home: [], away: [] });
    setRosterLoading(true);
    Promise.all([
      fetch(`/api/admin/roster/${selected.homeTeam.id}`).then(r => r.json()),
      fetch(`/api/admin/roster/${selected.awayTeam.id}`).then(r => r.json()),
    ]).then(([homeData, awayData]) => {
      setRosters({ home: homeData.players ?? [], away: awayData.players ?? [] });
    }).catch(() => {
      setRosters({ home: [], away: [] });
    }).finally(() => setRosterLoading(false));
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Goal form
  const [playerName, setPlayerName] = useState('');
  const [number, setNumber] = useState(10);
  const [minute, setMinute] = useState(45);
  const [flag, setFlag] = useState('');
  const [assist, setAssist] = useState('');
  const [scoringSide, setScoringSide] = useState<RosterSide>('home');
  const [variant, setVariant] = useState<GoalVariant>('broadcast');

  const handleSelectPlayer = useCallback((p: RosterPlayer, side: RosterSide) => {
    setPlayerName(p.name);
    setFlag(p.flagEmoji || p.flagAlt);
    if (p.jersey) setNumber(parseInt(p.jersey, 10) || number);
    setScoringSide(side);
    setRosterSide(side);
  }, [number]);

  const handleFire = useCallback(() => {
    if (!selected) return;
    const parts = playerName.trim().split(/\s+/);
    const given = parts.length > 1 ? parts[0] : '';
    const surname = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    const teamColor = `#${(scoringSide === 'home' ? selected.homeTeam.color : selected.awayTeam.color) || '1d4ed8'}`;
    const goalData: GoalData = {
      given, surname, number, minute,
      homeTeam: selected.homeTeam.abbreviation,
      awayTeam: selected.awayTeam.abbreviation,
      homeScore: scoringSide === 'home' ? sim.homeScore + 1 : sim.homeScore,
      awayScore: scoringSide === 'away' ? sim.awayScore + 1 : sim.awayScore,
      teamColor, accentColor: '#f4d35e',
      matchLabel: 'FIFA WORLD CUP 2026',
      assist, flag,
    };
    onFireGoal(goalData, selected.venueId, variant);
    posthog.capture?.('admin_goal_celebration_fired', { variant, minute, player: `${given} ${surname}`.trim(), simulated: true });
  }, [selected, playerName, number, minute, flag, assist, scoringSide, variant, sim, onFireGoal]);

  const stateTabStyle = (s: MatchState): React.CSSProperties => ({
    flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em',
    background: sim.state === s ? (s === 'in' ? 'var(--live)' : s === 'post' ? 'var(--ink-3)' : 'var(--pulse)') : 'var(--paper-2)',
    color: sim.state === s ? '#fff' : 'var(--ink)', fontWeight: sim.state === s ? 700 : 400,
  });

  // Group players by position
  const rosterPlayers = rosters[rosterSide];
  const grouped = useMemo(() => {
    const groups: Record<string, RosterPlayer[]> = {};
    for (const p of rosterPlayers) {
      if (!groups[p.position]) groups[p.position] = [];
      groups[p.position].push(p);
    }
    return groups;
  }, [rosterPlayers]);
  const posOrder = ['G', 'D', 'M', 'F'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 1fr', gap: 20, alignItems: 'start' }}>

      {/* Col 1: pick a match */}
      <section>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--ink-3)', marginBottom: 10 }}>SELECT MATCH</div>
        <div style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', background: 'var(--paper)', maxHeight: 580, overflowY: 'auto' }}>
          {upcoming.length === 0 && (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>No upcoming matches</span>
            </div>
          )}
          {upcoming.map((m, i) => {
            const isSelected = m.id === (selected?.id ?? '');
            const dateStr = new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedId(m.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 'none', background: isSelected ? 'rgba(99,102,241,0.1)' : i % 2 === 0 ? 'var(--paper)' : 'var(--paper-2)', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--rule-soft)', borderLeft: isSelected ? '3px solid var(--pulse)' : '3px solid transparent' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <img src={m.homeTeam.logo} alt="" width={14} height={14} style={{ width: 14, height: 14, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                    <span className="serif" style={{ fontSize: 12, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.homeTeam.abbreviation}</span>
                    <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>vs</span>
                    <img src={m.awayTeam.logo} alt="" width={14} height={14} style={{ width: 14, height: 14, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                    <span className="serif" style={{ fontSize: 12, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.awayTeam.abbreviation}</span>
                  </div>
                  <div className="mono" style={{ fontSize: 7, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>{dateStr}</div>
                </div>
                {isSelected && <span style={{ fontSize: 10, color: 'var(--pulse)', flexShrink: 0 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Col 2: player roster picker */}
      <section>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--ink-3)', marginBottom: 10 }}>SQUAD</div>

        {!selected ? (
          <div style={{ padding: '40px 0', textAlign: 'center', background: 'var(--paper)', borderRadius: 10 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Select a match first</span>
          </div>
        ) : (
          <div style={{ background: 'var(--paper)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            {/* Team tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--rule-soft)' }}>
              {(['home', 'away'] as const).map(side => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setRosterSide(side)}
                  style={{ flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', background: rosterSide === side ? 'var(--paper)' : 'var(--paper-2)', borderBottom: rosterSide === side ? '2px solid var(--pulse)' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                >
                  <img src={side === 'home' ? selected.homeTeam.logo : selected.awayTeam.logo} alt="" width={16} height={16} style={{ width: 16, height: 16, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                  <span className="mono" style={{ fontSize: 9, letterSpacing: '0.1em', color: rosterSide === side ? 'var(--ink)' : 'var(--ink-3)', fontWeight: rosterSide === side ? 700 : 400 }}>
                    {side === 'home' ? selected.homeTeam.abbreviation : selected.awayTeam.abbreviation}
                  </span>
                </button>
              ))}
            </div>

            {/* Player list */}
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {rosterLoading && (
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading squad…</span>
                </div>
              )}
              {!rosterLoading && rosterPlayers.length === 0 && (
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>No squad data</span>
                </div>
              )}
              {!rosterLoading && posOrder.map(pos => {
                const players = grouped[pos];
                if (!players?.length) return null;
                return (
                  <div key={pos}>
                    <div style={{ padding: '6px 12px', background: 'var(--paper-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: POS_COLORS[pos] ?? 'var(--ink-3)', fontFamily: 'var(--mono)', letterSpacing: '0.1em' }}>
                        {POS_LABELS[pos] ?? pos}
                      </span>
                      <span className="mono" style={{ fontSize: 8, color: 'var(--ink-3)' }}>· {players.length}</span>
                    </div>
                    {players.map((p, pi) => {
                      const isActive = playerName === p.name && scoringSide === rosterSide;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPlayer(p, rosterSide)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', border: 'none', background: isActive ? 'rgba(99,102,241,0.08)' : pi % 2 === 0 ? 'var(--paper)' : 'rgba(0,0,0,0.01)', cursor: 'pointer', textAlign: 'left', borderLeft: isActive ? `3px solid ${POS_COLORS[pos] ?? 'var(--pulse)'}` : '3px solid transparent' }}
                        >
                          <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{p.flagEmoji || '🏳'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: 'var(--ink)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                            {p.jersey && (
                              <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)' }}>#{p.jersey}</div>
                            )}
                          </div>
                          {isActive && <span style={{ fontSize: 10, color: 'var(--pulse)' }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Col 3: simulation editor + fire */}
      <section>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--ink-3)', marginBottom: 10 }}>SIMULATION EDITOR</div>

        {!selected ? (
          <div style={{ padding: '40px 0', textAlign: 'center', background: 'var(--paper)', borderRadius: 10 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Select a match to simulate</span>
          </div>
        ) : (
          <div style={{ background: 'var(--paper)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>

            {/* Match header */}
            <div style={{ padding: '12px 16px', background: 'var(--paper-2)', borderBottom: '1px solid var(--rule-soft)' }}>
              <div className="mono" style={{ fontSize: 7, color: 'var(--ink-3)', letterSpacing: '0.12em', marginBottom: 4 }}>WC2026 · {selected.venue.city.toUpperCase()}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={selected.homeTeam.logo} alt="" width={22} height={22} style={{ width: 22, height: 22, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                <span className="serif" style={{ fontSize: 14, color: 'var(--ink)' }}>{selected.homeTeam.abbreviation}</span>
                <span className="mono" style={{ fontSize: 14, color: 'var(--ink-3)' }}>vs</span>
                <span className="serif" style={{ fontSize: 14, color: 'var(--ink)' }}>{selected.awayTeam.abbreviation}</span>
                <img src={selected.awayTeam.logo} alt="" width={22} height={22} style={{ width: 22, height: 22, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
              </div>
            </div>

            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* State */}
              <div>
                <div className="mono" style={{ fontSize: 8, letterSpacing: '0.12em', color: 'var(--ink-3)', marginBottom: 5 }}>MATCH STATE</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {(['pre', 'in', 'post'] as const).map(s => (
                    <button key={s} type="button" onClick={() => set('state', s)} style={stateTabStyle(s)}>
                      {s === 'pre' ? 'PRE' : s === 'in' ? '● LIVE' : 'FT'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Score */}
              {sim.state !== 'pre' && (
                <div>
                  <div className="mono" style={{ fontSize: 8, letterSpacing: '0.12em', color: 'var(--ink-3)', marginBottom: 5 }}>SCORE</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 6 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <span className="mono" style={{ fontSize: 7, color: 'var(--ink-3)' }}>{selected.homeTeam.abbreviation}</span>
                      <input type="number" min={0} max={20} value={sim.homeScore} onChange={e => set('homeScore', parseInt(e.target.value, 10) || 0)} style={{ width: '100%', padding: '7px', borderRadius: 7, border: 'none', background: 'var(--paper-2)', fontSize: 20, fontFamily: 'var(--mono)', textAlign: 'center', color: 'var(--ink)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} />
                    </div>
                    <span className="mono" style={{ fontSize: 16, color: 'var(--ink-3)' }}>–</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <span className="mono" style={{ fontSize: 7, color: 'var(--ink-3)' }}>{selected.awayTeam.abbreviation}</span>
                      <input type="number" min={0} max={20} value={sim.awayScore} onChange={e => set('awayScore', parseInt(e.target.value, 10) || 0)} style={{ width: '100%', padding: '7px', borderRadius: 7, border: 'none', background: 'var(--paper-2)', fontSize: 20, fontFamily: 'var(--mono)', textAlign: 'center', color: 'var(--ink)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} />
                    </div>
                  </div>
                </div>
              )}

              {sim.state === 'in' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="mono" style={{ fontSize: 8, letterSpacing: '0.12em', color: 'var(--ink-3)' }}>CLOCK</span>
                  <input type="text" value={sim.clock} onChange={e => set('clock', e.target.value)} placeholder="45+2'" style={{ padding: '7px 10px', borderRadius: 7, border: 'none', background: 'var(--paper-2)', fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--ink)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} />
                </label>
              )}

              {sim.state === 'post' && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <input type="checkbox" checked={sim.hasPens} onChange={e => set('hasPens', e.target.checked)} style={{ width: 14, height: 14 }} />
                    <span className="mono" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--ink-3)' }}>PENALTY SHOOTOUT</span>
                  </label>
                  {sim.hasPens && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 6 }}>
                      <input type="number" min={0} max={20} value={sim.penHome} onChange={e => set('penHome', parseInt(e.target.value, 10) || 0)} style={{ width: '100%', padding: '6px', borderRadius: 6, border: 'none', background: 'var(--paper-2)', fontSize: 14, fontFamily: 'var(--mono)', textAlign: 'center', color: 'var(--ink)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} />
                      <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>–</span>
                      <input type="number" min={0} max={20} value={sim.penAway} onChange={e => set('penAway', parseInt(e.target.value, 10) || 0)} style={{ width: '100%', padding: '6px', borderRadius: 6, border: 'none', background: 'var(--paper-2)', fontSize: 14, fontFamily: 'var(--mono)', textAlign: 'center', color: 'var(--ink)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} />
                    </div>
                  )}
                </div>
              )}

              {/* Preview */}
              <div style={{ background: 'var(--paper-2)', borderRadius: 8, padding: '10px 12px' }}>
                <div className="mono" style={{ fontSize: 7, letterSpacing: '0.12em', color: 'var(--ink-3)', marginBottom: 6 }}>PREVIEW</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <img src={selected.homeTeam.logo} alt="" width={20} height={20} style={{ width: 20, height: 20, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                    <span className="serif" style={{ fontSize: 12, color: 'var(--ink)' }}>{selected.homeTeam.abbreviation}</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    {sim.state !== 'pre' ? (
                      <>
                        <div className="serif tnum" style={{ fontSize: 20, color: 'var(--ink)' }}>{sim.homeScore} – {sim.awayScore}</div>
                        {sim.hasPens && sim.state === 'post' && <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)' }}>{sim.penHome} – {sim.penAway} pens</div>}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 3 }}>
                          {sim.state === 'in' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />}
                          <span className="mono" style={{ fontSize: 7, color: stateColor(sim.state) }}>{sim.state === 'in' ? `LIVE · ${sim.clock}` : 'FT'}</span>
                        </div>
                      </>
                    ) : (
                      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>PRE</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span className="serif" style={{ fontSize: 12, color: 'var(--ink)' }}>{selected.awayTeam.abbreviation}</span>
                    <img src={selected.awayTeam.logo} alt="" width={20} height={20} style={{ width: 20, height: 20, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                  </div>
                </div>
              </div>

              <button type="button" onClick={() => router.push(`/match/${selected.id}`)} className="mono" style={{ padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'var(--paper-2)', color: 'var(--ink)', fontSize: 9, letterSpacing: '0.1em', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                OPEN REAL MATCH PAGE →
              </button>

              {/* Goal celebration */}
              <div style={{ borderTop: '1px solid var(--rule-soft)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div className="mono" style={{ fontSize: 8, letterSpacing: '0.12em', color: 'var(--ink-3)' }}>FIRE GOAL</div>

                {/* Selected player display */}
                {playerName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
                    <span style={{ fontSize: 20 }}>{flag || '🏳'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{playerName}</div>
                      <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)' }}>
                        {scoringSide === 'home' ? selected.homeTeam.abbreviation : selected.awayTeam.abbreviation} · #{number}
                      </div>
                    </div>
                    <button type="button" onClick={() => setPlayerName('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--ink-3)', padding: '0 2px' }}>×</button>
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', background: 'var(--paper-2)', borderRadius: 8, textAlign: 'center' }}>
                    <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>← Pick a player from the squad</span>
                  </div>
                )}

                {/* Side toggle */}
                <div style={{ display: 'flex', gap: 5 }}>
                  {(['home', 'away'] as const).map(s => (
                    <button key={s} type="button" onClick={() => setScoringSide(s)} style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', cursor: 'pointer', background: scoringSide === s ? 'var(--pulse)' : 'var(--paper-2)', color: scoringSide === s ? '#fff' : 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em' }}>
                      {s === 'home' ? selected.homeTeam.abbreviation : selected.awayTeam.abbreviation}
                    </button>
                  ))}
                </div>

                {/* Manual overrides */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px', gap: 6 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span className="mono" style={{ fontSize: 7, color: 'var(--ink-3)' }}>PLAYER NAME</span>
                    <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Pick from squad →" style={{ padding: '6px 8px', borderRadius: 6, border: 'none', background: 'var(--paper-2)', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span className="mono" style={{ fontSize: 7, color: 'var(--ink-3)' }}>FLAG</span>
                    <input type="text" value={flag} onChange={e => setFlag(e.target.value)} style={{ padding: '6px', borderRadius: 6, border: 'none', background: 'var(--paper-2)', fontSize: 18, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span className="mono" style={{ fontSize: 7, color: 'var(--ink-3)' }}>JERSEY</span>
                    <input type="number" min={1} max={99} value={number} onChange={e => setNumber(parseInt(e.target.value, 10) || 9)} style={{ padding: '6px', borderRadius: 6, border: 'none', background: 'var(--paper-2)', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span className="mono" style={{ fontSize: 7, color: 'var(--ink-3)' }}>MINUTE</span>
                    <input type="number" min={1} max={120} value={minute} onChange={e => setMinute(parseInt(e.target.value, 10) || 45)} style={{ padding: '6px', borderRadius: 6, border: 'none', background: 'var(--paper-2)', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span className="mono" style={{ fontSize: 7, color: 'var(--ink-3)' }}>ASSIST</span>
                    <input type="text" value={assist} onChange={e => setAssist(e.target.value)} placeholder="Name" style={{ padding: '6px', borderRadius: 6, border: 'none', background: 'var(--paper-2)', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }} />
                  </label>
                </div>

                {/* Animation */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                  {GOAL_VARIANTS.map(v => (
                    <button key={v} type="button" onClick={() => setVariant(v)} style={{ padding: '6px', borderRadius: 6, border: 'none', cursor: 'pointer', background: variant === v ? '#1d4ed8' : 'var(--paper-2)', color: variant === v ? '#fff' : 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {v}
                    </button>
                  ))}
                </div>

                {/* CR7 Easter egg preset */}
                <button
                  type="button"
                  onClick={() => {
                    setPlayerName(CR7_PRESET.playerName);
                    setNumber(CR7_PRESET.number);
                    setFlag(CR7_PRESET.flag);
                    setAssist(CR7_PRESET.assist);
                    setMinute(CR7_PRESET.minute);
                    setVariant('siuuu');
                    setScoringSide('home');
                  }}
                  style={{ padding: '8px 0', borderRadius: 7, border: '2px solid #E10600', cursor: 'pointer', background: 'linear-gradient(135deg, #006600, #E10600)', color: '#FFD700', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  🇵🇹 CR7 SIUUU PRESET
                </button>

                <button
                  type="button"
                  onClick={handleFire}
                  disabled={!playerName}
                  style={{ padding: '10px 0', borderRadius: 8, border: 'none', cursor: playerName ? 'pointer' : 'not-allowed', opacity: playerName ? 1 : 0.5, background: 'linear-gradient(135deg, #e63c3c, #c0392b)', color: '#fff', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', fontWeight: 700, boxShadow: playerName ? '0 4px 12px rgba(230,60,60,0.35)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <span>⚽</span> FIRE GOAL CELEBRATION
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type AdminTab = 'monitor' | 'simulate';

export default function AdminDashboard() {
  const isMobile = useIsMobile();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>('monitor');
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const handleMapLoad = useCallback(() => setIsMapLoaded(true), []);

  const { fireGoal, celebrationNode } = useGoalCelebration();
  const [goalFiredForVenueId, setGoalFiredForVenueId] = useState<string | null>(null);
  const goalFiredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFireGoal = useCallback((data: GoalData, venueId: string | undefined, variant: GoalVariant) => {
    fireGoal(data, variant);
    setGoalFiredForVenueId(venueId ?? null);
    posthog.capture?.('admin_goal_celebration_fired', { variant, minute: data.minute, player: `${data.given} ${data.surname}`.trim() });
    if (goalFiredTimerRef.current) clearTimeout(goalFiredTimerRef.current);
    goalFiredTimerRef.current = setTimeout(() => setGoalFiredForVenueId(null), 6000);
  }, [fireGoal]);

  useEffect(() => () => {
    if (goalFiredTimerRef.current) clearTimeout(goalFiredTimerRef.current);
  }, []);

  // Fetch all WC2026 matches, refresh every 60s
  const loadMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/scores', { cache: 'no-store' });
      const data = await res.json();
      setMatches(data.matches ?? []);
      setLastRefresh(new Date());
    } catch {
      // keep stale data on error
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
    const id = setInterval(loadMatches, 60_000);
    return () => clearInterval(id);
  }, [loadMatches]);

  const stats = useMemo(() => ({
    total: matches.length,
    live: matches.filter(m => m.state === 'in').length,
    finished: matches.filter(m => m.state === 'post').length,
    upcoming: matches.filter(m => m.state === 'pre').length,
  }), [matches]);

  const pad = isMobile ? '20px 16px' : '32px 40px';

  const TAB_ITEMS: { key: AdminTab; label: string }[] = [
    { key: 'monitor', label: 'Monitor' },
    { key: 'simulate', label: 'Simulate' },
  ];

  return (
    <div className="screen" style={{ minHeight: '100vh', background: 'var(--paper-2)' }}>

      {celebrationNode}

      {/* Top bar */}
      <div style={{ padding: isMobile ? '14px 16px' : '18px 40px', background: 'var(--paper)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="serif" style={{ fontSize: isMobile ? 20 : 26, lineHeight: 1, margin: 0 }}>Admin Dashboard</h1>
          <span className="mono" style={{ fontSize: 8, padding: '3px 8px', borderRadius: 3, background: 'rgba(255,200,0,0.15)', color: '#b8860b', letterSpacing: '0.14em' }}>DEV ONLY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastRefresh && (
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>{lastRefresh.toLocaleTimeString()}</span>
          )}
          <Link href="/" style={{ padding: '0 14px', height: 34, display: 'inline-flex', alignItems: 'center', borderRadius: 8, background: 'var(--paper-2)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', fontSize: 10, fontFamily: 'var(--mono)', textDecoration: 'none', color: 'var(--ink)', letterSpacing: '0.08em' }}>
            ← Home
          </Link>
        </div>
      </div>

      <div style={{ padding: pad }}>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: isMobile ? 20 : 24, flexWrap: 'wrap' }}>
          <StatCard label="TOTAL" value={stats.total} />
          <StatCard label="LIVE" value={stats.live} accent="var(--live)" />
          <StatCard label="FINISHED" value={stats.finished} accent="var(--ink-3)" />
          <StatCard label="UPCOMING" value={stats.upcoming} accent="#6366f1" />
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: isMobile ? 20 : 24, background: 'var(--paper)', borderRadius: 10, padding: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', width: 'fit-content' }}>
          {TAB_ITEMS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="mono"
              style={{
                padding: '8px 20px', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: activeTab === tab.key ? 'var(--pulse)' : 'transparent',
                color: activeTab === tab.key ? '#fff' : 'var(--ink-3)',
                fontSize: 10, letterSpacing: '0.12em', fontWeight: activeTab === tab.key ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {tab.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Monitor tab */}
        {activeTab === 'monitor' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: isMobile ? 20 : 24, alignItems: 'start' }}>

            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 24 }}>

              {/* Map */}
              <section>
                <div className="mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--ink-3)', marginBottom: 10 }}>WC2026 VENUES</div>
                <div style={{ position: 'relative', height: isMobile ? 260 : 380, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
                  {!isMapLoaded && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper-2)' }}>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em' }}>Loading map…</span>
                    </div>
                  )}
                  <Map center={[-96.5, 39.0] as [number, number]} zoom={isMobile ? 2.7 : 3} minZoom={2.5} maxZoom={12} theme="light">
                    <MapLoadedObserver onLoad={handleMapLoad} />
                    <WC2026VenueMarkers
                      matches={matches}
                      goalFiredForVenueId={goalFiredForVenueId}
                      onNavigate={id => router.push(`/match/${id}`)}
                    />
                    <MapControls position="bottom-right" showZoom />
                  </Map>
                  <div style={{ position: 'absolute', bottom: 12, left: 14, zIndex: 10, pointerEvents: 'none' }}>
                    <span className="mono" style={{ fontSize: 8, letterSpacing: '0.16em', color: 'var(--ink-3)', background: 'rgba(255,255,255,0.88)', borderRadius: 4, padding: '3px 7px', backdropFilter: 'blur(4px)' }}>
                      PITCHPULSE · WC2026
                    </span>
                  </div>
                </div>
              </section>

              {/* Match list */}
              <MatchListPanel
                matches={matches}
                loading={matchesLoading}
                onNavigate={id => router.push(`/match/${id}`)}
              />
            </div>

            {/* Right sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <GoalTestPanel matches={matches} onFireGoal={handleFireGoal} />
              <ServiceHealthPanel />
            </div>
          </div>
        )}

        {/* Simulate tab */}
        {activeTab === 'simulate' && (
          <SimulateTab matches={matches} onFireGoal={handleFireGoal} />
        )}
      </div>
    </div>
  );
}
