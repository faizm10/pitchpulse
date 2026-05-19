'use client';

import Link from 'next/link';
import { teams } from '@/lib/data';
import { Flag, BackBar } from './Shared';
import { useMyTeam } from './Providers';

export function MyWorldCup() {
  const { myTeam, setMyTeam } = useMyTeam();
  const all = Object.values(teams);

  return (
    <div className="screen" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <BackBar label="MY WORLD CUP" />
      <div style={{ padding: '48px 56px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
        <div>
          <div className="eyebrow">My World Cup</div>
          <div className="headline" style={{ fontSize: 64, marginTop: 12 }}>
            Pick a team.<br /><em>The whole app adapts.</em>
          </div>
          <div className="serif it" style={{ fontSize: 19, color: 'var(--ink-3)', marginTop: 22, maxWidth: 480, lineHeight: 1.5 }}>
            Your team&apos;s matches get pinned to the top. The map highlights their stadiums. The AI summarizes their performance for you — like a friend texting you the bits you care about.
          </div>
          {myTeam && teams[myTeam] && (
            <div style={{ marginTop: 32, padding: 22, background: 'var(--ink)', color: 'var(--paper)', borderRadius: 12 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', opacity: 0.65 }}>CURRENTLY FOLLOWING</div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
                <Flag code={myTeam} w={56} h={36} />
                <div>
                  <div className="serif" style={{ fontSize: 32 }}>{teams[myTeam].name}</div>
                  <div className="mono" style={{ fontSize: 11, marginTop: 4, opacity: 0.65, letterSpacing: '0.14em' }}>GROUP {teams[myTeam].group}</div>
                </div>
              </div>
              <button onClick={() => setMyTeam(null)} style={{
                marginTop: 16, background: 'transparent', border: '1px solid rgba(242,238,227,0.3)',
                color: 'var(--paper)', padding: '8px 14px', borderRadius: 999,
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', cursor: 'pointer',
              }}>CLEAR</button>
            </div>
          )}
        </div>

        <div>
          <div className="eyebrow">All teams · 24 of 48 shown</div>
          <div style={{
            marginTop: 18,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 8, maxHeight: 560, overflow: 'auto', paddingRight: 4,
          }}>
            {all.map((t) => (
              <div key={t.code} onClick={() => setMyTeam(t.code)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setMyTeam(t.code); }} style={{
                padding: 14, border: '1px solid var(--rule)', borderRadius: 10,
                background: myTeam === t.code ? 'var(--ink)' : 'var(--paper)',
                color: myTeam === t.code ? 'var(--paper)' : 'inherit',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'all 150ms ease',
              }}>
                <Flag code={t.code} w={24} h={16} />
                <div style={{ minWidth: 0 }}>
                  <Link
                    href={`/team/${t.code}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: 'inherit',
                      textDecoration: 'none',
                      display: 'block',
                    }}
                  >
                    {t.name}
                  </Link>
                  <div className="mono" style={{ fontSize: 9, opacity: 0.6, letterSpacing: '0.08em' }}>GRP {t.group}</div>
                </div>
              </div>
            ))}
          </div>
          {myTeam && (
            <Link href="/" className="btn btn-pulse" style={{ marginTop: 18, display: 'inline-flex', textDecoration: 'none' }}>
              SEE MY DASHBOARD →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
