'use client';

import { useEffect, useState } from 'react';
import { Flag } from './Shared';
import type { StandingsGroupBlock, GroupStandingEntry } from '@/types/espn';

const NAME_TO_ABB: Record<string, string> = {
    "Mexico": "MEX", "South Africa": "RSA", "South Korea": "KOR", "Czechia": "CZE",
    "Canada": "CAN", "Bosnia-Herzegovina": "BIH", "Qatar": "QAT", "Switzerland": "SUI",
    "Brazil": "BRA", "Morocco": "MAR", "Haiti": "HAI", "Scotland": "SCO",
    "United States": "USA", "Paraguay": "PAR", "Australia": "AUS", "Türkiye": "TUR",
    "Germany": "GER", "Curacao": "CUW", "Ivory Coast": "CIV", "Ecuador": "ECU",
    "Netherlands": "NED", "Japan": "JPN", "Sweden": "SWE", "Tunisia": "TUN",
    "Belgium": "BEL", "Egypt": "EGY", "Iran": "IRN", "New Zealand": "NZL",
    "Spain": "ESP", "Cape Verde": "CPV", "Saudi Arabia": "KSA", "Uruguay": "URU",
    "France": "FRA", "Senegal": "SEN", "Iraq": "IRQ", "Norway": "NOR",
    "Argentina": "ARG", "Algeria": "ALG", "Austria": "AUT", "Jordan": "JOR",
    "Portugal": "POR", "Congo DR": "COD", "Uzbekistan": "UZB", "Colombia": "COL",
    "England": "ENG", "Croatia": "CRO", "Ghana": "GHA", "Panama": "PAN",
  };

export function Standings() {
  const [groups, setGroups] = useState<StandingsGroupBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  console.log(groups.flatMap(g => g.entries.map(e => `${e.name}: "${e.abbreviation}"`)));

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
        {loading && (
          <div className="serif it" style={{ fontSize: 28, color: 'var(--ink-3)' }}>
            Loading standings...
          </div>
        )}

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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
              gap: 32,
            }}
          >
            {groups.map((group) => (
              <GroupTable key={group.header} group={group} />
            ))}
          </div>
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
        <Flag code={entry.abbreviation || NAME_TO_ABB[entry.name] || ''} w={18} h={12} />
      </div>

      {/* Team name */}
      <span
        className="serif"
        style={{
          fontSize: 15,
          paddingLeft: 10,
          color: advances ? 'var(--ink)' : 'var(--ink-2)',
          fontStyle: advances ? 'normal' : 'normal',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {entry.name}
      </span>

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