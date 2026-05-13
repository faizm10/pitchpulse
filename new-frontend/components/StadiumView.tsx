'use client';

import { useState } from 'react';
import Link from 'next/link';
import { stadiums, matches, teams, stadiumViews } from '@/lib/data';
import { Flag, BackBar, Stat } from './Shared';
import type { Stadium } from '@/lib/types';

type Face = 'seating' | 'pitch' | 'fan';

export function StadiumView({ id }: { id: string }) {
  const s = stadiums.find((x) => x.id === id);
  const [face, setFace] = useState<Face>('seating');
  if (!s) return <div style={{ padding: 60 }}>Stadium not found</div>;
  const matchHere = matches.find((m) => m.stadium === s.id);

  return (
    <div className="screen" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <BackBar label={`${s.country === 'CA' ? 'CANADA' : s.country === 'MX' ? 'MEXICO' : 'UNITED STATES'} · STADIUM`} />

      <div style={{ padding: '48px 56px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div className="stadium-card">
            <div className="stadium-card-inner" style={{
              transform: face === 'pitch' ? 'rotateY(180deg)' : face === 'fan' ? 'rotateY(360deg)' : 'rotateY(0deg)',
            }}>
              <div className="stadium-face">
                <FaceVisual face="seating" stadium={s} />
              </div>
              <div className="stadium-face" style={{ transform: 'rotateY(180deg)' }}>
                <FaceVisual face="pitch" stadium={s} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['seating', 'pitch', 'fan'] as const).map((f) => (
              <button key={f} onClick={() => setFace(f)} className="btn" style={{
                background: face === f ? 'var(--ink)' : 'transparent',
                color: face === f ? 'var(--paper)' : 'var(--ink)',
                border: '1px solid var(--rule)',
              }}>{f.toUpperCase()}</button>
            ))}
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em' }}>
            {stadiumViews[face === 'fan' ? 'fan' : face].detail}
          </div>
        </div>

        <div>
          <div className="eyebrow">Stadium · {s.city.toUpperCase()}</div>
          <div className="headline" style={{ fontSize: 56, marginTop: 8 }}>{s.name}</div>
          <div className="serif it" style={{ fontSize: 20, color: 'var(--ink-3)', marginTop: 14, maxWidth: 480 }}>
            Built {s.opened} · {s.surface.toLowerCase()} · capacity {s.capacity.toLocaleString()}.
          </div>

          <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, borderTop: '1px solid var(--rule)', paddingTop: 22 }}>
            <Stat n={s.capacity.toLocaleString()} l="Capacity" />
            <Stat n={s.opened} l="Opened" />
            <Stat n={s.orientation} l="Orientation" />
          </div>

          {matchHere && (
            <div style={{ marginTop: 32, padding: 20, border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--paper-2)' }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)' }}>
                {matchHere.status === 'live' ? `LIVE · ${matchHere.minute}'` : matchHere.status === 'ft' ? 'FULL TIME' : 'NEXT FIXTURE'}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <Flag code={matchHere.home} w={32} h={20} />
                <span className="serif" style={{ fontSize: 24 }}>{teams[matchHere.home]?.name}</span>
                {matchHere.score ? (
                  <span className="serif tnum" style={{ fontSize: 26, margin: '0 8px' }}>{matchHere.score[0]}–{matchHere.score[1]}</span>
                ) : (
                  <span className="mono" style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 8px' }}>VS</span>
                )}
                <span className="serif" style={{ fontSize: 24 }}>{teams[matchHere.away]?.name}</span>
                <Flag code={matchHere.away} w={32} h={20} />
              </div>
              <Link href={`/match/${matchHere.id}`} className="btn" style={{ marginTop: 14, display: 'inline-flex', textDecoration: 'none' }}>OPEN MATCH →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FaceVisual({ face, stadium }: { face: Face; stadium: Stadium }) {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--paper-2)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(rgba(14,22,38,0.08) 1px, transparent 1px)', backgroundSize: '4px 4px', opacity: 0.3 }} />
      <svg viewBox="0 0 640 440" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {face === 'seating' && (
          <g>
            {[1, 2, 3, 4, 5].map((i) => (
              <ellipse key={i} cx={320} cy={220}
                rx={80 + i * 36} ry={50 + i * 22}
                fill="none" stroke="var(--ink)"
                strokeWidth={i === 5 ? 1.5 : 0.6}
                strokeOpacity={i === 5 ? 0.6 : 0.18 + i * 0.05} />
            ))}
            {[...Array(24)].map((_, i) => {
              const a = (i / 24) * Math.PI * 2;
              return (
                <line key={i}
                  x1={320 + Math.cos(a) * 84} y1={220 + Math.sin(a) * 54}
                  x2={320 + Math.cos(a) * 250} y2={220 + Math.sin(a) * 160}
                  stroke="var(--ink)" strokeWidth="0.4" strokeOpacity="0.18" />
              );
            })}
            <ellipse cx={320} cy={220} rx={80} ry={50} fill="var(--paper)" stroke="var(--ink)" strokeWidth="1" />
            <line x1={320} y1={170} x2={320} y2={270} stroke="var(--ink)" strokeWidth="0.6" />
            <circle cx={320} cy={220} r="9" fill="none" stroke="var(--ink)" strokeWidth="0.6" />
            <text x={320} y={414} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-3)" letterSpacing="0.18em">
              SEATING BOWL · 11 TIERS · {stadium.capacity.toLocaleString()} CAP
            </text>
          </g>
        )}
        {face === 'pitch' && (
          <g>
            <rect x={120} y={80} width={400} height={280} fill="#256E3D" stroke="var(--ink)" strokeWidth="1.2" />
            {[0,1,2,3,4,5,6].map((i) => (
              <rect key={i} x={120} y={80 + i * 40} width={400} height={20} fill="rgba(255,255,255,0.04)" />
            ))}
            <line x1={320} y1={80} x2={320} y2={360} stroke="white" strokeWidth="1.2" />
            <circle cx={320} cy={220} r="42" fill="none" stroke="white" strokeWidth="1.2" />
            <circle cx={320} cy={220} r="2" fill="white" />
            <rect x={120} y={140} width={60} height={160} fill="none" stroke="white" strokeWidth="1.2" />
            <rect x={460} y={140} width={60} height={160} fill="none" stroke="white" strokeWidth="1.2" />
            <rect x={120} y={180} width={24} height={80} fill="none" stroke="white" strokeWidth="1.2" />
            <rect x={496} y={180} width={24} height={80} fill="none" stroke="white" strokeWidth="1.2" />
            <g transform="translate(560, 110)">
              <circle r="22" fill="var(--paper)" stroke="var(--ink)" strokeWidth="0.8" />
              <text textAnchor="middle" y="4" fontFamily="var(--mono)" fontSize="11" fill="var(--ink)">N</text>
            </g>
            <text x={320} y={400} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-3)" letterSpacing="0.18em">
              PITCH · 105m × 68m · {stadium.surface.toUpperCase()}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
