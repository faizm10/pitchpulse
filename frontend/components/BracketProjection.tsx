'use client';

import { useEffect, useState } from 'react';
import { computeLiveGroupEntries } from '@/lib/standings-utils';
import { teamCodeFromDisplayName } from '@/lib/team-codes';
import {
  R32_HINTS,
  R32_DATES,
  ROUNDS,
  blank,
  padRound,
  pairBlockHeight,
  GutterColumn,
  RoundColumn,
  TrophyColumn,
} from './Bracket';
import type { LiveBracket, LiveBracketMatch } from './Bracket';
import type { StandingsGroupBlock, GroupStandingEntry } from '@/types/espn';

// ── Derive projected R32 from current group standings ─────────────────────────

interface ThirdEntry extends GroupStandingEntry { groupLetter: string }

function sortThirds(a: ThirdEntry, b: ThirdEntry): number {
  if (b.points !== a.points) return b.points - a.points;
  const gdA = a.goalsFor - a.goalsAgainst;
  const gdB = b.goalsFor - b.goalsAgainst;
  if (gdB !== gdA) return gdB - gdA;
  return b.goalsFor - a.goalsFor;
}

function resolveThirdForSlot(
  hint: string,
  advancing: ThirdEntry[]
): ThirdEntry | null {
  const m = hint.match(/^3rd\s+([A-L/]+)/i);
  if (!m) return null;
  const eligible = m[1].split('/').map((g) => g.trim().toUpperCase());
  return advancing.find((t) => eligible.includes(t.groupLetter)) ?? null;
}


function buildProjectedBracket(
  groups: StandingsGroupBlock[],
  matchData: any[]
): LiveBracket {
  const processed = groups.map((g) => ({
    letter: g.header.replace(/group\s+/i, '').trim().toUpperCase(),
    entries: computeLiveGroupEntries(g.entries, matchData),
  }));

  const groupMap: Record<string, typeof processed[0]['entries']> = {};
  processed.forEach((g) => { groupMap[g.letter] = g.entries; });

  const allThirds: ThirdEntry[] = processed
    .map((g) => {
      const e = g.entries[2];
      return e ? { ...e, groupLetter: g.letter } : null;
    })
    .filter((e): e is ThirdEntry => e !== null)
    .sort(sortThirds);

  const advancing = allThirds.slice(0, 8);

  const r32: LiveBracketMatch[] = R32_HINTS.map(([hintA, hintB], i) => {
    const id = `proj-r${String(i + 1).padStart(2, '0')}`;
    const date = R32_DATES[i] ?? '';

    const resolveEntry = (hint: string): GroupStandingEntry | null => {
      const mPos = hint.match(/^([12])([A-L])$/i);
      if (mPos) {
        const pos = parseInt(mPos[1], 10) - 1;
        const letter = mPos[2].toUpperCase();
        return groupMap[letter]?.[pos] ?? null;
      }
      if (/^3rd/i.test(hint)) return resolveThirdForSlot(hint, advancing);
      return null;
    };

    const entryA = resolveEntry(hintA);
    const entryB = resolveEntry(hintB);
    const codeA = entryA ? (teamCodeFromDisplayName(entryA.name, entryA.abbreviation) || null) : null;
    const codeB = entryB ? (teamCodeFromDisplayName(entryB.name, entryB.abbreviation) || null) : null;

    return {
      id,
      a: codeA,
      b: codeB,
      aName: entryA ? (entryA.abbreviation || entryA.name) : hintA,
      bName: entryB ? (entryB.abbreviation || entryB.name) : hintB,
      score: null,
      status: 'upcoming' as const,
      displayClock: '',
      date,
      venue: { name: '', city: '' },
    };
  });

  return {
    R32: r32,
    R16: Array.from({ length: 8 }, (_, i) => blank(`proj-m${i + 1}`)),
    QF:  Array.from({ length: 4 }, (_, i) => blank(`proj-q${i + 1}`)),
    SF:  Array.from({ length: 2 }, (_, i) => blank(`proj-s${i + 1}`)),
    F:   [blank('proj-f1')],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BracketProjection() {
  const [bracket, setBracket] = useState<LiveBracket | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [standingsRes, scoresRes] = await Promise.all([
        fetch('/api/standings'),
        fetch('/api/scores'),
      ]);
      const standingsData = await standingsRes.json();
      const scoresData = await scoresRes.json();
      const groups: StandingsGroupBlock[] = standingsData.groups ?? [];
      const matches: any[] = scoresData.matches ?? [];
      if (groups.length > 0) setBracket(buildProjectedBracket(groups, matches));
    } catch {
      /* keep null */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center' }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
          LOADING PROJECTION…
        </span>
      </div>
    );
  }

  if (!bracket) {
    return (
      <div style={{ padding: '60px 0' }}>
        <span className="serif it" style={{ fontSize: 24, color: 'var(--ink-3)' }}>
          Standings data not yet available.
        </span>
      </div>
    );
  }

  const winner: string | null = null;

  return (
    <>
      <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em', marginBottom: 12 }}>
        PROJECTED FROM CURRENT GROUP STANDINGS · UPDATES EVERY 30S
      </div>

      <div className="bracket-scroll bracket-grid">
        <div className="mono bracket-scroll-hint" aria-hidden>
          SCROLL →
        </div>
        <div className="bracket-board">
          {ROUNDS.map((round, roundIndex) => {
            const matches = bracket[round.id];
            const pairCount = Math.ceil(matches.length / round.slotsPerPair);

            return (
              <span key={round.id} style={{ display: 'contents' }}>
                {roundIndex > 0 && (
                  <GutterColumn count={pairCount} mergeLevel={round.mergeLevel} />
                )}
                <RoundColumn
                  round={round}
                  matches={matches}
                  hints={round.id === 'R32' ? R32_HINTS : undefined}
                  dates={round.id === 'R32' ? R32_DATES : undefined}
                  isFinal={round.id === 'F'}
                  noLink
                />
              </span>
            );
          })}
          <TrophyColumn winner={winner} slotHeight={pairBlockHeight(3)} />
        </div>
      </div>
    </>
  );
}
