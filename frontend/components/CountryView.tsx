'use client';

import Link from 'next/link';
import { countries, stadiums, matches } from '@/lib/data';
import { BackBar } from './Shared';
import type { CountryCode } from '@/lib/types';

export function CountryView({ code }: { code: string }) {
  const c = countries[code as CountryCode];
  if (!c) return <div style={{ padding: 60 }}>Country not found</div>;
  const cs = stadiums.filter((s) => s.country === code);
  const matchesHere = matches.filter((m) => cs.some((s) => s.id === m.stadium));

  return (
    <div className="screen">
      <BackBar label={`HOST NATION · ${c.code}`} />

      <div style={{
        position: 'relative',
        padding: '64px 56px',
        background: `linear-gradient(135deg, ${c.colors[0]} 0%, ${c.colors[1] || c.colors[0]} 100%)`,
        color: '#fff', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '6px 6px', opacity: 0.5 }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 48, alignItems: 'flex-end' }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', opacity: 0.85 }}>HOST NATION</div>
            <div className="serif" style={{ fontSize: 120, lineHeight: 0.92, marginTop: 14, letterSpacing: '-0.03em' }}>{c.name}</div>
            <div className="serif it" style={{ fontSize: 26, marginTop: 18, opacity: 0.9 }}>&ldquo;{c.tagline}&rdquo;</div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.3)', paddingLeft: 28 }}>
            <KV label="Cities" v={cs.length} />
            <KV label="Stadia" v={cs.length} />
            <KV label="Population" v={c.population} />
            <KV label="Time zones" v={c.timezones} />
            <KV label="Matches hosted" v={matchesHere.length} />
          </div>
        </div>
      </div>

      <div style={{ padding: '48px 56px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
        <div>
          <div className="eyebrow">What to eat</div>
          <div className="serif it" style={{ fontSize: 26, marginTop: 6, marginBottom: 22 }}>Food worth a detour</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {c.food.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 18, alignItems: 'flex-start', borderTop: '1px solid var(--rule-soft)', paddingTop: 18 }}>
                <div className="mono" style={{ width: 30, fontSize: 11, color: 'var(--ink-3)' }}>{String(i + 1).padStart(2, '0')}</div>
                <div>
                  <div className="serif" style={{ fontSize: 22 }}>{f.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>{f.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="eyebrow">Culture brief</div>
          <div className="serif it" style={{ fontSize: 26, marginTop: 6, marginBottom: 22 }}>Three things to know</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {c.culture.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 18, alignItems: 'flex-start', borderTop: '1px solid var(--rule-soft)', paddingTop: 18 }}>
                <div className="serif" style={{ width: 40, fontSize: 36, color: c.colors[0], lineHeight: 0.9 }}>{String(i + 1).padStart(2, '0')}</div>
                <div className="serif" style={{ fontSize: 18, lineHeight: 1.35 }}>{f}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32, padding: 22, background: 'var(--ink)', color: 'var(--paper)', borderRadius: 12 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', opacity: 0.65 }}>FAN FACT</div>
            <div className="serif it" style={{ fontSize: 20, marginTop: 8 }}>{c.fanFact}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 56px 64px' }}>
        <div className="eyebrow">{cs.length} {cs.length === 1 ? 'stadium' : 'stadia'} in {c.name}</div>
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {cs.map((s) => (
            <Link key={s.id} href={`/stadium/${s.id}`} style={{
              cursor: 'pointer', textDecoration: 'none', color: 'inherit',
              padding: 18, border: '1px solid var(--rule)', borderRadius: 12,
              background: 'var(--paper-2)', display: 'block',
            }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em' }}>{s.city.toUpperCase()}</div>
              <div className="serif" style={{ fontSize: 22, marginTop: 6 }}>{s.name}</div>
              <div className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
                CAP {s.capacity.toLocaleString()} · {s.opened}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function KV({ label, v }: { label: string; v: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.18)', fontFamily: 'var(--mono)' }}>
      <span style={{ fontSize: 10, letterSpacing: '0.16em', opacity: 0.7 }}>{label.toUpperCase()}</span>
      <span style={{ fontSize: 13 }}>{v}</span>
    </div>
  );
}
