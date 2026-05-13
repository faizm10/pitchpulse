'use client';

import Link from 'next/link';
import { bracket, teams } from '@/lib/data';
import { Flag } from './Shared';
import type { BracketMatch } from '@/lib/types';

export function Bracket() {
  return (
    <div className="screen">
      <div style={{ padding: '40px 56px 24px', borderBottom: '1px solid var(--rule)' }}>
        <div className="eyebrow">Knockout · Round of 16 → Final</div>
        <div className="headline" style={{ fontSize: 64, marginTop: 8 }}>
          The path to <em>MetLife.</em>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 14, letterSpacing: '0.08em' }}>
          8 matches played · 7 still to come · Final July 19, 2026
        </div>
      </div>

      <div style={{ padding: '40px 28px 64px', overflowX: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
          gap: 18, minWidth: 1200, alignItems: 'stretch',
        }}>
          <Column label="Round of 16" matches={bracket.R16} />
          <Column label="Quarter-finals" matches={bracket.QF} />
          <Column label="Semi-finals" matches={bracket.SF} />
          <Column label="Final" matches={bracket.F} />
          <TrophyColumn />
        </div>
      </div>
    </div>
  );
}

function Column({ label, matches }: { label: string; matches: BracketMatch[] }) {
  const gap = matches.length === 8 ? 8 : matches.length === 4 ? 60 : matches.length === 2 ? 180 : 360;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.18em', textAlign: 'center', marginBottom: 8 }}>
        {label.toUpperCase()}
      </div>
      {matches.map((m) => <Card key={m.id} m={m} />)}
    </div>
  );
}

function Card({ m }: { m: BracketMatch }) {
  const teamA = m.a ? teams[m.a] : null;
  const teamB = m.b ? teams[m.b] : null;
  const isLive = m.status === 'live';
  const isFt = m.status === 'ft';
  const winner: 'a' | 'b' | null = isFt && m.score
    ? (m.pen ? (m.pen[0] > m.pen[1] ? 'a' : 'b') : m.score[0] > m.score[1] ? 'a' : m.score[1] > m.score[0] ? 'b' : null)
    : null;

  const card = (
    <div style={{
      border: '1px solid var(--rule)', borderRadius: 10, background: 'var(--paper)',
      overflow: 'hidden', position: 'relative',
      cursor: teamA ? 'pointer' : 'default',
    }}>
      {isLive && (
        <div style={{ position: 'absolute', top: 6, right: 8, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--live)', letterSpacing: '0.12em', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span className="status-dot live" />LIVE
        </div>
      )}
      <Row team={teamA?.code} score={m.score?.[0]} pen={m.pen?.[0]} dim={winner === 'b'} hint={m.hint?.split(' vs ')[0]} />
      <div style={{ height: 1, background: 'var(--rule-soft)' }} />
      <Row team={teamB?.code} score={m.score?.[1]} pen={m.pen?.[1]} dim={winner === 'a'} hint={m.hint?.split(' vs ')[1]} />
    </div>
  );

  if (teamA) {
    const matchId = `m${m.id.replace(/[a-z]/g, '').padStart(2, '0')}`;
    return <Link href={`/match/${matchId}`} style={{ textDecoration: 'none', color: 'inherit' }}>{card}</Link>;
  }
  return card;
}

function Row({ team, score, pen, dim, hint }: {
  team?: string;
  score?: number;
  pen?: number;
  dim: boolean;
  hint?: string;
}) {
  const t = team ? teams[team] : null;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '20px 1fr auto',
      alignItems: 'center', gap: 10, padding: '10px 12px',
      opacity: dim ? 0.42 : 1,
    }}>
      {t ? <Flag code={t.code} w={18} h={12} /> : <span style={{ width: 18, height: 12, border: '1px dashed var(--rule)', borderRadius: 2 }} />}
      <span style={{ fontSize: 13, fontWeight: 500, fontStyle: t ? 'normal' : 'italic', color: t ? 'var(--ink)' : 'var(--ink-3)' }}>
        {t ? t.name : (hint || 'TBD')}
      </span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
        {pen !== undefined && <span className="mono tnum" style={{ fontSize: 10, color: 'var(--ink-3)' }}>({pen})</span>}
        <span className="serif tnum" style={{ fontSize: 18, minWidth: 12, textAlign: 'right' }}>
          {score !== undefined && score !== null ? score : <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>—</span>}
        </span>
      </span>
    </div>
  );
}

function TrophyColumn() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.18em', marginBottom: 14 }}>WINNER</div>
      <div style={{
        width: 120, height: 160, borderRadius: 10,
        border: '2px solid var(--ink)', background: 'var(--paper-2)',
        display: 'grid', placeItems: 'center', textAlign: 'center', padding: 16,
      }}>
        <div>
          <div style={{ fontSize: 48 }}>🏆</div>
          <div className="serif it" style={{ fontSize: 16, marginTop: 8, color: 'var(--ink-2)' }}>To be<br />written</div>
        </div>
      </div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 14, letterSpacing: '0.12em', textAlign: 'center' }}>
        JUL 19<br />METLIFE STADIUM
      </div>
    </div>
  );
}
