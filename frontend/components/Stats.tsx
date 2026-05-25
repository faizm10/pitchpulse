'use client';

import { useEffect, useState } from 'react';
import { Flag, Big } from './Shared';

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

interface TopCards {
  team: string;
  name: string;
  y: number;
  r: number;
}

interface StatsData {
  topScorers: TopScorer[];
  topAssists: TopAssist[];
  topCards: TopCards[];
  totals: {
    goals: number;
    avgPerMatch: number;
    teams: number;
    matchesPlayed: number;
  };
}

// ── ESPN response parsers ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findCategory(data: any, name: string): any[] {
  const cats = data?.categories ?? data?.results ?? [];
  if (!Array.isArray(cats)) return [];

  const cat = cats.find((c: any) =>
    String(c?.name ?? c?.displayName ?? '').toLowerCase().includes(name.toLowerCase())
  );
  
  return Array.isArray(cat?.leaders) ? cat.leaders : (Array.isArray(cat?.athletes) ? cat.athletes : []);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function teamCode(entry: any): string {
  return (
    entry?.athlete?.team?.abbreviation ??
    entry?.team?.abbreviation ??
    entry?.athlete?.flag?.alt ??
    'UNK'
  ).toUpperCase();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStatValue(statsArray: any[] | undefined, targetNames: string[]): number {
  if (!Array.isArray(statsArray)) return 0;
  const stat = statsArray.find((s: any) => 
    targetNames.some(name => String(s?.name ?? s?.displayName ?? '').toLowerCase() === name.toLowerCase())
  );
  return Number(stat?.value ?? stat?.statValue ?? 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTopScorers(scoring: any): TopScorer[] {
  const leaders = findCategory(scoring, 'goal');
  if (!leaders.length) return [];

  return leaders.slice(0, 10).map((e: any, i: number) => {
    const statPool = e?.statistics ?? e?.stats;
    return {
      rank: i + 1,
      player: e?.athlete?.displayName ?? e?.athlete?.shortName ?? 'Unknown Player',
      team: teamCode(e),
      goals: Number(e?.value ?? e?.statValue ?? 0),
      assists: getStatValue(statPool, ['assists', 'assist', 'a']),
      xg: getStatValue(statPool, ['xgoals', 'xg', 'expectedgoals']),
      mp: getStatValue(statPool, ['gamesplayed', 'gp', 'matchesplayed', 'mp']),
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTopAssists(scoring: any): TopAssist[] {
  const leaders = findCategory(scoring, 'assist');
  if (!leaders.length) return [];

  return leaders.slice(0, 5).map((e: any, i: number) => {
    const statPool = e?.statistics ?? e?.stats;
    return {
      rank: i + 1,
      player: e?.athlete?.displayName ?? e?.athlete?.shortName ?? 'Unknown Player',
      team: teamCode(e),
      assists: Number(e?.value ?? e?.statValue ?? 0),
      key: getStatValue(statPool, ['keypasses', 'kp', 'key']),
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTopCards(discipline: any): TopCards[] {
  const yellows = findCategory(discipline, 'yellow');
  if (!yellows.length) return [];

  return yellows.slice(0, 5).map((e: any) => {
    const statPool = e?.statistics ?? e?.stats;
    return {
      team: teamCode(e),
      name: e?.athlete?.team?.displayName ?? e?.team?.displayName ?? teamCode(e),
      y: Number(e?.value ?? e?.statValue ?? 0),
      r: getStatValue(statPool, ['redcards', 'rc', 'red']),
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTotals(scoring: any) {
  const totals = scoring?.totals ?? scoring?.summary ?? {};
  return {
    goals: Number(totals?.goals ?? totals?.totalGoals ?? 0),
    avgPerMatch: Number(totals?.goalsPerMatch ?? totals?.avgGoals ?? 0),
    teams: 48, // Verified 48 teams for FIFA World Cup 2026
    matchesPlayed: Number(totals?.gamesPlayed ?? totals?.matchesPlayed ?? 0),
  };
}

// ── Main component ───────────────────────────────────────────────
export function Stats() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        const res = await fetch('/api/stats');
        const json = await res.json();

        const topScorers = parseTopScorers(json?.scoring);
        const topAssists = parseTopAssists(json?.scoring);
        const topCards = parseTopCards(json?.discipline);
        const totals = parseTotals(json?.scoring);

        if (isMounted) {
          if (!topScorers.length && !topAssists.length) {
            setEmpty(true);
          } else {
            setData({ topScorers, topAssists, topCards, totals });
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
    return () => { isMounted = false; };
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
        <div style={{ padding: '40px 56px 24px', borderBottom: '1px solid var(--rule)' }}>
          <div className="eyebrow">Statistics · Tournament so far</div>
          <div className="headline" style={{ fontSize: 64, marginTop: 8 }}>
            The numbers <em>behind the noise.</em>
          </div>
        </div>
        <div style={{
          padding: '80px 56px',
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
            Stats will appear here once the FIFA World Cup 2026 kicks off on{' '}
            <strong>June 11, 2026</strong>. Check back then for live golden boot
            standings, top assists, and disciplinary records.
          </div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-3)', textTransform: 'uppercase', marginTop: 8 }}>
            Via ESPN · Auto-updates every 5 min
          </div>
        </div>
      </div>
    );
  }

  const maxGoals = Math.max(...data.topScorers.map((s) => s.goals), 1);

  return (
    <div className="screen">
      <div style={{ padding: '40px 56px 24px', borderBottom: '1px solid var(--rule)' }}>
        <div className="eyebrow">Statistics · Tournament so far</div>
        <div className="headline" style={{ fontSize: 64, marginTop: 8 }}>
          The numbers <em>behind the noise.</em>
        </div>
      </div>

      <div style={{ padding: '40px 56px 64px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 48 }}>
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
                <div className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)', width: 56, textAlign: 'right' }}>
                  {s.xg > 0 ? `xG ${s.xg.toFixed(1)}` : `MP ${s.mp}`}
                </div>
                <div className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-3)', width: 30, textAlign: 'right' }}>A {s.assists}</div>
                <div className="serif tnum" style={{ fontSize: 24, width: 40, textAlign: 'right' }}>{s.goals}</div>
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

          {data.topCards.length > 0 && (
            <div>
              <div className="eyebrow">Cards per team</div>
              <div className="serif it" style={{ fontSize: 24, marginTop: 6, marginBottom: 14 }}>Disciplinary</div>
              <div>
                {data.topCards.map((c) => (
                  <div key={c.team} style={{
                    display: 'grid', gridTemplateColumns: '24px 1fr auto auto',
                    gap: 10, alignItems: 'center', padding: '8px 0',
                  }}>
                    <Flag code={c.team} w={20} h={13} />
                    <div style={{ fontSize: 13 }}>{c.name || c.team}</div>
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
          )}

          <div style={{ background: 'var(--ink)', color: 'var(--paper)', padding: 22, borderRadius: 12 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', opacity: 0.65 }}>TOURNAMENT TOTALS</div>
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
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