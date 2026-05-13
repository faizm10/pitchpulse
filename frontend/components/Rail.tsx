'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { matches, teams, pulses, stadiums, groups } from '@/lib/data';
import { Flag, FormDots, ago } from './Shared';
import { useTweaks, useMyTeam } from './Providers';
import type { Match } from '@/lib/types';

const fullAi = `Argentina lead Japan 3–2 with 89 minutes played — Messi's late header has the Azteca shaking. Brazil hold a one-goal edge over Portugal in New Jersey. France and Belgium remain level. Morocco's first-half strike is the surprise of the day.`;

export function Rail() {
  const { tweaks } = useTweaks();
  const { myTeam } = useMyTeam();
  const [aiText, setAiText] = useState('');

  useEffect(() => {
    if (!tweaks.aiSummary) return;
    setAiText('');
    let i = 0;
    const t = setInterval(() => {
      i += 2;
      setAiText(fullAi.slice(0, i));
      if (i >= fullAi.length) clearInterval(t);
    }, 18);
    return () => clearInterval(t);
  }, [tweaks.aiSummary]);

  const live = matches.filter((m) => m.status === 'live');
  const upcoming = matches.filter((m) => m.status === 'upcoming').slice(0, 4);

  return (
    <aside className="rail">
      <MyTeamBanner myTeam={myTeam} />

      <div className="rail-section">
        <div className="rail-h">
          <span>LIVE NOW · {live.length}</span>
          <span style={{ color: 'var(--live)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="status-dot live" /> ON AIR
          </span>
        </div>
        {live.map((m) => <MatchRow key={m.id} m={m} />)}
      </div>

      {tweaks.aiSummary && (
        <div className="rail-section" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
          <div className="rail-h" style={{ color: 'rgba(242,238,227,0.65)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--pulse)', boxShadow: '0 0 0 2px rgba(229,57,43,0.25)' }} />
              PULSE · LIVE SUMMARY
            </span>
            <span style={{ fontSize: 9 }}>AI · 14s ago</span>
          </div>
          <div className="serif" style={{ fontSize: 17, lineHeight: 1.35, fontStyle: 'italic' }}>
            {aiText}
            <span style={{ display: 'inline-block', width: 8, height: 18, background: 'var(--pulse)', verticalAlign: 'text-bottom', marginLeft: 2, animation: 'blink 1s steps(2) infinite' }} />
          </div>
        </div>
      )}

      <div className="rail-section">
        <div className="rail-h">
          <span>GOAL PULSES</span>
          <span style={{ fontSize: 9 }}>LAST 90 MIN</span>
        </div>
        {pulses.slice(0, 6).map((p) => {
          const m = matches.find((x) => x.id === p.match);
          const stadium = m && stadiums.find((x) => x.id === m.stadium);
          return (
            <Link key={p.id} href={`/match/${p.match}`}
              style={{
                textDecoration: 'none', color: 'inherit',
                padding: '10px 0', borderTop: '1px dashed var(--rule-soft)',
                display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 12,
              }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--pulse)', color: '#fff',
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
              }}>{p.minute}&apos;</div>
              <div style={{ minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 16, lineHeight: 1.1 }}>{p.scorer}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em', marginTop: 2 }}>
                  {teams[p.team]?.name.toUpperCase()} · {stadium?.city.toUpperCase()}
                </div>
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{ago(p.t)}</div>
            </Link>
          );
        })}
      </div>

      <div className="rail-section">
        <div className="rail-h">
          <span>GROUP A · STANDINGS</span>
          <span style={{ fontSize: 9 }}>FINAL</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: 11 }}>
          <thead>
            <tr style={{ color: 'var(--ink-3)', fontSize: 9, letterSpacing: '0.14em' }}>
              <th style={{ textAlign: 'left', padding: '6px 0' }}>TEAM</th>
              <th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>PTS</th>
            </tr>
          </thead>
          <tbody>
            {groups.A.map((row, i) => (
              <tr key={row.team} style={{ borderTop: '1px dashed var(--rule-soft)' }}>
                <td style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 16, color: 'var(--ink-3)', fontSize: 10 }}>{i + 1}</span>
                  <Flag code={row.team} w={18} h={12} />
                  <span style={{ fontFamily: 'var(--sans)', fontSize: 12 }}>{teams[row.team]?.name}</span>
                </td>
                <td style={{ textAlign: 'center' }}>{row.p}</td>
                <td style={{ textAlign: 'center' }}>{row.w}</td>
                <td style={{ textAlign: 'center' }}>{row.d}</td>
                <td style={{ textAlign: 'center' }}>{row.l}</td>
                <td style={{ textAlign: 'center' }}>{row.gf - row.ga > 0 ? `+${row.gf - row.ga}` : row.gf - row.ga}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ink)' }}>{row.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rail-section">
        <div className="rail-h">
          <span>UP NEXT</span>
          <span style={{ fontSize: 9 }}>QUARTERFINALS</span>
        </div>
        {upcoming.map((m) => <MatchRow key={m.id} m={m} />)}
      </div>
    </aside>
  );
}

function MyTeamBanner({ myTeam }: { myTeam: string | null }) {
  const t = myTeam ? teams[myTeam] : null;
  return (
    <Link href="/mywc" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="rail-section" style={{
        background: t ? `linear-gradient(135deg, ${t.flag[0]} 0%, ${t.flag[2]} 100%)` : 'transparent',
        color: t ? '#fff' : 'inherit',
        cursor: 'pointer',
      }}>
        {t ? (
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.8 }}>
              YOUR WORLD CUP
            </div>
            <div className="serif" style={{ fontSize: 28, lineHeight: 1.05, marginTop: 6, fontStyle: 'italic' }}>
              You&apos;re with <span style={{ fontWeight: 600, fontStyle: 'normal' }}>{t.name}</span>
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, opacity: 0.95 }}>
              <span className="mono">FORM</span>
              <FormDots form={t.form} />
            </div>
          </div>
        ) : (
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
              MAKE IT YOURS
            </div>
            <div className="serif" style={{ fontSize: 24, lineHeight: 1.1, marginTop: 6 }}>
              Pick your team —<br /><em style={{ color: 'var(--pulse)' }}>the app adapts.</em>
            </div>
            <button className="btn" style={{ marginTop: 14 }}>SET UP MY WORLD CUP →</button>
          </div>
        )}
      </div>
    </Link>
  );
}

function MatchRow({ m }: { m: Match }) {
  const router = useRouter();
  const stadium = stadiums.find((s) => s.id === m.stadium);
  return (
    <div className="match-row" onClick={() => router.push(`/match/${m.id}`)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Flag code={m.home} />
        <Flag code={m.away} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="team-name-sm">{teams[m.home]?.name}</div>
        <div className="team-name-sm" style={{ opacity: 0.6 }}>{teams[m.away]?.name}</div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.08em' }}>
          {m.status === 'upcoming' ? m.kickoff.toUpperCase() : `${stadium?.city.toUpperCase()} · ${m.stage}`}
        </div>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        {m.status === 'live' && m.score && (
          <>
            <div className="score">{m.score[0]}</div>
            <div className="score" style={{ opacity: 0.6 }}>{m.score[1]}</div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--live)', letterSpacing: '0.08em' }}>
              <span className="status-dot live" style={{ display: 'inline-block', marginRight: 4 }} />
              {m.minute}&apos;
            </div>
          </>
        )}
        {m.status === 'ft' && m.score && (
          <>
            <div className="score">{m.score[0]}</div>
            <div className="score" style={{ opacity: 0.6 }}>{m.score[1]}</div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>FT</div>
          </>
        )}
        {m.status === 'upcoming' && (
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>—</div>
        )}
      </div>
    </div>
  );
}
