'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { matches, stadiums, teams } from '@/lib/data';
import { Flag } from './Shared';
import type { Match } from '@/lib/types';

const filters: { id: FilterId; label: string; dot?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live', dot: 'var(--live)' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'ft', label: 'Full time' },
  { id: 'gs', label: 'Group stage' },
  { id: 'ko', label: 'Knockouts' },
];

type FilterId = 'all' | 'live' | 'upcoming' | 'ft' | 'gs' | 'ko';

const stageOrder: Match['stage'][] = ['R16', 'QF', 'SF', 'F', 'GS'];
const stageLabels: Record<Match['stage'], string> = {
  R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'Final', GS: 'Group stage · recent',
};

export function MatchesList() {
  const [filter, setFilter] = useState<FilterId>('all');

  const filtered = matches.filter((m) => {
    if (filter === 'live') return m.status === 'live';
    if (filter === 'ft') return m.status === 'ft';
    if (filter === 'upcoming') return m.status === 'upcoming';
    if (filter === 'gs') return m.stage === 'GS';
    if (filter === 'ko') return m.stage !== 'GS';
    return true;
  });

  const byStage: Partial<Record<Match['stage'], Match[]>> = {};
  filtered.forEach((m) => {
    (byStage[m.stage] ||= []).push(m);
  });

  return (
    <div className="screen">
      <div style={{ padding: '40px 56px 24px', borderBottom: '1px solid var(--rule)' }}>
        <div className="eyebrow">All matches · 104 scheduled</div>
        <div className="headline" style={{ fontSize: 64, marginTop: 8 }}>
          Every kickoff,<br /><em>in one place.</em>
        </div>
        <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                cursor: 'pointer',
                background: filter === f.id ? 'var(--ink)' : 'transparent',
                color: filter === f.id ? 'var(--paper)' : 'var(--ink)',
                border: '1px solid var(--rule)',
                borderRadius: 999,
                padding: '8px 16px',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              {f.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: f.dot }} />}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '32px 56px 64px' }}>
        {stageOrder.filter((s) => byStage[s]).map((stage) => (
          <div key={stage} style={{ marginBottom: 56 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, borderBottom: '1px solid var(--rule)', paddingBottom: 12, marginBottom: 18 }}>
              <div className="serif" style={{ fontSize: 36, fontStyle: 'italic' }}>{stageLabels[stage]}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>
                {byStage[stage]!.length} {byStage[stage]!.length === 1 ? 'MATCH' : 'MATCHES'}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 0 }}>
              {byStage[stage]!.map((m) => <MatchListRow key={m.id} m={m} />)}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div className="serif it" style={{ fontSize: 28, color: 'var(--ink-3)' }}>No matches match this filter.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchListRow({ m }: { m: Match }) {
  const router = useRouter();
  const stadium = stadiums.find((s) => s.id === m.stadium);
  return (
    <div
      onClick={() => router.push(`/match/${m.id}`)}
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr auto 1fr 160px 28px',
        gap: 24, padding: '20px 0',
        borderTop: '1px solid var(--rule-soft)',
        alignItems: 'center', cursor: 'pointer',
      }}
    >
      <div>
        {m.status === 'live' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--live)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em' }}>
            <span className="status-dot live" /> LIVE · {m.minute}&apos;
          </span>
        )}
        {m.status === 'ft' && (
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>FULL TIME</span>
        )}
        {m.status === 'upcoming' && (
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', letterSpacing: '0.12em' }}>{m.kickoff.toUpperCase()}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'flex-end' }}>
        <span className="serif" style={{ fontSize: 22 }}>{teams[m.home]?.name}</span>
        <Flag code={m.home} w={32} h={20} />
      </div>
      <div className="serif tnum" style={{ fontSize: 28, minWidth: 80, textAlign: 'center' }}>
        {m.score ? `${m.score[0]}–${m.score[1]}` : <span style={{ color: 'var(--ink-3)', fontSize: 14, fontStyle: 'italic' }}>vs</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Flag code={m.away} w={32} h={20} />
        <span className="serif" style={{ fontSize: 22 }}>{teams[m.away]?.name}</span>
      </div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em', textAlign: 'right' }}>
        {stadium?.city.toUpperCase()}<br />
        <span style={{ opacity: 0.7 }}>{stadium?.name.toUpperCase()}</span>
      </div>
      <div style={{ color: 'var(--ink-3)', fontSize: 16 }}>›</div>
    </div>
  );
}
