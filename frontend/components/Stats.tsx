'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flag, Big } from './Shared';
import { useWindowWidth } from '@/hooks/useWindowWidth';

interface TopScorer {
  rank: number;
  player: string;
  team: string;
  goals: number;
  assists: number;
  xg: number;
  mp: number;
}

interface TopAssist {
  rank: number;
  player: string;
  team: string;
  assists: number;
  key: number;
}

interface DisciplineEntry {
  rank: number;
  player: string;
  teamCode: string;
  value: number;
}

interface StatsData {
  topScorers: TopScorer[];
  topAssists: TopAssist[];
  yellowCards: DisciplineEntry[];
  redCards: DisciplineEntry[];
  saves: DisciplineEntry[];
  shotsOnTarget: DisciplineEntry[];
  totals: {
    goals: number;
    avgPerMatch: number;
    teams: number;
    matchesPlayed: number;
  };
}

// ── ESPN response parsers ─────────────────────────────────────────
// ESPN returns { stats: [{ name: 'goalsLeaders'|'assistsLeaders', leaders: [...] }] }
// Each leader: { value, athlete: { displayName, shortName, team: { abbreviation } }, shortDisplayValue }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findStat(data: any, statName: string): any[] {
  const stats: any[] = data?.stats ?? [];
  const stat = stats.find((s: any) => String(s?.name ?? '').toLowerCase().includes(statName.toLowerCase()));
  return Array.isArray(stat?.leaders) ? stat.leaders : [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function teamCode(entry: any): string {
  return (entry?.athlete?.team?.abbreviation ?? 'UNK').toUpperCase();
}

// Parse "M: 1, G: 1: A: 0" style shortDisplayValue
function parseShortDisplay(s: string, key: string): number {
  const m = s?.match(new RegExp(`${key}:\\s*(\\d+)`, 'i'));
  return m ? Number(m[1]) : 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTopScorers(scoring: any): TopScorer[] {
  const leaders = findStat(scoring, 'goals');
  if (!leaders.length) return [];

  return leaders.filter((e: any) => Number(e?.value ?? 0) > 0).slice(0, 10).map((e: any, i: number) => {
    const short = e?.shortDisplayValue ?? '';
    return {
      rank: i + 1,
      player: e?.athlete?.displayName ?? e?.athlete?.shortName ?? 'Unknown Player',
      team: teamCode(e),
      goals: Number(e?.value ?? 0),
      assists: parseShortDisplay(short, 'A'),
      xg: 0,
      mp: parseShortDisplay(short, 'M'),
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTopAssists(scoring: any): TopAssist[] {
  const leaders = findStat(scoring, 'assists');
  if (!leaders.length) return [];

  return leaders.slice(0, 5).map((e: any, i: number) => ({
    rank: i + 1,
    player: e?.athlete?.displayName ?? e?.athlete?.shortName ?? 'Unknown Player',
    team: teamCode(e),
    assists: Number(e?.value ?? 0),
    key: 0,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseDisciplineList(entries: any[]): DisciplineEntry[] {
  if (!Array.isArray(entries)) return [];
  return entries.map((e: any, i: number) => ({
    rank: i + 1,
    player: e.player ?? 'Unknown',
    teamCode: e.teamCode ?? 'UNK',
    value: Number(e.value ?? 0),
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTotals(scoring: any) {
  const goalLeaders = findStat(scoring, 'goals');
  const totalGoals = goalLeaders.reduce((sum: number, e: any) => sum + Number(e?.value ?? 0), 0);
  return {
    goals: totalGoals,
    avgPerMatch: 0,
    teams: 48,
    matchesPlayed: 0,
  };
}

// ── Main component ───────────────────────────────────────────────
export function Stats() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const width = useWindowWidth();
  const isMobile = width < 640;
  const isTablet = width < 1024;
  const pad = isMobile ? '16px' : isTablet ? '24px' : '56px';

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        const res = await fetch('/api/stats');
        const json = await res.json();

        const topScorers = parseTopScorers(json?.scoring);
        const topAssists = parseTopAssists(json?.scoring);
        const yellowCards = parseDisciplineList(json?.discipline?.yellowCards ?? []);
        const redCards = parseDisciplineList(json?.discipline?.redCards ?? []);
        const saves = parseDisciplineList(json?.discipline?.saves ?? []);
        const shotsOnTarget = parseDisciplineList(json?.discipline?.shotsOnTarget ?? []);
        const totals = parseTotals(json?.scoring);

        if (isMounted) {
          if (!topScorers.length && !topAssists.length) {
            setEmpty(true);
          } else {
            setData({ topScorers, topAssists, yellowCards, redCards, saves, shotsOnTarget, totals });
            setEmpty(false);
          }
        }
      } catch (err) {
        console.error('[Stats] fetch error', err);
        if (isMounted) setEmpty(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadStats();
    const interval = setInterval(loadStats, 10 * 60 * 1000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <div className="screen" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', flexDirection: 'column', gap: 16,
      }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
          Loading Statistics
        </div>
        <div style={{ width: 200, height: 1, background: 'var(--rule)', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, left: '-40%', width: '40%', height: '100%',
            background: 'var(--ink-1)', animation: 'slide 1s linear infinite',
          }} />
        </div>
        <style>{`@keyframes slide { to { left: 100%; } }`}</style>
      </div>
    );
  }

  if (empty || !data) {
    return (
      <div className="screen">
        <div style={{ padding: `40px ${pad} 24px`, borderBottom: '1px solid var(--rule)' }}>
          <div className="eyebrow">Statistics · Tournament so far</div>
          <div className="headline" style={{ fontSize: isMobile ? 36 : isTablet ? 48 : 64, marginTop: 8 }}>
            The numbers <em>behind the noise.</em>
          </div>
        </div>
        <div style={{
          padding: `60px ${pad}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 20, textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            border: '2px solid var(--rule)',
            display: 'grid', placeItems: 'center',
            fontSize: 28,
          }}>
            ⏳
          </div>
          <div className="serif" style={{ fontSize: 36, lineHeight: 1.1 }}>
            Tournament not started yet.
          </div>
          <div style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 420, lineHeight: 1.6 }}>
            No stats data available yet. ESPN will populate golden boot standings,
            top assists, and disciplinary records once matches have been completed.
          </div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)', textTransform: 'uppercase', marginTop: 8 }}>
            Via ESPN · Auto-updates every 10 min
          </div>
        </div>
      </div>
    );
  }

  const maxGoals = Math.max(...data.topScorers.map((s) => s.goals), 1);

  return (
    <div className="screen">
      <div style={{ padding: `40px ${pad} 24px`, borderBottom: '1px solid var(--rule)' }}>
        <div className="eyebrow">Statistics · Tournament so far</div>
        <div className="headline" style={{ fontSize: isMobile ? 36 : isTablet ? 48 : 64, marginTop: 8 }}>
          The numbers <em>behind the noise.</em>
        </div>
      </div>

      <div style={{ padding: `40px ${pad} 64px`, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? 32 : 48 }}>
        {/* ── Top Scorers ── */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            borderBottom: '1px solid var(--rule)', paddingBottom: 12, marginBottom: 18,
          }}>
            <div className="serif" style={{ fontSize: 32, fontStyle: 'italic' }}>Top scorers</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>GOLDEN BOOT RACE</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {data.topScorers.map((s) => (
              <div key={s.player + s.team} style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '28px 24px 1fr auto' : '36px 32px auto 1fr auto auto auto',
                alignItems: 'center', gap: isMobile ? 10 : 14, padding: '14px 0',
                borderTop: '1px solid var(--rule-soft)',
              }}>
                <div className="serif tnum" style={{ fontSize: isMobile ? 16 : 22, color: s.rank === 1 ? 'var(--pulse)' : 'var(--ink-2)' }}>
                  {String(s.rank).padStart(2, '0')}
                </div>
                <Link href={`/team/${s.team}`} style={{ display: 'contents' }}>
                  <Flag code={s.team} w={isMobile ? 20 : 24} h={isMobile ? 13 : 16} />
                </Link>
                <div className="serif" style={{ fontSize: isMobile ? 15 : 18 }}>{s.player}</div>
                {!isMobile && (
                  <div style={{ height: 8, background: 'var(--rule-soft)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${(s.goals / maxGoals) * 100}%`, background: 'var(--pulse)' }} />
                  </div>
                )}
                {!isMobile && (
                  <div className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)', width: 56, textAlign: 'right' }}>
                    {s.xg > 0 ? `xG ${s.xg.toFixed(1)}` : `MP ${s.mp}`}
                  </div>
                )}
                {!isMobile && (
                  <div className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)', width: 30, textAlign: 'right' }}>A {s.assists}</div>
                )}
                <div className="serif tnum" style={{ fontSize: isMobile ? 20 : 24, width: isMobile ? 32 : 40, textAlign: 'right' }}>{s.goals}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

          {data.topAssists.length > 0 && (
            <div>
              <div className="eyebrow">Top assists</div>
              <div className="serif it" style={{ fontSize: 24, marginTop: 6, marginBottom: 14 }}>Playmakers</div>
              <div>
                {data.topAssists.map((a) => (
                  <div key={a.player + a.team} style={{
                    display: 'grid', gridTemplateColumns: '24px auto 1fr auto auto',
                    gap: 10, alignItems: 'center', padding: '10px 0',
                    borderTop: '1px dashed var(--rule-soft)',
                  }}>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{a.rank}</div>
                    <Flag code={a.team} w={18} h={12} />
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{a.player}</div>
                    {a.key > 0 && (
                      <div className="mono tnum" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{a.key} key</div>
                    )}
                    <div className="serif tnum" style={{ fontSize: 18 }}>{a.assists}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.yellowCards.length > 0 && (
            <div>
              <div className="eyebrow">Discipline</div>
              <div className="serif it" style={{ fontSize: 24, marginTop: 6, marginBottom: 14 }}>Cards</div>
              <div>
                {data.yellowCards.map((c) => (
                  <div key={c.player + c.teamCode} style={{
                    display: 'grid', gridTemplateColumns: '20px 18px 1fr auto auto',
                    gap: 8, alignItems: 'center', padding: '8px 0',
                    borderTop: '1px dashed var(--rule-soft)',
                  }}>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{c.rank}</div>
                    <Flag code={c.teamCode} w={16} h={11} />
                    <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.2 }}>{c.player}</div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'var(--mono)', fontSize: 11 }}>
                      <span style={{ width: 9, height: 12, background: 'var(--gold)', borderRadius: 1 }} /> {c.value}
                    </span>
                    {data.redCards.find((r) => r.player === c.player) && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'var(--mono)', fontSize: 11 }}>
                        <span style={{ width: 9, height: 12, background: 'var(--pulse)', borderRadius: 1 }} />{' '}
                        {data.redCards.find((r) => r.player === c.player)?.value ?? 0}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.saves.length > 0 && (
            <div>
              <div className="eyebrow">Goalkeepers</div>
              <div className="serif it" style={{ fontSize: 24, marginTop: 6, marginBottom: 14 }}>Top saves</div>
              <div>
                {data.saves.map((s) => (
                  <div key={s.player + s.teamCode} style={{
                    display: 'grid', gridTemplateColumns: '20px 18px 1fr auto',
                    gap: 8, alignItems: 'center', padding: '8px 0',
                    borderTop: '1px dashed var(--rule-soft)',
                  }}>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.rank}</div>
                    <Flag code={s.teamCode} w={16} h={11} />
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{s.player}</div>
                    <div className="serif tnum" style={{ fontSize: 18 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.shotsOnTarget.length > 0 && (
            <div>
              <div className="eyebrow">Attack</div>
              <div className="serif it" style={{ fontSize: 24, marginTop: 6, marginBottom: 14 }}>Shots on target</div>
              <div>
                {data.shotsOnTarget.map((s) => (
                  <div key={s.player + s.teamCode} style={{
                    display: 'grid', gridTemplateColumns: '20px 18px 1fr auto',
                    gap: 8, alignItems: 'center', padding: '8px 0',
                    borderTop: '1px dashed var(--rule-soft)',
                  }}>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.rank}</div>
                    <Flag code={s.teamCode} w={16} h={11} />
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{s.player}</div>
                    <div className="serif tnum" style={{ fontSize: 18 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: 'var(--ink)', color: 'var(--paper)', padding: 22, borderRadius: 12 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', opacity: 0.65 }}>TOURNAMENT TOTALS</div>
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
              <Big n={data.totals.goals > 0 ? String(data.totals.goals) : '—'} l="Goals" />
              <Big n={data.totals.avgPerMatch > 0 ? String(data.totals.avgPerMatch) : '—'} l="Avg per match" />
              <Big n={String(data.totals.teams)} l="Teams" />
              <Big n={data.totals.matchesPlayed > 0 ? String(data.totals.matchesPlayed) : '—'} l="Matches played" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}