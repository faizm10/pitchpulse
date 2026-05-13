'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { stadiums, matches, teams, countries } from '@/lib/data';
import { useTweaks } from './Providers';
import type { Stadium, Match } from '@/lib/types';

// Map projection: equirectangular over our bbox
const BBOX = { latMin: 13, latMax: 53, lngMin: -128, lngMax: -65 };
const MAP_W = 1100;
const MAP_H = 800;
const project = (lat: number, lng: number) => ({
  x: ((lng - BBOX.lngMin) / (BBOX.lngMax - BBOX.lngMin)) * MAP_W,
  y: ((BBOX.latMax - lat) / (BBOX.latMax - BBOX.latMin)) * MAP_H,
});

// Background dot field
const DOT_FIELD = (() => {
  const dots: { x: number; y: number }[] = [];
  const stepX = MAP_W / 64;
  const stepY = MAP_H / 42;
  for (let i = 0; i <= 64; i++) {
    for (let j = 0; j <= 42; j++) {
      const jx = Math.sin(i * 7.3 + j * 3.1) * 0.5 * 4;
      const jy = Math.cos(i * 1.9 + j * 4.7) * 0.5 * 4;
      dots.push({ x: i * stepX + jx, y: j * stepY + jy });
    }
  }
  return dots;
})();

const TOPO_HUBS = [
  { lat: 45, lng: -100 },
  { lat: 23, lng: -102 },
  { lat: 51, lng: -100 },
];

interface ActivePulse {
  id: number;
  stadium: Stadium;
  match: Match;
  team: string;
  scorer: string;
  minute: number;
}

export function MapView() {
  const router = useRouter();
  const { tweaks, setTweak } = useTweaks();
  const [hoverStadium, setHoverStadium] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [activePulse, setActivePulse] = useState<ActivePulse | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const live = matches.filter((m) => m.status === 'live');
    const fire = () => {
      const m = live[Math.floor(Math.random() * live.length)];
      const stadium = stadiums.find((s) => s.id === m.stadium);
      if (!stadium) return;
      const team = Math.random() > 0.5 ? m.home : m.away;
      setActivePulse({
        id: Math.random(),
        stadium,
        match: m,
        team,
        scorer: ['Mbappé','Vinícius','Messi','Bellingham','Foden','Kane'][Math.floor(Math.random() * 6)],
        minute: m.minute,
      });
      setTimeout(() => setActivePulse(null), 4200);
    };
    const t = setInterval(fire, 6500);
    const initial = setTimeout(fire, 900);
    return () => { clearInterval(t); clearTimeout(initial); };
  }, []);

  const mapStyle = tweaks.mapStyle;

  return (
    <div className="map-pane">
      <div style={{
        position: 'absolute', zIndex: 2,
        top: 28, left: 32, right: 32,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        pointerEvents: 'none',
      }}>
        <div>
          <div className="eyebrow">North America · Day 18 of 39</div>
          <div className="headline" style={{ marginTop: 8, maxWidth: 720 }}>
            Four matches running. <em>Three continents</em> watching.
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 10, letterSpacing: '0.08em' }}>
            UPDATED LIVE
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <Chip label="DOTS" active={mapStyle === 'dots'} onClick={() => setTweak('mapStyle', 'dots')} />
          <Chip label="TOPO" active={mapStyle === 'topo'} onClick={() => setTweak('mapStyle', 'topo')} />
          <Chip label="LINK" active={mapStyle === 'link'} onClick={() => setTweak('mapStyle', 'link')} />
        </div>
      </div>

      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <line x1="40" y1="60" x2={MAP_W - 40} y2="60" stroke="var(--rule-soft)" strokeWidth="0.5" strokeDasharray="2 6" />
        <line x1="40" y1={MAP_H - 60} x2={MAP_W - 40} y2={MAP_H - 60} stroke="var(--rule-soft)" strokeWidth="0.5" strokeDasharray="2 6" />
        <line x1="60" x2={MAP_W - 60} y1={project(49, -100).y} y2={project(49, -100).y} stroke="var(--rule-soft)" strokeWidth="0.5" strokeDasharray="3 8" />
        <line x1="60" x2={MAP_W - 60} y1={project(32, -100).y} y2={project(32, -100).y} stroke="var(--rule-soft)" strokeWidth="0.5" strokeDasharray="3 8" />

        {mapStyle === 'dots' && (
          <g>
            {DOT_FIELD.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r="0.9" fill="var(--ink)" opacity={0.08} />
            ))}
          </g>
        )}
        {mapStyle === 'topo' && (
          <g opacity="0.55">
            {TOPO_HUBS.flatMap((h, hi) => {
              const c = project(h.lat, h.lng);
              return [...Array(7)].map((_, ri) => (
                <circle
                  key={`${hi}-${ri}`}
                  cx={c.x} cy={c.y}
                  r={70 + ri * 60}
                  stroke="var(--ink)" strokeWidth="0.6" strokeOpacity="0.14"
                  fill="none"
                  strokeDasharray={ri % 2 === 0 ? '0' : '4 6'}
                />
              ));
            })}
          </g>
        )}
        {mapStyle === 'link' && (
          <g opacity="0.45">
            {stadiums.flatMap((s, i) =>
              stadiums.slice(i + 1).map((t) => {
                if (Math.abs(s.lat - t.lat) > 12 && Math.abs(s.lng - t.lng) > 18) return null;
                const a = project(s.lat, s.lng), b = project(t.lat, t.lng);
                return (
                  <line key={`${s.id}-${t.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="var(--ink)" strokeWidth="0.5" strokeOpacity="0.18" />
                );
              })
            )}
          </g>
        )}

        <g style={{ fontFamily: 'var(--serif)', fill: 'var(--ink)', opacity: 0.16, fontSize: 56, letterSpacing: '0.2em', fontStyle: 'italic', textAnchor: 'middle' }}>
          <text x={project(53, -98).x} y={project(53, -98).y - 8}>CANADA</text>
          <text x={project(40, -98).x} y={project(40, -98).y}>UNITED STATES</text>
          <text x={project(23, -100).x} y={project(23, -100).y + 20}>MÉXICO</text>
        </g>

        {stadiums.map((s) => {
          const p = project(s.lat, s.lng);
          const match = matches.find((m) => m.stadium === s.id && m.status === 'live');
          const upcoming = matches.find((m) => m.stadium === s.id && m.status === 'upcoming');
          const ft = matches.find((m) => m.stadium === s.id && m.status === 'ft');
          const state: 'live' | 'upcoming' | 'ft' | 'idle' = match ? 'live' : (upcoming ? 'upcoming' : ft ? 'ft' : 'idle');
          return (
            <StadiumMarker
              key={s.id}
              s={s} p={p} state={state}
              tick={tick}
              hover={hoverStadium === s.id}
              onMouseEnter={() => setHoverStadium(s.id)}
              onMouseLeave={() => setHoverStadium(null)}
              onClick={() => router.push(match ? `/match/${match.id}` : `/stadium/${s.id}`)}
            />
          );
        })}

        {activePulse && <GoalPulse pulse={activePulse} />}
      </svg>

      {hoverStadium && (() => {
        const s = stadiums.find((x) => x.id === hoverStadium);
        if (!s) return null;
        const p = project(s.lat, s.lng);
        return (
          <div className="map-tooltip" style={{ left: `${(p.x / MAP_W) * 100}%`, top: `${(p.y / MAP_H) * 100}%` }}>
            <span style={{ color: 'var(--paper)', fontWeight: 500 }}>{s.city}</span> · {s.name}
          </div>
        );
      })()}

      {activePulse && <GoalBanner pulse={activePulse} />}

      <div style={{
        position: 'absolute', zIndex: 2,
        left: 32, right: 32, bottom: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          {([['CA', 'Canada', 'ca'], ['US', 'USA', 'us'], ['MX', 'Mexico', 'mx']] as const).map(([code, name, css]) => (
            <a
              key={code}
              href={`/country/${code}`}
              onClick={(e) => { e.preventDefault(); router.push(`/country/${code}`); }}
              style={{
                cursor: 'pointer', textDecoration: 'none', color: 'inherit',
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', border: '1px solid var(--rule)', borderRadius: 999,
                background: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: 11,
                letterSpacing: '0.08em',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: `var(--${css})` }} />
              {name.toUpperCase()} · {countries[code].cities.length}
            </a>
          ))}
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          16 stadia · 3 nations · 104 matches
        </div>
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      cursor: 'pointer',
      background: active ? 'var(--ink)' : 'var(--paper)',
      color: active ? 'var(--paper)' : 'var(--ink-2)',
      border: '1px solid var(--rule)',
      padding: '6px 12px', borderRadius: 999,
      fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
    }}>{label}</button>
  );
}

function StadiumMarker({ s, p, state, tick, hover, onMouseEnter, onMouseLeave, onClick }: {
  s: Stadium;
  p: { x: number; y: number };
  state: 'live' | 'upcoming' | 'ft' | 'idle';
  tick: number;
  hover: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  const isLive = state === 'live';
  const isUpcoming = state === 'upcoming';
  const isFt = state === 'ft';
  const r = hover ? 7 : 5;
  const fill = isLive ? 'var(--pulse)' : isUpcoming ? 'var(--ink)' : isFt ? 'var(--ink-3)' : 'var(--ink)';
  return (
    <g style={{ cursor: 'pointer' }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick}>
      <circle cx={p.x} cy={p.y} r="28" fill="transparent" />
      {isLive && (
        <circle cx={p.x} cy={p.y} r="6" fill="none" stroke="var(--pulse)" strokeWidth="1">
          <animate attributeName="r" from="6" to="22" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.7" to="0" dur="1.8s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={p.x} cy={p.y} r={r + 4} fill="var(--paper)" />
      <circle cx={p.x} cy={p.y} r={r} fill={fill} />
      {isUpcoming && <circle cx={p.x} cy={p.y} r={r - 2} fill="var(--paper)" />}
      <text x={p.x + 12} y={p.y + 4} fontFamily="var(--mono)" fontSize="10" fill={hover ? 'var(--ink)' : 'var(--ink-2)'} opacity={hover ? 1 : 0.85}>
        {s.city}
      </text>
    </g>
  );
}

function GoalPulse({ pulse }: { pulse: ActivePulse }) {
  const p = project(pulse.stadium.lat, pulse.stadium.lng);
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={p.x} cy={p.y} r="6" fill="none" stroke="var(--pulse)" strokeWidth="2">
          <animate attributeName="r" from="6" to="120" begin={`${i * 0.4}s`} dur="2.4s" fill="freeze" />
          <animate attributeName="opacity" from="0.9" to="0" begin={`${i * 0.4}s`} dur="2.4s" fill="freeze" />
          <animate attributeName="stroke-width" from="3" to="0.4" begin={`${i * 0.4}s`} dur="2.4s" fill="freeze" />
        </circle>
      ))}
      <circle cx={p.x} cy={p.y} r="10" fill="var(--pulse)">
        <animate attributeName="r" from="14" to="9" dur="0.5s" />
      </circle>
    </g>
  );
}

function GoalBanner({ pulse }: { pulse: ActivePulse }) {
  const team = teams[pulse.team];
  const m = pulse.match;
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)', zIndex: 5,
      background: 'var(--ink)', color: 'var(--paper)',
      padding: '20px 28px', borderRadius: 16,
      display: 'flex', alignItems: 'center', gap: 16,
      boxShadow: '0 24px 60px rgba(14,22,38,0.35)',
      animation: 'screen-in 280ms ease-out',
      fontFamily: 'var(--serif)',
      minWidth: 360,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'var(--pulse)', display: 'grid', placeItems: 'center',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
      }}>GOAL</div>
      <div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', opacity: 0.6 }}>
          {pulse.minute}&apos; · {pulse.stadium.city.toUpperCase()}
        </div>
        <div style={{ fontSize: 26, lineHeight: 1.1, marginTop: 4 }}>
          <span style={{ color: 'var(--pulse)' }}>{pulse.scorer}</span> · {team?.name}
        </div>
        {m.score && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, marginTop: 6, opacity: 0.7 }}>
            {teams[m.home]?.name} {m.score[0]}–{m.score[1]} {teams[m.away]?.name}
          </div>
        )}
      </div>
    </div>
  );
}
