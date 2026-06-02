'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flag } from './Shared';
import type { StandingsGroupBlock, GroupStandingEntry } from '@/types/espn';
import { teamCodeFromDisplayName } from '@/lib/team-codes';
import { StandingsSkeleton } from '@/components/skeleton/TeamPagesSkeleton';

interface ThirdPlaceEntry extends GroupStandingEntry {
  groupName: string;
}
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

  // ── DYNAMIC 3RD PLACE RANKINGS ENGINE ────────────────────────────
  const thirdPlaceEntries: ThirdPlaceEntry[] = groups
    .map((g) => {
      const thirdRow = g.entries?.[2]; // Safely grab the 3rd team in the group
      if (!thirdRow) return null;
      return {
        ...thirdRow,
        groupName: g.header.replace(/group\s+/i, '').toUpperCase(),
      };
    })
    .filter((entry): entry is ThirdPlaceEntry => entry !== null)
    .sort((a, b) => {
      // 1. Points Tiebreaker
      if (b.points !== a.points) return b.points - a.points;

      // 2. Goal Difference Tiebreaker
      const gdA = a.goalDifference ?? (a.goalsFor - a.goalsAgainst);
      const gdB = b.goalDifference ?? (b.goalsFor - b.goalsAgainst);
      if (gdB !== gdA) return gdB - gdA;

      // 3. Goals For Tiebreaker
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
        <div
          className="mono"
          style={{ marginTop: 14, fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}
        >
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
                gap: 32,
                marginBottom: 56, // Added spacing between primary grids and auxiliary table
              }}
            >
              {groups.map((group) => (
                <GroupTable key={group.header} group={group} />
              ))}
            </div>

            {/* ── 3RD PLACE DASHBOARD ── */}
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
                  
                  {/* Table Headers */}
                  <div
                    style={{
                      padding: '12px 20px',
                      borderBottom: '1px solid var(--rule)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--paper-2)',
                    }}
                  >
                    <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>
                      RANK · TEAM (GRP)
                    </span>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '28px 28px 28px 28px 36px 52px 36px',
                        gap: 0,
                        textAlign: 'right',
                      }}
                    >
                      {['GRP', 'P', 'W', 'D', 'L', 'GF:GA', 'PTS'].map((h) => (
                        <span
                          key={h}
                          className="mono"
                          style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em' }}
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Table Data Rows */}
                  {thirdPlaceEntries.map((entry, idx) => {
                    const rank = idx + 1;
                    const advances = rank <= 8;
                    return (
                      <ThirdPlaceRow key={entry.teamId} entry={entry} rank={rank} advances={advances} />
                    );
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

function GroupTable({ group }: { group: StandingsGroupBlock }) {
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Group header */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--paper-2)',
        }}
      >
        <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--ink)' }}>
          {group.header.toUpperCase()}
        </span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '28px 28px 28px 36px 52px 36px',
            gap: 0,
            textAlign: 'right',
          }}
        >
          {['P', 'W', 'D', 'L', 'GF:GA', 'PTS'].map((h) => (
            <span
              key={h}
              className="mono"
              style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em' }}
            >
              {h}
            </span>
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

function GroupRow({
  entry,
  rank,
  total,
}: {
  entry: GroupStandingEntry;
  rank: number;
  total: number;
}) {
  const advances = rank <= 2;
  const isThird = rank === 3;
  const gd = (entry.goalDifference ?? entry.goalsFor - entry.goalsAgainst);
  const gdStr = gd > 0 ? `+${gd}` : String(gd);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '20px 24px 1fr 28px 28px 28px 36px 52px 36px',
        gap: 0,
        alignItems: 'center',
        padding: '11px 20px',
        borderTop: rank === 1 ? 'none' : '1px solid var(--rule-soft)',
        background: advances ? 'var(--paper)' : isThird ? 'var(--paper)' : 'var(--paper)',
        position: 'relative',
      }}
    >
      {/* Qualification indicator bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: advances
            ? 'var(--ink)'
            : isThird
            ? 'var(--ink-3)'
            : 'transparent',
          opacity: advances ? 1 : 0.4,
        }}
      />

      {/* Rank */}
      <span
        className="mono tnum"
        style={{ fontSize: 11, color: advances ? 'var(--ink)' : 'var(--ink-3)' }}
      >
        {rank}
      </span>

      {/* Flag */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Flag code={teamCodeFromDisplayName(entry.name, entry.abbreviation)} w={18} h={12} />
      </div>

      {/* Team name */}
      <TeamNameLink entry={entry} advances={advances} />

      {/* Stats */}
      {[entry.played, entry.wins, entry.draws, entry.losses].map((v, i) => (
        <span
          key={i}
          className="mono tnum"
          style={{
            fontSize: 12,
            textAlign: 'right',
            color: 'var(--ink-2)',
            paddingRight: 4,
          }}
        >
          {v}
        </span>
      ))}

      {/* GF:GA */}
      <span
        className="mono tnum"
        style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink-3)', paddingRight: 4 }}
      >
        {entry.goalsFor}:{entry.goalsAgainst}
      </span>

      {/* Points */}
      <span
        className="serif tnum"
        style={{
          fontSize: 16,
          textAlign: 'right',
          fontWeight: advances ? 600 : 400,
          color: advances ? 'var(--ink)' : 'var(--ink-2)',
        }}
      >
        {entry.points}
      </span>
    </div>
  );
}

function TeamNameLink({
  entry,
  advances,
}: {
  entry: GroupStandingEntry;
  advances: boolean;
}) {
  const code = teamCodeFromDisplayName(entry.name, entry.abbreviation);
  const style = {
    fontSize: 15,
    paddingLeft: 10,
    color: advances ? 'var(--ink)' : 'var(--ink-2)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    textDecoration: 'none' as const,
  };

  if (!code) {
    return (
      <span className="serif" style={style}>
        {entry.name}
      </span>
    );
  }

  return (
    <Link href={`/team/${code}`} className="serif" style={style}>
      {entry.name}
    </Link>
  );
}

function ThirdPlaceRow({
  entry,
  rank,
  advances,
}: {
  entry: ThirdPlaceEntry;
  rank: number;
  advances: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '20px 24px 1fr 28px 28px 28px 28px 36px 52px 36px',
        gap: 0,
        alignItems: 'center',
        padding: '11px 20px',
        borderTop: rank === 1 ? 'none' : '1px solid var(--rule-soft)',
        background: 'var(--paper)',
        position: 'relative',
      }}
    >
      {/* Live green qualifying bar for the top 8 positions */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: advances ? 'var(--live, #10b981)' : 'transparent',
        }}
      />

      <span className="mono tnum" style={{ fontSize: 11, color: 'var(--ink)' }}>
        {rank}
      </span>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Flag code={teamCodeFromDisplayName(entry.name, entry.abbreviation)} w={18} h={12} />
      </div>

      <TeamNameLink entry={entry} advances={advances} />

      {/* Origin Group Badge */}
      <span className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--ink-3)', fontWeight: 600, paddingRight: 4 }}>
        {entry.groupName}
      </span>

      {[entry.played, entry.wins, entry.draws, entry.losses].map((v, i) => (
        <span
          key={i}
          className="mono tnum"
          style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink-2)', paddingRight: 4 }}
        >
          {v}
        </span>
      ))}

      <span className="mono tnum" style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink-3)', paddingRight: 4 }}>
        {entry.goalsFor}:{entry.goalsAgainst}
      </span>

      <span
        className="serif tnum"
        style={{
          fontSize: 16,
          textAlign: 'right',
          fontWeight: 600,
          color: 'var(--ink)',
        }}
      >
        {entry.points}
      </span>
    </div>
  );
}