'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { matches, teams, stadiums } from '@/lib/data';
import { Flag, FormDots, BackBar } from './Shared';
import { useTweaks } from './Providers';
import type { Team } from '@/lib/types';

export function MatchDetail({ id }: { id: string }) {
  const { tweaks } = useTweaks();
  const m = matches.find((x) => x.id === id);
  if (!m) return <div style={{ padding: 60 }}>Match not found</div>;
  const stadium = stadiums.find((s) => s.id === m.stadium)!;
  const home = teams[m.home];
  const away = teams[m.away];

  const events = [
    { t: 14, type: 'goal', team: m.home, player: 'Vinícius Jr.' },
    { t: 27, type: 'yellow', team: m.away, player: 'B. Fernandes' },
    { t: 33, type: 'goal', team: m.away, player: 'C. Ronaldo' },
    { t: 41, type: 'sub', team: m.home, player: 'Endrick on, Rodrygo off' },
    { t: 58, type: 'goal', team: m.home, player: 'Raphinha (pen)' },
    { t: 67, type: 'yellow', team: m.home, player: 'Casemiro' },
    { t: 73, type: 'pulse', team: null as string | null, player: 'Tempo rising' },
  ];

  const narrative = `It started cagey — Portugal pressing high, Brazil playing through the lines. Then the 14th minute: a Vinícius cutback nobody picked up, a finish into the roof. Ronaldo's reply was inevitable, a header from a Bernardo cross. Brazil regained control after the break and a soft penalty did the rest. With ${90 - m.minute} minutes left, Portugal need a moment of magic.`;
  const [aiNarrative, setAiNarrative] = useState('');

  useEffect(() => {
    if (!tweaks.aiSummary) { setAiNarrative(narrative); return; }
    setAiNarrative('');
    let i = 0;
    const t = setInterval(() => {
      i += 3;
      setAiNarrative(narrative.slice(0, i));
      if (i >= narrative.length) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [id, tweaks.aiSummary, narrative]);

  return (
    <div className="screen" style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <BackBar label={`${m.stage} · ${stadium.city.toUpperCase()}`} />

      <div style={{
        padding: '48px 56px 40px',
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        gap: 40, alignItems: 'center',
        borderBottom: '1px solid var(--rule)',
      }}>
        <TeamHero team={home} score={m.score?.[0]} side="left" />
        <div style={{ textAlign: 'center' }}>
          {m.status === 'live' ? (
            <>
              <div className="mono" style={{ fontSize: 11, color: 'var(--live)', letterSpacing: '0.18em', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="status-dot live" /> LIVE · {m.minute}&apos;
              </div>
              <div className="serif" style={{ fontSize: 18, marginTop: 8, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                {90 - m.minute} mins remaining
              </div>
            </>
          ) : m.status === 'ft' ? (
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.18em' }}>
              FULL TIME{m.winner ? ` · ${m.winner}` : ''}
            </div>
          ) : (
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.18em' }}>
              {m.kickoff.toUpperCase()}
            </div>
          )}
        </div>
        <TeamHero team={away} score={m.score?.[1]} side="right" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', flex: 1, borderBottom: '1px solid var(--rule)' }}>
        <div style={{ padding: '32px 48px', borderRight: '1px solid var(--rule)' }}>
          <div className="eyebrow">Timeline</div>
          <div className="serif" style={{ fontSize: 28, marginTop: 6, marginBottom: 24, fontStyle: 'italic' }}>How the match has unfolded</div>
          <div style={{ position: 'relative', paddingLeft: 28 }}>
            <div style={{ position: 'absolute', left: 8, top: 4, bottom: 4, width: 1, background: 'var(--rule-soft)' }} />
            {events.map((e, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: 18, display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <div style={{
                  position: 'absolute', left: -25, top: 6,
                  width: 16, height: 16, borderRadius: '50%',
                  background: e.type === 'goal' ? 'var(--pulse)'
                    : e.type === 'yellow' ? 'var(--gold)'
                    : e.type === 'pulse' ? 'var(--live)' : 'var(--ink-3)',
                  border: '2px solid var(--paper)',
                  boxShadow: '0 0 0 1px var(--rule-soft)',
                }} />
                <div className="mono tnum" style={{ width: 36, fontSize: 12, color: 'var(--ink-3)' }}>{e.t}&apos;</div>
                <div>
                  <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em',
                    color: e.type === 'goal' ? 'var(--pulse)' : 'var(--ink-3)', marginRight: 8 }}>
                    {e.type.toUpperCase()}
                  </span>
                  <span className="serif" style={{ fontSize: 18 }}>{e.player}</span>
                  {e.team && <span style={{ marginLeft: 8 }}><Flag code={e.team} w={16} h={11} /></span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '32px 48px', display: 'flex', flexDirection: 'column', gap: 32 }}>
          {tweaks.aiSummary && (
            <div style={{ background: 'var(--ink)', color: 'var(--paper)', padding: 24, borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(242,238,227,0.65)' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--pulse)', marginRight: 8 }} />
                  PULSE · AI NARRATIVE
                </div>
                <div className="mono" style={{ fontSize: 9, color: 'rgba(242,238,227,0.45)' }}>Updated 0:08 ago</div>
              </div>
              <div className="serif" style={{ fontSize: 19, lineHeight: 1.4, fontStyle: 'italic' }}>
                {aiNarrative}
                {aiNarrative.length < narrative.length && (
                  <span style={{ display: 'inline-block', width: 8, height: 18, background: 'var(--pulse)', verticalAlign: 'text-bottom', marginLeft: 2 }} />
                )}
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ background: 'transparent', color: 'var(--paper)', borderColor: 'rgba(242,238,227,0.3)' }}>↻ REGENERATE</button>
                <button className="btn btn-ghost" style={{ background: 'transparent', color: 'var(--paper)', borderColor: 'rgba(242,238,227,0.3)' }}>↗ FRIEND MODE</button>
              </div>
            </div>
          )}

          <div>
            <div className="eyebrow">AI Prediction</div>
            <div className="serif" style={{ fontSize: 22, marginTop: 6, fontStyle: 'italic' }}>Where this match is heading</div>
            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
              <PredictBar label={home.name} pct={62} color="var(--pulse)" />
              <PredictBar label="Draw" pct={22} color="var(--gold)" />
              <PredictBar label={away.name} pct={16} color="var(--ink-2)" />
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 10, letterSpacing: '0.06em' }}>
              Model: PulseNet v3 · xG model trained on 12.3M matches
            </div>
          </div>

          <div>
            <div className="eyebrow">At a glance</div>
            <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
              <StatBar label="POSSESSION" home={58} away={42} />
              <StatBar label="SHOTS" home={14} away={9} />
              <StatBar label="xG" home={2.3} away={1.1} fmt={(x) => x.toFixed(1)} />
              <StatBar label="PASS ACC" home={89} away={84} fmt={(x) => `${x}%`} />
            </div>
          </div>
        </div>
      </div>

      <div style={{
        padding: '24px 56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--paper-2)',
      }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>
          {stadium.name.toUpperCase()} · {stadium.capacity.toLocaleString()} CAP · {stadium.surface.toUpperCase()}
        </div>
        <Link href={`/stadium/${stadium.id}`} className="btn" style={{ textDecoration: 'none' }}>VIEW STADIUM →</Link>
      </div>
    </div>
  );
}

function TeamHero({ team, score, side }: { team: Team; score?: number; side: 'left' | 'right' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexDirection: side === 'right' ? 'row-reverse' : 'row' }}>
      <Flag code={team.code} w={88} h={56} />
      <div style={{ textAlign: side === 'right' ? 'right' : 'left' }}>
        <div className="serif" style={{ fontSize: 46, lineHeight: 0.95 }}>{team.name}</div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', marginTop: 8 }}>
          GROUP {team.group} · {team.code}
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 6, justifyContent: side === 'right' ? 'flex-end' : 'flex-start' }}>
          <FormDots form={team.form} />
        </div>
      </div>
      {score !== null && score !== undefined && (
        <div className="serif tnum" style={{ fontSize: 96, lineHeight: 1 }}>{score}</div>
      )}
    </div>
  );
}

function PredictBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ padding: 18, borderRight: '1px solid var(--rule-soft)', position: 'relative', overflow: 'hidden', background: 'var(--paper)' }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pct}%`, background: color, opacity: 0.15 }} />
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em', position: 'relative' }}>{label.toUpperCase()}</div>
      <div className="serif" style={{ fontSize: 40, lineHeight: 1, marginTop: 8, position: 'relative' }}>{pct}<span style={{ fontSize: 18, opacity: 0.5 }}>%</span></div>
    </div>
  );
}

function StatBar({ label, home, away, fmt = (x) => String(x) }: {
  label: string;
  home: number;
  away: number;
  fmt?: (x: number) => string;
}) {
  const total = home + away;
  const homePct = (home / total) * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: 'var(--mono)', fontSize: 11 }}>
        <span style={{ color: 'var(--pulse)', fontWeight: 600 }}>{fmt(home)}</span>
        <span style={{ color: 'var(--ink-3)', fontSize: 10, letterSpacing: '0.14em' }}>{label}</span>
        <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{fmt(away)}</span>
      </div>
      <div style={{ marginTop: 6, height: 6, display: 'flex', gap: 2 }}>
        <div style={{ width: `${homePct}%`, background: 'var(--pulse)' }} />
        <div style={{ width: `${100 - homePct}%`, background: 'var(--ink-2)' }} />
      </div>
    </div>
  );
}
