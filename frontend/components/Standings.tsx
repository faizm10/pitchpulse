'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flag } from './Shared';
import type { StandingsGroupBlock, GroupStandingEntry } from '@/types/espn';
import { teamCodeFromDisplayName } from '@/lib/team-codes';
import { StandingsSkeleton } from '@/components/skeleton/TeamPagesSkeleton';
import { teams } from '@/lib/data';
import { useWindowWidth } from '@/hooks/useWindowWidth';

// ── Colour helpers ────────────────────────────────────────────────────────────

const QUALIFY_GREEN = '#22c55e';   // top-2 / top-8 advance
const THIRD_YELLOW  = '#f59e0b';   // 3rd place — candidate

function teamPrimaryColor(code: string | null | undefined): string | null {
  if (!code) return null;
  return (teams as Record<string, { flag?: string[] }>)[code]?.flag?.[0] ?? null;
}

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

// ── Shared Layout Grid Tracks ────────────────────────────────────────────────
// Creating shared layout strings ensures the header grid tracks mirror the row grid tracks perfectly.
const GROUP_ROW_GRID_MOBILE = '16px 22px 1fr 54px 44px 32px';
const GROUP_ROW_GRID_DESKTOP = '20px 24px 1fr 32px 32px 32px 32px 52px 36px';

const THIRD_ROW_GRID_MOBILE = '16px 22px 1fr 32px 44px 32px';
const THIRD_ROW_GRID_DESKTOP = '20px 24px 1fr 32px 32px 32px 32px 32px 52px 36px';


// ── Page ──────────────────────────────────────────────────────────────────────

export function Standings() {
  const [groups, setGroups] = useState<StandingsGroupBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const width = useWindowWidth();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const pad = isMobile ? '16px' : isTablet ? '24px' : '56px';

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
      <div style={{
        padding: isMobile ? '24px 16px 20px' : isTablet ? '32px 24px 20px' : '40px 56px 24px',
        borderBottom: '1px solid var(--rule)',
      }}>
        <div className="eyebrow">Group Stage · 12 Groups</div>
        <div className="headline" style={{ fontSize: isMobile ? 36 : isTablet ? 48 : 64, marginTop: 8 }}>
          The road to <em>the final.</em>
        </div>
        <div className="mono" style={{ marginTop: 14, fontSize: isMobile ? 10 : 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
          Top 2 from each group + 8 best third-placed teams advance · Final Jul 19 · MetLife
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: `32px ${pad} 80px` }}>
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
                { color: QUALIFY_GREEN, label: '1st – 2nd: automatic qualification' },
                { color: THIRD_YELLOW,  label: '3rd: best third-placed candidates' },
              ].map((l) => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 3, height: 16, borderRadius: 2, background: l.color }} />
                  <span className="mono" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--ink-3)' }}>
                    {l.label.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>

            {/* Group tables grid — single col on mobile, 2 col on tablet, auto on desktop */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? '1fr'
                : isTablet
                ? 'repeat(2, 1fr)'
                : 'repeat(auto-fill, minmax(480px, 1fr))',
              gap: isMobile ? 20 : 32,
              marginBottom: 56,
            }}>
              {groups.map((group) => (
                <GroupTable key={group.header} group={group} isMobile={isMobile} />
              ))}
            </div>

            {/* 3rd-place dashboard */}
            {thirdPlaceEntries.length > 0 && (
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <div style={{ padding: '12px 0', borderBottom: '1px solid var(--rule)', marginBottom: 16 }}>
                  <div className="mono" style={{ fontSize: isMobile ? 10 : 11, letterSpacing: '0.14em', color: 'var(--ink)' }}>
                    RANKINGS OF THIRD-PLACED TEAMS
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
                    Green indicator bar highlights the current 8 teams that will be advancing.
                  </div>
                </div>
                <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
                  {/* Third-place table header */}
                  <div style={{
                    padding: isMobile ? '12px 16px' : '12px 20px',
                    borderBottom: '1px solid var(--rule)',
                    display: 'grid',
                    gridTemplateColumns: isMobile ? THIRD_ROW_GRID_MOBILE : THIRD_ROW_GRID_DESKTOP,
                    alignItems: 'center',
                    background: 'var(--paper-2)',
                  }}>
                    {/* Span across Rank, Flag, and Team Name tracks */}
                    <span className="mono" style={{ gridColumn: 'span 3', fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>
                      RANK · TEAM
                    </span>
                    {isMobile ? (
                      <>
                        <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em', textAlign: 'right' }}>GRP</span>
                        <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em', textAlign: 'right' }}>GF:GA</span>
                        <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em', textAlign: 'right' }}>PTS</span>
                      </>
                    ) : (
                      <>
                        {['GRP', 'P', 'W', 'D', 'L', 'GF:GA', 'PTS'].map((h) => (
                          <span key={h} className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em', textAlign: 'right' }}>{h}</span>
                        ))}
                      </>
                    )}
                  </div>
                  {thirdPlaceEntries.map((entry, idx) => {
                    const rank = idx + 1;
                    return (
                      <ThirdPlaceRow
                        key={entry.teamId}
                        entry={entry}
                        rank={rank}
                        advances={rank <= 8}
                        isMobile={isMobile}
                      />
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

// ── Group table ───────────────────────────────────────────────────────────────

function GroupTable({ group, isMobile }: { group: StandingsGroupBlock; isMobile: boolean }) {
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '12px 16px' : '12px 20px',
        borderBottom: '1px solid var(--rule)',
        display: 'grid',
        gridTemplateColumns: isMobile ? GROUP_ROW_GRID_MOBILE : GROUP_ROW_GRID_DESKTOP,
        alignItems: 'center',
        background: 'var(--paper-2)',
      }}>
        {/* Title spans across Rank, Flag, and Team Name columns */}
        <div style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center' }}>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--ink)' }}>
            {group.header.toUpperCase()}
          </span>
        </div>
        {isMobile ? (
          <>
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.05em', textAlign: 'right' }}>W/D/L</span>
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.05em', textAlign: 'right' }}>GF:GA</span>
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.05em', textAlign: 'right' }}>PTS</span>
          </>
        ) : (
          <>
            {['P', 'W', 'D', 'L', 'GF:GA', 'PTS'].map((h) => (
              <span key={h} className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em', textAlign: 'right' }}>{h}</span>
            ))}
          </>
        )}
      </div>

      {group.entries.map((entry, i) => (
        <GroupRow
          key={entry.teamId}
          entry={entry}
          rank={i + 1}
          total={group.entries.length}
          isMobile={isMobile}
        />
      ))}
    </div>
  );
}

// ── Group row ─────────────────────────────────────────────────────────────────

function GroupRow({ entry, rank, isMobile }: { entry: GroupStandingEntry; rank: number; total: number; isMobile: boolean }) {
  const code = teamCodeFromDisplayName(entry.name, entry.abbreviation);
  const color = teamPrimaryColor(code);

  const advances = rank <= 2;
  const isFirst  = rank === 1;
  const isThird  = rank === 3;

  const barColor   = advances ? QUALIFY_GREEN : isThird ? THIRD_YELLOW : 'transparent';
  const barWidth   = advances ? (isFirst ? 4 : 3) : isThird ? 3 : 0;
  const barOpacity = advances ? 1 : isThird ? 1 : 0;

  const bgColor = advances
    ? `rgba(34,197,94,0.06)`
    : isThird
    ? `rgba(245,158,11,0.05)`
    : 'var(--paper)';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? GROUP_ROW_GRID_MOBILE : GROUP_ROW_GRID_DESKTOP,
      gap: 0,
      alignItems: 'center',
      padding: isMobile ? '10px 16px' : '11px 20px',
      borderTop: rank === 1 ? 'none' : '1px solid var(--rule-soft)',
      background: bgColor,
      position: 'relative',
      transition: 'background 0.2s',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: barWidth,
        background: barColor,
        opacity: barOpacity,
        borderStyle: isThird ? 'dashed' : 'solid',
        borderColor: isThird ? 'var(--ink-3)' : 'transparent',
      }} />

      {/* Rank */}
      <span className="mono tnum" style={{
        fontSize: 11,
        color: advances ? QUALIFY_GREEN : isThird ? THIRD_YELLOW : 'var(--ink-3)',
        fontWeight: isFirst ? 700 : 400,
      }}>
        {rank}
      </span>

      {/* Flag */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Flag code={code} w={isMobile ? 16 : 18} h={isMobile ? 10 : 12} />
      </div>

      {/* Team name */}
      <TeamNameLink entry={entry} advances={advances} color={advances ? null : isThird ? THIRD_YELLOW : null} isMobile={isMobile} />

      {isMobile ? (
        <>
          <span className="mono tnum" style={{ fontSize: 11, textAlign: 'right', color: 'var(--ink-2)' }}>
            {entry.wins}-{entry.draws}-{entry.losses}
          </span>
          <span className="mono tnum" style={{ fontSize: 11, textAlign: 'right', color: 'var(--ink-3)' }}>
            {entry.goalsFor}:{entry.goalsAgainst}
          </span>
          <span className="serif tnum" style={{
            fontSize: 15,
            textAlign: 'right',
            fontWeight: isFirst ? 700 : advances ? 600 : 400,
            color: advances ? QUALIFY_GREEN : isThird ? THIRD_YELLOW : 'var(--ink-2)',
          }}>
            {entry.points}
          </span>
        </>
      ) : (
        <>
          {[entry.played, entry.wins, entry.draws, entry.losses].map((v, i) => (
            <span key={i} className="mono tnum" style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink-2)' }}>
              {v}
            </span>
          ))}
          <span className="mono tnum" style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink-3)' }}>
            {entry.goalsFor}:{entry.goalsAgainst}
          </span>
          <span className="serif tnum" style={{
            fontSize: 16,
            textAlign: 'right',
            fontWeight: isFirst ? 700 : advances ? 600 : 400,
            color: advances ? QUALIFY_GREEN : isThird ? THIRD_YELLOW : 'var(--ink-2)',
          }}>
            {entry.points}
          </span>
        </>
      )}
    </div>
  );
}

// ── Team name with optional link ──────────────────────────────────────────────

function TeamNameLink({
  entry, advances, color, isMobile,
}: {
  entry: GroupStandingEntry;
  advances: boolean;
  color: string | null;
  isMobile: boolean;
}) {
  const code = teamCodeFromDisplayName(entry.name, entry.abbreviation);
  const style = {
    fontSize: isMobile ? 13 : 15,
    paddingLeft: isMobile ? 8 : 10,
    paddingRight: 8,
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

function ThirdPlaceRow({ entry, rank, advances, isMobile }: {
  entry: ThirdPlaceEntry;
  rank: number;
  advances: boolean;
  isMobile: boolean;
}) {
  const code = teamCodeFromDisplayName(entry.name, entry.abbreviation);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? THIRD_ROW_GRID_MOBILE : THIRD_ROW_GRID_DESKTOP,
      gap: 0,
      alignItems: 'center',
      padding: isMobile ? '10px 16px' : '11px 20px',
      borderTop: rank === 1 ? 'none' : '1px solid var(--rule-soft)',
      background: advances ? 'rgba(34,197,94,0.06)' : 'var(--paper)',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: advances ? QUALIFY_GREEN : 'transparent',
      }} />

      <span className="mono tnum" style={{
        fontSize: 11,
        color: advances ? QUALIFY_GREEN : 'var(--ink-3)',
        fontWeight: advances ? 600 : 400,
      }}>{rank}</span>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Flag code={code} w={isMobile ? 16 : 18} h={isMobile ? 10 : 12} />
      </div>

      <TeamNameLink entry={entry} advances={advances} color={null} isMobile={isMobile} />

      <span className="mono" style={{ fontSize: 11, textAlign: 'right', color: 'var(--ink-3)', fontWeight: 600 }}>
        {entry.groupName}
      </span>

      {isMobile ? (
        <>
          <span className="mono tnum" style={{ fontSize: 11, textAlign: 'right', color: 'var(--ink-3)' }}>
            {entry.goalsFor}:{entry.goalsAgainst}
          </span>
          <span className="serif tnum" style={{ fontSize: 15, textAlign: 'right', fontWeight: 600, color: advances ? QUALIFY_GREEN : 'var(--ink-2)' }}>
            {entry.points}
          </span>
        </>
      ) : (
        <>
          {[entry.played, entry.wins, entry.draws, entry.losses].map((v, i) => (
            <span key={i} className="mono tnum" style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink-2)' }}>{v}</span>
          ))}
          <span className="mono tnum" style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink-3)' }}>
            {entry.goalsFor}:{entry.goalsAgainst}
          </span>
          <span className="serif tnum" style={{ fontSize: 16, textAlign: 'right', fontWeight: 600, color: advances ? QUALIFY_GREEN : 'var(--ink-2)' }}>
            {entry.points}
          </span>
        </>
      )}
    </div>
  );
}