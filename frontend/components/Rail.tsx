'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { teams } from '@/lib/data'; 
import { Flag, FormDots, ago } from './Shared';
import { useTweaks, useMyTeam } from './Providers';
import type { Match } from '@/types/espn';

interface StandingsRow {
  team: { id: string; name: string; abbreviation: string; logo: string | null };
  played: number; wins: number; draws: number; losses: number; gd: number; pts: number; rank: number;
}
interface StandingsGroup { name: string; abbreviation: string; rows: StandingsRow[]; }
interface GoalPulseEvent {
  id: string;
  matchId: string;
  minute: number;
  scorer: string;
  team: string;
  venueCity: string;
  timestamp: number; // ← changed from string to number
}

import { buildPredictionNarrative, fetchPrediction } from '@/lib/predict';
import { useTypewriter } from '@/hooks/useTypewriter';

export function Rail() {
  const { tweaks } = useTweaks();
  const { myTeam } = useMyTeam();
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [standingsGroups, setStandingsGroups] = useState<StandingsGroup[]>([]);
  const [groupIdx, setGroupIdx] = useState(0);
  const [railNarrative, setRailNarrative] = useState('');
  const [goalPulses, setGoalPulses] = useState<GoalPulseEvent[]>([]);

  useEffect(() => {
    if (!tweaks.aiSummary || liveMatches.length === 0) {
      setRailNarrative('');
      return;
    }
    const featured = liveMatches[0];
    let cancelled = false;
    fetchPrediction(featured.homeTeam.name, featured.awayTeam.name)
      .then((p) => {
        if (!cancelled) setRailNarrative(buildPredictionNarrative(p));
      })
      .catch(() => {
        if (!cancelled) setRailNarrative('');
      });
    return () => {
      cancelled = true;
    };
  }, [liveMatches, tweaks.aiSummary]);

  const { display: aiText, isTyping } = useTypewriter(
    railNarrative,
    tweaks.aiSummary && railNarrative.length > 0
  );

  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await fetch('/api/scores');
        const data = await res.json();
        const all: Match[] = data.matches ?? [];
        
        const live = all.filter((m) => m.state === 'in');
        setLiveMatches(live);
        
        const pre = all
          .filter((m) => m.state === 'pre')
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setUpcomingMatches(pre.slice(0, 5));

        // ── DYNAMIC GOAL PULSE EXTRACTION ──────────────────────────────
        const freshPulses: GoalPulseEvent[] = [];
        live.forEach((match) => {
          const events = (match as any).events ?? (match as any).details ?? [];
          const currentCity = match.venue?.city ?? 'Live Match';
          
          if (Array.isArray(events)) {
            events.forEach((evt: any, idx: number) => {
              if (String(evt.type).toLowerCase() === 'goal') {
                freshPulses.push({
                  id: evt.id ?? `${match.id}-${evt.clock}-${evt.player?.id ?? idx}`,
                  matchId: match.id,
                  minute: parseInt(String(evt.clock ?? evt.minute ?? '0'), 10),
                  scorer: evt.player?.displayName ?? evt.scorer ?? 'Goal Scored',
                  team: String(evt.team?.id ?? '').toLowerCase(),
                  venueCity: currentCity,
                  // ← convert ISO string to numeric ms timestamp for ago()
                  timestamp: evt.timestamp ? new Date(evt.timestamp).getTime() : Date.now(),
                });
              }
            });
          }
        });

        setGoalPulses(freshPulses.sort((a, b) => b.minute - a.minute));

      } catch (err) {
        console.error("Error streaming live updates:", err);
      }
    }
    
    async function loadStandings() {
      try {
        const res = await fetch('/api/wc/standings');
        const data = await res.json();
        setStandingsGroups(data.groups ?? []);
      } catch {}
    }
    
    loadMatches();
    loadStandings();
    const interval = setInterval(loadMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="rail">
      <MyTeamBanner myTeam={myTeam} />

      {/* Live Now */}
      <div className="rail-section">
        <div className="rail-h">
          <span>LIVE NOW · {liveMatches.length}</span>
          <span style={{ color: 'var(--live)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="status-dot live" /> ON AIR
          </span>
        </div>
        {liveMatches.length === 0 ? (
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', padding: '8px 0' }}>
            No live matches right now.
          </div>
        ) : (
          liveMatches.map((m) => <LiveMatchRow key={m.id} m={m} />)
        )}
      </div>

      {tweaks.aiSummary && railNarrative && (
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
            {isTyping && (
              <span style={{ display: 'inline-block', width: 8, height: 18, background: 'var(--pulse)', verticalAlign: 'text-bottom', marginLeft: 2, animation: 'blink 1s steps(2) infinite' }} />
            )}
          </div>
        </div>
      )}

      {/* ── Goal Pulses Feed ── */}
      <div className="rail-section">
        <div className="rail-h">
          <span>GOAL PULSES</span>
          <span style={{ fontSize: 9 }}>LIVE STREAM</span>
        </div>
        {goalPulses.length === 0 ? (
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', padding: '8px 0' }}>
            Waiting for live match events...
          </div>
        ) : (
          goalPulses.slice(0, 6).map((p) => {
            const teamName = teams[p.team]?.name ?? p.team;
            return (
              <Link key={p.id} href={`/match/${p.matchId}`}
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
                    {teamName.toUpperCase()} · {p.venueCity.toUpperCase()}
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{ago(p.timestamp)}</div>
              </Link>
            );
          })
        )}
      </div>

      {/* Group standings */}
      {standingsGroups.length > 0 && (() => {
        const group = standingsGroups[groupIdx % standingsGroups.length];
        return (
          <div className="rail-section">
            <div className="rail-h">
              <span>{group.name.toUpperCase()} · STANDINGS</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button
                  onClick={() => setGroupIdx((i) => (i - 1 + standingsGroups.length) % standingsGroups.length)}
                  style={{ background: 'none', border: '1px solid var(--rule)', borderRadius: 4, width: 22, height: 18, cursor: 'pointer', fontSize: 12, color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}
                >‹</button>
                <span style={{ fontSize: 9, color: 'var(--ink-3)', minWidth: 32, textAlign: 'center' }}>{groupIdx + 1}/{standingsGroups.length}</span>
                <button
                  onClick={() => setGroupIdx((i) => (i + 1) % standingsGroups.length)}
                  style={{ background: 'none', border: '1px solid var(--rule)', borderRadius: 4, width: 22, height: 18, cursor: 'pointer', fontSize: 12, color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}
                >›</button>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: 11 }}>
              <thead>
                <tr style={{ color: 'var(--ink-3)', fontSize: 9, letterSpacing: '0.14em' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0' }}>TEAM</th>
                  <th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>PTS</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row, i) => (
                  <tr key={row.team.id} style={{ borderTop: '1px dashed var(--rule-soft)' }}>
                    <td style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 16, color: 'var(--ink-3)', fontSize: 10 }}>{i + 1}</span>
                      {row.team.logo
                        ? <img src={row.team.logo} alt={row.team.abbreviation} style={{ width: 18, height: 18, objectFit: 'contain' }} />
                        : <Flag code={row.team.abbreviation} w={18} h={12} />}
                      <span style={{ fontFamily: 'var(--sans)', fontSize: 12 }}>{row.team.name}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{row.played}</td>
                    <td style={{ textAlign: 'center' }}>{row.wins}</td>
                    <td style={{ textAlign: 'center' }}>{row.draws}</td>
                    <td style={{ textAlign: 'center' }}>{row.losses}</td>
                    <td style={{ textAlign: 'center' }}>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ink)' }}>{row.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Up next */}
      <div className="rail-section">
        <div className="rail-h">
          <span>UP NEXT</span>
          <span style={{ fontSize: 9 }}>{upcomingMatches.length > 0 ? `${upcomingMatches.length} MATCHES` : ''}</span>
        </div>
        {upcomingMatches.length === 0 ? (
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', padding: '8px 0' }}>No upcoming matches.</div>
        ) : (
          upcomingMatches.map((m) => <UpcomingMatchRow key={m.id} m={m} />)
        )}
      </div>
    </aside>
  );
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────

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

function LiveMatchRow({ m }: { m: Match }) {
  const router = useRouter();
  return (
    <div className="match-row" onClick={() => router.push(`/match/${m.id}`)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Flag code={m.homeTeam.abbreviation} />
        <Flag code={m.awayTeam.abbreviation} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="team-name-sm">{m.homeTeam.name}</div>
        <div className="team-name-sm" style={{ opacity: 0.6 }}>{m.awayTeam.name}</div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.08em' }}>
          {m.venue.city.toUpperCase()}
        </div>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div className="score">{m.homeTeam.score}</div>
        <div className="score" style={{ opacity: 0.6 }}>{m.awayTeam.score}</div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--live)', letterSpacing: '0.08em' }}>
          <span className="status-dot live" style={{ display: 'inline-block', marginRight: 4 }} />
          {m.displayClock}
        </div>
      </div>
    </div>
  );
}

function UpcomingMatchRow({ m }: { m: Match }) {
  const router = useRouter();
  const kickoff = new Date(m.date);
  const dateStr = kickoff.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const timeStr = kickoff.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  return (
    <div className="match-row" onClick={() => router.push(`/match/${m.id}`)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {m.homeTeam.logo
          ? <img src={m.homeTeam.logo} alt={m.homeTeam.abbreviation} style={{ width: 18, height: 18, objectFit: 'contain' }} />
          : <Flag code={m.homeTeam.abbreviation} />}
        {m.awayTeam.logo
          ? <img src={m.awayTeam.logo} alt={m.awayTeam.abbreviation} style={{ width: 18, height: 18, objectFit: 'contain' }} />
          : <Flag code={m.awayTeam.abbreviation} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="team-name-sm">{m.homeTeam.name}</div>
        <div className="team-name-sm" style={{ opacity: 0.6 }}>{m.awayTeam.name}</div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.08em' }}>
          {dateStr} · {timeStr}
        </div>
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>—</div>
    </div>
  );
}