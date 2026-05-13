'use client';

import { topScorers, topAssists, topCards, teams } from '@/lib/data';
import { Flag, Big } from './Shared';

export function Stats() {
  const maxGoals = Math.max(...topScorers.map((s) => s.goals));

  return (
    <div className="screen">
      <div style={{ padding: '40px 56px 24px', borderBottom: '1px solid var(--rule)' }}>
        <div className="eyebrow">Statistics · Tournament so far</div>
        <div className="headline" style={{ fontSize: 64, marginTop: 8 }}>
          The numbers <em>behind the noise.</em>
        </div>
      </div>

      <div style={{ padding: '40px 56px 64px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 48 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid var(--rule)', paddingBottom: 12, marginBottom: 18 }}>
            <div className="serif" style={{ fontSize: 32, fontStyle: 'italic' }}>Top scorers</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>GOLDEN BOOT RACE</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {topScorers.map((s) => (
              <div key={s.rank} style={{
                display: 'grid',
                gridTemplateColumns: '36px 32px auto 1fr auto auto auto',
                alignItems: 'center', gap: 14, padding: '14px 0',
                borderTop: '1px solid var(--rule-soft)',
              }}>
                <div className="serif tnum" style={{ fontSize: 22, color: s.rank === 1 ? 'var(--pulse)' : 'var(--ink-2)' }}>
                  {String(s.rank).padStart(2, '0')}
                </div>
                <Flag code={s.team} w={24} h={16} />
                <div className="serif" style={{ fontSize: 18 }}>{s.player}</div>
                <div style={{ height: 8, background: 'var(--rule-soft)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${(s.goals / maxGoals) * 100}%`, background: 'var(--pulse)' }} />
                </div>
                <div className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)', width: 56, textAlign: 'right' }}>xG {s.xg.toFixed(1)}</div>
                <div className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)', width: 30, textAlign: 'right' }}>A {s.assists}</div>
                <div className="serif tnum" style={{ fontSize: 24, width: 40, textAlign: 'right' }}>{s.goals}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          <div>
            <div className="eyebrow">Top assists</div>
            <div className="serif it" style={{ fontSize: 24, marginTop: 6, marginBottom: 14 }}>Playmakers</div>
            <div>
              {topAssists.map((a) => (
                <div key={a.rank} style={{ display: 'grid', gridTemplateColumns: '24px auto 1fr auto auto', gap: 10, alignItems: 'center', padding: '10px 0', borderTop: '1px dashed var(--rule-soft)' }}>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{a.rank}</div>
                  <Flag code={a.team} w={18} h={12} />
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{a.player}</div>
                  <div className="mono tnum" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{a.key} key</div>
                  <div className="serif tnum" style={{ fontSize: 18 }}>{a.assists}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="eyebrow">Cards per team</div>
            <div className="serif it" style={{ fontSize: 24, marginTop: 6, marginBottom: 14 }}>Disciplinary</div>
            <div>
              {topCards.map((c) => (
                <div key={c.team} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto auto', gap: 10, alignItems: 'center', padding: '8px 0' }}>
                  <Flag code={c.team} w={20} h={13} />
                  <div style={{ fontSize: 13 }}>{teams[c.team]?.name}</div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 11 }}>
                    <span style={{ width: 11, height: 14, background: 'var(--gold)', borderRadius: 1 }} /> {c.y}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 11 }}>
                    <span style={{ width: 11, height: 14, background: 'var(--pulse)', borderRadius: 1 }} /> {c.r}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--ink)', color: 'var(--paper)', padding: 22, borderRadius: 12 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', opacity: 0.65 }}>TOURNAMENT TOTALS</div>
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <Big n="147" l="Goals" />
              <Big n="1.93" l="Avg per match" />
              <Big n="48" l="Teams" />
              <Big n="76" l="Matches played" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
