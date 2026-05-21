'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flag } from './Shared';

interface LiveBracketMatch {
  id: string;
  a: string | null;
  b: string | null;
  aName: string;
  bName: string;
  score: [number, number] | null;
  status: 'live' | 'ft' | 'upcoming';
  displayClock: string;
  date: string;
  venue: { name: string; city: string };
}

interface LiveBracket {
  R32: LiveBracketMatch[];
  R16: LiveBracketMatch[];
  QF: LiveBracketMatch[];
  SF: LiveBracketMatch[];
  F: LiveBracketMatch[];
}

/** Fixed slot geometry so gutters and pair blocks stay aligned across rounds */
const CARD_H = 106;
const SLOT_GAP = 14;
const PAIR_GAP = 20;
const GUTTER_W = 44;
const H0 = 2 * CARD_H + SLOT_GAP;

type RoundId = keyof LiveBracket;

interface RoundConfig {
  id: RoundId;
  label: string;
  mergeLevel: number;
  slotsPerPair: 1 | 2;
}

const ROUNDS: RoundConfig[] = [
  { id: 'R32', label: 'Round of 32', mergeLevel: 0, slotsPerPair: 2 },
  { id: 'R16', label: 'Round of 16', mergeLevel: 0, slotsPerPair: 1 },
  { id: 'QF', label: 'Quarter-finals', mergeLevel: 1, slotsPerPair: 1 },
  { id: 'SF', label: 'Semi-finals', mergeLevel: 2, slotsPerPair: 1 },
  { id: 'F', label: 'Final', mergeLevel: 3, slotsPerPair: 1 },
];

const blank = (id: string): LiveBracketMatch => ({
  id,
  a: null,
  b: null,
  aName: '',
  bName: '',
  score: null,
  status: 'upcoming',
  displayClock: '',
  date: '',
  venue: { name: '', city: '' },
});

const STATIC_HINTS: LiveBracket = {
  R32: Array.from({ length: 16 }, (_, i) =>
    blank(`r${String(i + 1).padStart(2, '0')}`)
  ),
  R16: Array.from({ length: 8 }, (_, i) => blank(`m${i + 1}`)),
  QF: Array.from({ length: 4 }, (_, i) => blank(`q${i + 1}`)),
  SF: Array.from({ length: 2 }, (_, i) => blank(`s${i + 1}`)),
  F: [blank('f1')],
};

const R32_HINTS = [
  ['2A', '2B'],
  ['1E', '3rd A/B/C/D/F'],
  ['1F', '2C'],
  ['1C', '2F'],
  ['2E', '2I'],
  ['1I', '3rd C/D/F/G/H'],
  ['1A', '3rd C/E/F/H/I'],
  ['1L', '3rd E/H/I/J/K'],
  ['1D', '3rd B/E/F/I/J'],
  ['1G', '3rd A/E/H/I/J'],
  ['2K', '2L'],
  ['1K', '3rd A/B/D/E/G'],
  ['2D', '2G'],
  ['1H', '2J'],
  ['1J', '2H'],
  ['1B', '3rd A/C/D/F/L'],
];

const ROUND_SIZES: Record<RoundId, number> = {
  R32: 16,
  R16: 8,
  QF: 4,
  SF: 2,
  F: 1,
};

function padRound(
  matches: LiveBracketMatch[],
  size: number,
  idPrefix: string
): LiveBracketMatch[] {
  const out = matches.slice(0, size);
  while (out.length < size) {
    out.push(blank(`${idPrefix}${out.length + 1}`));
  }
  return out;
}

function normalizeBracket(raw: Partial<LiveBracket>): LiveBracket {
  return {
    R32: padRound(raw.R32 ?? [], ROUND_SIZES.R32, 'r'),
    R16: padRound(raw.R16 ?? [], ROUND_SIZES.R16, 'm'),
    QF: padRound(raw.QF ?? [], ROUND_SIZES.QF, 'q'),
    SF: padRound(raw.SF ?? [], ROUND_SIZES.SF, 's'),
    F: padRound(raw.F ?? [], ROUND_SIZES.F, 'f'),
  };
}

function isPlaceholderName(name: string): boolean {
  const n = name.trim();
  if (!n || /^tbd$/i.test(n)) return true;
  return (
    /winner/i.test(n) ||
    /^group\s/i.test(n) ||
    /^third\b/i.test(n) ||
    /^3rd\b/i.test(n) ||
    /^round of/i.test(n) ||
    /^quarter-?final/i.test(n) ||
    /^semi-?final/i.test(n)
  );
}

function shortenPlaceholder(name: string): string {
  const n = name.trim();

  // 1. Match Round of 32 / 16 Winners (e.g., "Round of 16 3 Winner")
  let m = n.match(/round of 32\s+(\d+)\s+Winner/i);
  if (m) return `R32 W${m[1]}`;
  
  m = n.match(/round of 16\s+(\d+)\s+Winner/i);
  if (m) return `R16 W${m[1]}`;

  // 2. Match Quarterfinal / Semifinal Winners (e.g., "Quarterfinal 1 Winner")
  m = n.match(/quarter\-?finals?\s+(\d+)\s+Winner/i);
  if (m) return `QF W${m[1]}`;
  
  m = n.match(/semi\-?finals?\s+(\d+)\s+Winner/i);
  if (m) return `SF W${m[1]}`;

  // 3. Match Group Winners (e.g., "Group C Winner")
  m = n.match(/group\s+([a-l])\s+Winner/i);
  if (m) return `1${m[1].toUpperCase()}`;

  // 4. Match Group 2nd Places (e.g., "Group A 2nd Place")
  m = n.match(/group\s+([a-l])\s+2nd\s+Place/i);
  if (m) return `2${m[1].toUpperCase()}`;

  // 5. Clean up Third Place groups (e.g., "Third Place Group A/B/C/D/F" -> "3rd A/B/C/D/F")
  if (/^third place\b/i.test(n)) {
    return n.replace(/^third place\s+/i, '3rd ');
  }

  return n;
}
function bracketSlotLabel(
  code: string | null,
  hint: string | undefined,
  apiName: string | undefined
): { display: string; full: string; isPlaceholder: boolean } {
  const api = apiName?.trim() ?? '';
  const hintText = hint?.trim() ?? '';

  if (api && isPlaceholderName(api)) {
    return { display: shortenPlaceholder(api), full: api, isPlaceholder: true };
  }

  if (code) {
    const display = api || hintText || 'TBD';
    return { display, full: display, isPlaceholder: false };
  }

  if (hintText) {
    const full = api || hintText;
    return { display: hintText, full, isPlaceholder: true };
  }

  if (api) {
    return { display: api, full: api, isPlaceholder: false };
  }

  return { display: 'TBD', full: 'TBD', isPlaceholder: true };
}
const R32_DATES = [
  'Jun 28',
  'Jun 29',
  'Jun 29',
  'Jun 29',
  'Jun 30',
  'Jun 30',
  'Jul 1',
  'Jul 1',
  'Jul 2',
  'Jul 2',
  'Jul 2',
  'Jul 3',
  'Jul 3',
  'Jul 3',
  'Jul 4',
  'Jul 4',
];

function pairBlockHeight(mergeLevel: number): number {
  let h = H0;
  for (let i = 0; i < mergeLevel; i++) {
    h = 2 * h + PAIR_GAP;
  }
  return h;
}

function feederCentersY(
  height: number,
  mergeLevel: number
): [number, number] {
  if (mergeLevel === 0) {
    const y0 = CARD_H / 2;
    const y1 = CARD_H + SLOT_GAP + CARD_H / 2;
    return [y0, y1];
  }
  const childH = pairBlockHeight(mergeLevel - 1);
  const y0 = childH / 2;
  const y1 = childH + PAIR_GAP + childH / 2;
  return [y0, y1];
}

export function Bracket() {
  const [bracket, setBracket] = useState<LiveBracket>(STATIC_HINTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/bracket');
        const data = await res.json();
        const b = data.bracket as Partial<LiveBracket>;
        setBracket(
          normalizeBracket(
            Object.keys(b).length ? b : STATIC_HINTS
          )
        );
      } catch {
        /* keep static hints */
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const allMatches = [
    ...bracket.R32,
    ...bracket.R16,
    ...bracket.QF,
    ...bracket.SF,
    ...bracket.F,
  ];

  const liveCount = allMatches.filter((m) => m.status === 'live').length;
  const playedCount = allMatches.filter((m) => m.status === 'ft').length;
  const winner =
    bracket.F[0]?.status === 'ft' ? getWinner(bracket.F[0]) : null;

  return (
    <div className="screen bracket-screen">
      <div className="bracket-hero">
        <div className="eyebrow">Knockout · Round of 32 → Final</div>
        <div className="headline bracket-headline">
          The path to <em>MetLife.</em>
        </div>
        <div className="mono bracket-hero-meta">
          {loading
            ? 'Loading bracket…'
            : `${playedCount} matches played · ${
                liveCount > 0 ? `${liveCount} live · ` : ''
              }Final Jul 19, 2026`}
        </div>
      </div>

      <div className="bracket-scroll bracket-grid">
        <div className="bracket-board">
          {ROUNDS.map((round, roundIndex) => {
            const matches = bracket[round.id];
            const pairCount = Math.ceil(
              matches.length / round.slotsPerPair
            );

            return (
              <span key={round.id} style={{ display: 'contents' }}>
                {roundIndex > 0 && (
                  <GutterColumn
                    count={pairCount}
                    mergeLevel={round.mergeLevel}
                  />
                )}
                <RoundColumn
                  round={round}
                  matches={matches}
                  hints={round.id === 'R32' ? R32_HINTS : undefined}
                  dates={round.id === 'R32' ? R32_DATES : undefined}
                  isFinal={round.id === 'F'}
                />
              </span>
            );
          })}
          <TrophyColumn
            winner={winner}
            slotHeight={pairBlockHeight(3)}
          />
        </div>
      </div>
    </div>
  );
}

function getWinner(m: LiveBracketMatch): string | null {
  if (!m.score) return null;
  if (m.score[0] > m.score[1]) return m.aName;
  if (m.score[1] > m.score[0]) return m.bName;
  return null;
}

function GutterColumn({
  count,
  mergeLevel,
}: {
  count: number;
  mergeLevel: number;
}) {
  const cellH = pairBlockHeight(mergeLevel);

  return (
    <div
      className="bracket-gutter-col"
      style={{ width: GUTTER_W }}
      aria-hidden
    >
      <div className="bracket-col-label bracket-col-label--spacer" />
      <div className="bracket-col-body">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="bracket-gutter-cell"
            style={{
              height: cellH,
              marginBottom: i < count - 1 ? PAIR_GAP : 0,
            }}
          >
            <BracketConnector
              width={GUTTER_W}
              height={cellH}
              mergeLevel={mergeLevel}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketConnector({
  width,
  height,
  mergeLevel,
}: {
  width: number;
  height: number;
  mergeLevel: number;
}) {
  const [y0, y1] = feederCentersY(height, mergeLevel);
  const yMid = height / 2;
  const midX = width * 0.5;
  const stroke = 'var(--rule)';

  return (
    <svg
      className="bracket-gutter-svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <path
        d={`M 0 ${y0} H ${midX} M 0 ${y1} H ${midX} M ${midX} ${y0} V ${yMid} M ${midX} ${y1} V ${yMid} M ${midX} ${yMid} H ${width}`}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function RoundColumn({
  round,
  matches,
  hints,
  dates,
  isFinal,
}: {
  round: RoundConfig;
  matches: LiveBracketMatch[];
  hints?: string[][];
  dates?: string[];
  isFinal?: boolean;
}) {
  const blockH = pairBlockHeight(round.mergeLevel);
  const pairCount = Math.ceil(matches.length / round.slotsPerPair);

  return (
    <div
      className={`bracket-col ${isFinal ? 'bracket-col--final' : ''}`}
    >
      <div className="mono bracket-col-label">{round.label.toUpperCase()}</div>
      <div className="bracket-col-body">
        {Array.from({ length: pairCount }, (_, pairIndex) => {
          const slotIndexes =
            round.slotsPerPair === 2
              ? [pairIndex * 2, pairIndex * 2 + 1]
              : [pairIndex];

          return (
            <div
              key={pairIndex}
              className={`bracket-pair-block ${
                round.slotsPerPair === 1
                  ? 'bracket-pair-block--single'
                  : ''
              }`}
              style={{
                minHeight: blockH,
                marginBottom:
                  pairIndex < pairCount - 1 ? PAIR_GAP : 0,
              }}
            >
              {slotIndexes.map((matchIndex, slotIndex) => {
                const m = matches[matchIndex];
                if (!m) return null;

                return (
                  <div
                    key={m.id}
                    className="bracket-slot"
                    style={
                      round.slotsPerPair === 2 && slotIndex === 0
                        ? { marginBottom: SLOT_GAP }
                        : undefined
                    }
                  >
                    <Card
                      m={m}
                      hintA={hints?.[matchIndex]?.[0]}
                      hintB={hints?.[matchIndex]?.[1]}
                      date={dates?.[matchIndex]}
                      isFinal={isFinal}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({
  m,
  hintA,
  hintB,
  date,
  isFinal,
}: {
  m: LiveBracketMatch;
  hintA?: string;
  hintB?: string;
  date?: string;
  isFinal?: boolean;
}) {
  const isLive = m.status === 'live';
  const isFt = m.status === 'ft';
  const hasTeams = !!(m.a || m.b);

  const winner: 'a' | 'b' | null =
    isFt && m.score
      ? m.score[0] > m.score[1]
        ? 'a'
        : m.score[1] > m.score[0]
          ? 'b'
          : null
      : null;

  const displayDate = date
    ? date
    : m.date
      ? new Date(m.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : '—';

  const card = (
    <div
      className={`bracket-card ${isFinal ? 'is-final' : ''} ${
        isLive ? 'is-live' : ''
      }`}
      style={{ minHeight: CARD_H }}
    >
      <div className="bracket-card-meta">
        <span>{displayDate}</span>
        {isLive ? (
          <span className="bracket-live-pill">LIVE {m.displayClock}</span>
        ) : (
          <span className="bracket-venue">
            {m.venue?.city?.toUpperCase() || '—'}
          </span>
        )}
      </div>

      <TeamRow
        code={m.a}
        hint={hintA}
        apiName={m.aName}
        score={m.score?.[0]}
        dim={winner === 'b'}
        won={winner === 'a'}
      />

      <div className="bracket-card-divider" />

      <TeamRow
        code={m.b}
        hint={hintB}
        apiName={m.bName}
        score={m.score?.[1]}
        dim={winner === 'a'}
        won={winner === 'b'}
      />
    </div>
  );

  if (!hasTeams) return card;

  return (
    <Link href={`/match/${m.id}`} className="bracket-link">
      {card}
    </Link>
  );
}

function TeamRow({
  code,
  hint,
  apiName,
  score,
  dim,
  won,
}: {
  code: string | null;
  hint?: string;
  apiName?: string;
  score?: number;
  dim: boolean;
  won?: boolean;
}) {
  const { display, full, isPlaceholder } = bracketSlotLabel(code, hint, apiName);

  // first column:
  {code && !isPlaceholder ? (
    <Flag code={code} w={20} h={14} />
  ) : (
    <span className="bracket-slot-icon" />
  )}  const isHint = !code;

  return (
    <div
      className={`bracket-team-row ${dim ? 'is-dim' : ''} ${
        won ? 'bracket-team-winner' : ''
      }`}
    >
      {code ? (
        <Flag code={code} w={20} h={14} />
      ) : (
        <span className="bracket-slot-icon" />
      )}

      <span
        className={isHint ? 'bracket-team-hint' : 'bracket-team-name'}
        title={full !== display ? full : undefined}
      >
        {display}
      </span>

      <span className="mono tnum bracket-score">
        {score !== undefined && score !== null ? score : '—'}
      </span>
    </div>
  );
}

function TrophyColumn({
  winner,
  slotHeight,
}: {
  winner: string | null;
  slotHeight: number;
}) {
  return (
    <div className="bracket-col bracket-trophy-col">
      <div className="mono bracket-col-label">WINNER</div>
      <div
        className="bracket-col-body bracket-trophy-body"
        style={{ minHeight: slotHeight }}
      >
        <div className="bracket-trophy-wrap">
          <div className="bracket-trophy">
            <span className="bracket-trophy-icon">🏆</span>
            {winner ? (
              <span className="serif bracket-trophy-name">{winner}</span>
            ) : (
              <span className="serif it bracket-trophy-placeholder">
                To be
                <br />
                written
              </span>
            )}
          </div>
          <div className="mono bracket-trophy-date">
            JUL 19
            <br />
            METLIFE
          </div>
        </div>
      </div>
    </div>
  );
}
