'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flag } from './Shared';
import type { StandingsGroupBlock, GroupStandingEntry } from '@/types/espn';
import { teamCodeFromDisplayName } from '@/lib/team-codes';
import { StandingsSkeleton } from '@/components/skeleton/TeamPagesSkeleton';
import { teams } from '@/lib/data';

// ── Colour helpers ─────────────────────────────────────────────────────────────

/** Returns the primary flag colour for a team code, e.g. "#006847" for MEX */
function teamPrimaryColor(code: string | null | undefined): string | null {
  if (!code) return null;
  return (teams as Record<string, { flag?: string[] }>)[code]?.flag?.[0] ?? null;
}

/** Hex "#RRGGBB" → CSS rgba(...) */
function hexRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ThirdPlaceEntry extends GroupStandingEntry {
  groupName: string;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function Standings() {
  const [groups, setGroups] = useState<StandingsGroupBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/standings');
        const data = await res.json();
        setGroups(data.groups ?? []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Dynamic 3rd-place rankings ────────────────────────────────────────────
  const thirdPlaceEntries: ThirdPlaceEntry[] = groups
    .map((g) => {
      const thirdRow = g.entries?.[2];
      if (!thirdRow) return null;
      return { ...thirdRow, groupName: g.header.replace(/group\s+/i, '').toUpperCase() };
    })
    .filter((entry): entry is ThirdPlaceEntry => entry !== null)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalDifference ?? (a.goalsFor - a.goalsAgainst);
      const gdB = b.goalDifference ?? (b.goalsFor - b.goalsAgainst);
      if (gdB !== gdA) return gdB - gdA;
      return b.goalsFor - a.goalsFor;
    });

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ padding: '40px 56px 24px', borderBottom: '1px solid var(--rule)' }}>
        <div className="eyebrow">Group Stage · 12 Groups</div>
        <div className="headline" style={{ fontSize: 64, marginTop: 8 }}>
          The road to <em>the final.</em>
        </div>
        <div className="mono" style={{ marginTop: 14, fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
          Top 2 from each group + 8 best third-placed teams advance · Final Jul 19 · MetLife
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '40px 56px 80px' }}>
        {loading && <StandingsSkeleton />}

        {!loading && error && (
          <div className="serif it" style={{ fontSize: 28, color: 'var(--ink-3)' }}>
            Could not load standings.
          </div>
        )}

        {!loading && !error && groups.length === 0 && (
          <div className="serif it" style={{ fontSize: 28, color: 'var(--ink-3)' }}>
            No standings available yet.
          </div>
        )}

        {!loading && !error && groups.length > 0 && (
          <>
            {/* Qualification legend */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
              {[
                { bar: 'var(--ink)', label: '1st – 2nd: automatic qualification' },
                { bar: 'var(--ink-3)', dashed: true, label: '3rd: best third-placed candidates' },
              ].map((l) => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 3, height: 16, borderRadius: 2,
                    background: l.dashed ? 'transparent' : l.bar,
                    opacity: l.dashed ? 0.5 : 1,
                    borderLeft: l.dashed ? '3px dashed var(--ink-3)' : undefined,
                  }} />
                  <span className="mono" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--ink-3)' }}>
                    {l.label.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
              gap: 32,
              marginBottom: 56,
            }}>
              {groups.map((group) => (
                <GroupTable key={group.header} group={group} />
              ))}
            </div>

            {/* 3rd-place dashboard */}
            {thirdPlaceEntries.length > 0 && (
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <div style={{ padding: '12px 0', borderBottom: '1px solid var(--rule)', marginBottom: 16 }}>
                  <div className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--ink)' }}>
                    RANKINGS OF THIRD-PLACED TEAMS
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
                    Green indicator bar highlights the current 8 teams that will be advancing.
                  </div>
                </div>
                <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--paper-2)' }}>
                    <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>RANK · TEAM (GRP)</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '28px 28px 28px 28px 36px 52px 36px', gap: 0, textAlign: 'right' }}>
                      {['GRP', 'P', 'W', 'D', 'L', 'GF:GA', 'PTS'].map((h) => (
                        <span key={h} className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>{h}</span>
                      ))}
                    </div>
                  </div>
                  {thirdPlaceEntries.map((entry, idx) => {
                    const rank = idx + 1;
                    return <ThirdPlaceRow key={entry.teamId} entry={entry} rank={rank} advances={rank <= 8} />;
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Group table ───────────────────────────────────────────────────────────────

function GroupTable({ group }: { group: StandingsGroupBlock }) {
  const leader = group.entries[0];
  const leaderCode = leader ? teamCodeFromDisplayName(leader.name, leader.abbreviation) : null;
  const leaderColor = teamPrimaryColor(leaderCode);

  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header — bottom border tinted with leader's colour */}
      <div style={{
        padding: '12px 20px',
        borderBottom: leaderColor
          ? `2px solid ${hexRgba(leaderColor, 0.4)}`
          : '1px solid var(--rule)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: leaderColor
          ? `linear-gradient(90deg, ${hexRgba(leaderColor, 0.06)} 0%, var(--paper-2) 60%)`
          : 'var(--paper-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {leaderCode && <Flag code={leaderCode} w={16} h={11} />}
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--ink)' }}>
            {group.header.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '28px 28px 28px 36px 52px 36px', gap: 0, textAlign: 'right' }}>
          {['P', 'W', 'D', 'L', 'GF:GA', 'PTS'].map((h) => (
            <span key={h} className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>{h}</span>
          ))}
        </div>
      </div>

      {/* Rows */}
      {group.entries.map((entry, i) => (
        <GroupRow key={entry.teamId} entry={entry} rank={i + 1} total={group.entries.length} />
      ))}
    </div>
  );
}

// ── Group row ─────────────────────────────────────────────────────────────────

function GroupRow({ entry, rank }: { entry: GroupStandingEntry; rank: number; total: number }) {
  const code = teamCodeFromDisplayName(entry.name, entry.abbreviation);
  const color = teamPrimaryColor(code);

  const advances = rank <= 2;
  const isFirst = rank === 1;
  const isThird = rank === 3;

  const gd = entry.goalDifference ?? (entry.goalsFor - entry.goalsAgainst);
  const gdStr = gd > 0 ? `+${gd}` : String(gd);

  // Left qualification bar
  const barColor = isFirst && color
    ? color
    : advances && color
    ? hexRgba(color, 0.65)
    : advances
    ? 'var(--ink)'
    : isThird
    ? 'var(--ink-3)'
    : 'transparent';

  const barWidth = isFirst ? 4 : advances ? 3 : isThird ? 3 : 0;
  const barOpacity = isFirst ? 1 : advances ? 0.85 : isThird ? 0.4 : 0;

  // Row background tint
  const bgColor = isFirst && color
    ? hexRgba(color, 0.07)
    : advances && color
    ? hexRgba(color, 0.03)
    : 'var(--paper)';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '20px 24px 1fr 28px 28px 28px 36px 52px 36px',
      gap: 0,
      alignItems: 'center',
      padding: '11px 20px',
      borderTop: rank === 1 ? 'none' : '1px solid var(--rule-soft)',
      background: bgColor,
      position: 'relative',
      transition: 'background 0.2s',
    }}>
      {/* Qualification indicator bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: barWidth,
        background: barColor,
        opacity: barOpacity,
        borderStyle: isThird ? 'dashed' : 'solid',
        borderColor: isThird ? 'var(--ink-3)' : 'transparent',
        transition: 'background 0.2s',
      }} />

      {/* Rank */}
      <span className="mono tnum" style={{
        fontSize: 11,
        color: isFirst && color ? color : advances ? 'var(--ink)' : 'var(--ink-3)',
        fontWeight: isFirst ? 700 : 400,
      }}>
        {rank}
      </span>

      {/* Flag */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Flag code={code} w={18} h={12} />
      </div>

      {/* Team name */}
      <TeamNameLink entry={entry} advances={advances} color={isFirst ? color : null} />

      {/* Stats */}
      {[entry.played, entry.wins, entry.draws, entry.losses].map((v, i) => (
        <span key={i} className="mono tnum" style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink-2)', paddingRight: 4 }}>
          {v}
        </span>
      ))}

      {/* GF:GA */}
      <span className="mono tnum" style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink-3)', paddingRight: 4 }}>
        {entry.goalsFor}:{entry.goalsAgainst}
      </span>

      {/* Points */}
      <span className="serif tnum" style={{
        fontSize: 16,
        textAlign: 'right',
        fontWeight: isFirst ? 700 : advances ? 600 : 400,
        color: isFirst && color ? color : advances ? 'var(--ink)' : 'var(--ink-2)',
      }}>
        {entry.points}
      </span>
    </div>
  );
}

// ── Team name with optional link ──────────────────────────────────────────────

function TeamNameLink({
  entry, advances, color,
}: {
  entry: GroupStandingEntry;
  advances: boolean;
  color: string | null;
}) {
  const code = teamCodeFromDisplayName(entry.name, entry.abbreviation);
  const style = {
    fontSize: 15,
    paddingLeft: 10,
    color: color ?? (advances ? 'var(--ink)' : 'var(--ink-2)'),
    fontWeight: color ? 600 : advances ? 500 : 400,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    textDecoration: 'none' as const,
  };

  if (!code) {
    return <span className="serif" style={style}>{entry.name}</span>;
  }

  return (
    <Link href={`/team/${code}`} className="serif" style={style}>
      {entry.name}
    </Link>
  );
}

// ── Third-place row ───────────────────────────────────────────────────────────

function ThirdPlaceRow({ entry, rank, advances }: { entry: ThirdPlaceEntry; rank: number; advances: boolean }) {
  const code = teamCodeFromDisplayName(entry.name, entry.abbreviation);
  const color = teamPrimaryColor(code);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '20px 24px 1fr 28px 28px 28px 28px 36px 52px 36px',
      gap: 0,
      alignItems: 'center',
      padding: '11px 20px',
      borderTop: rank === 1 ? 'none' : '1px solid var(--rule-soft)',
      background: advances && color ? hexRgba(color, 0.04) : 'var(--paper)',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: advances ? (color ?? 'var(--live, #10b981)') : 'transparent',
        opacity: advances ? 0.8 : 0,
      }} />

      <span className="mono tnum" style={{ fontSize: 11, color: 'var(--ink)' }}>{rank}</span>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Flag code={code} w={18} h={12} />
      </div>

      <TeamNameLink entry={entry} advances={advances} color={null} />

      <span className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--ink-3)', fontWeight: 600, paddingRight: 4 }}>
        {entry.groupName}
      </span>

      {[entry.played, entry.wins, entry.draws, entry.losses].map((v, i) => (
        <span key={i} className="mono tnum" style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink-2)', paddingRight: 4 }}>{v}</span>
      ))}

      <span className="mono tnum" style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink-3)', paddingRight: 4 }}>
        {entry.goalsFor}:{entry.goalsAgainst}
      </span>

      <span className="serif tnum" style={{ fontSize: 16, textAlign: 'right', fontWeight: 600, color: 'var(--ink)' }}>
        {entry.points}
      </span>
    </div>
  );
}
