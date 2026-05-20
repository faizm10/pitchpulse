'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flag } from './Shared';

interface LiveBracketMatch {
  id: string;
  a: string |null;
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

export function Bracket() {
  const [bracket, setBracket] = useState<LiveBracket>(STATIC_HINTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/bracket');
        const data = await res.json();

        const b = data.bracket as LiveBracket;

        setBracket({
          R32: b.R32?.length ? b.R32 : STATIC_HINTS.R32,
          R16: b.R16?.length ? b.R16 : STATIC_HINTS.R16,
          QF: b.QF?.length ? b.QF : STATIC_HINTS.QF,
          SF: b.SF?.length ? b.SF : STATIC_HINTS.SF,
          F: b.F?.length ? b.F : STATIC_HINTS.F,
        });
      } catch {
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

  const liveCount = allMatches.filter(
    (m) => m.status === 'live'
  ).length;

  const playedCount = allMatches.filter(
    (m) => m.status === 'ft'
  ).length;

  const winner =
    bracket.F[0]?.status === 'ft'
      ? getWinner(bracket.F[0])
      : null;

  return (
    <div
      className="screen"
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top, rgba(255,215,0,0.08), transparent 35%)',
      }}
    >
      {/* HERO */}
      <div
        style={{
          padding: '52px 56px 40px',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <div className="eyebrow">
          Knockout · Round of 32 → Final
        </div>

        <div
          className="headline"
          style={{
            fontSize: 68,
            marginTop: 8,
            letterSpacing: '-0.04em',
            lineHeight: 0.95,
          }}
        >
          The path to <em>MetLife.</em>
        </div>

        <div
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--ink-3)',
            marginTop: 16,
            letterSpacing: '0.08em',
          }}
        >
          {loading
            ? 'Loading bracket…'
            : `${playedCount} matches played · ${
                liveCount > 0
                  ? `${liveCount} live · `
                  : ''
              }Final Jul 19, 2026`}
        </div>
      </div>

      {/* BRACKET */}
      <div
        style={{
          padding: '48px 32px 90px',
          overflowX: 'auto',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '100% 32px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              '280px 240px 220px 200px 180px 120px',
            minWidth: 1350,
            gap: 16,
            alignItems: 'stretch',
          }}
        >
          <Column
            label="Round of 32"
            matches={bracket.R32}
            hints={R32_HINTS}
            dates={R32_DATES}
          />

          <Column
            label="Round of 16"
            matches={bracket.R16}
          />

          <Column
            label="Quarter-finals"
            matches={bracket.QF}
          />

          <Column
            label="Semi-finals"
            matches={bracket.SF}
          />

          <Column
            label="Final"
            matches={bracket.F}
          />

          <TrophyColumn winner={winner} />
        </div>
      </div>
    </div>
  );
}

function getWinner(
  m: LiveBracketMatch
): string | null {
  if (!m.score) return null;

  if (m.score[0] > m.score[1]) return m.aName;

  if (m.score[1] > m.score[0]) return m.bName;

  return null;
}

function Column({
  label,
  matches,
  hints,
  dates,
}: {
  label: string;
  matches: LiveBracketMatch[];
  hints?: string[][];
  dates?: string[];
}) {
  const gap =
    label === 'Round of 32'
      ? 75
      : label === 'Round of 16'
      ? 256
      : label === 'Quarter-finals'
      ? 618
      : label === 'Semi-finals'
      ? 1340
      : 420;

  const top =
    label === 'Round of 16'
      ? 94
      : label === 'Quarter-finals'
      ? 276
      : label === 'Semi-finals'
      ? 615
      : label === 'Final'
      ? 460
      : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--ink-3)',
          letterSpacing: '0.16em',
          textAlign: 'center',
          paddingBottom: 16,
        }}
      >
        {label.toUpperCase()}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap,
          paddingTop: top,
          position: 'relative',
        }}
      >
        {matches.map((m, i) => {
          const connectorHeight =
            label === 'Round of 32'
              ? 92
              : label === 'Round of 16'
              ? 156
              : label === 'Quarter-finals'
              ? 306
              : 0;

          return (
            <div
              key={m.id}
              style={{
                position: 'relative',
              }}
            >
              {/* CARD */}
              <Card
                m={m}
                hintA={hints?.[i]?.[0]}
                hintB={hints?.[i]?.[1]}
                date={dates?.[i]}
                showLeftConnector={
                  label !== 'Round of 32'
                }
              />

              {/* RIGHT CONNECTOR */}
              {label !== 'Final' && (
                <div
                  style={{
                    position: 'absolute',
                    right: -24,
                    top: '50%',
                    width: 24,
                    height: 2,
                    transform: 'translateY(-50%)',
                    background: 'var(--rule)',
                    opacity: 0.7,
                  }}
                />
              )}

              {/* VERTICAL CONNECTOR */}
              {i % 2 === 0 &&
                label !== 'Final' && (
                  <div
                    style={{
                      position: 'absolute',
                      right: -24,
                      top: '50%',
                      width: 2,
                      height: connectorHeight,
                      background: 'var(--rule)',
                      opacity: 0.7,
                    }}
                  />
                )}
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
  showLeftConnector,
}: {
  m: LiveBracketMatch;
  hintA?: string;
  hintB?: string;
  date?: string;
  showLeftConnector?: boolean;
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
    ? new Date(m.date).toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
        }
      )
    : '—';

  const content = (
    <div
      style={{
        position: 'relative',
        borderRadius: 18,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(10px)',
        border:
          '1px solid rgba(255,255,255,0.08)',
        boxShadow:
          '0 6px 24px rgba(0,0,0,0.05)',
      }}
    >
      {/* LEFT CONNECTOR */}
      {showLeftConnector && (
        <div
          style={{
            position: 'absolute',
            left: -24,
            top: '50%',
            width: 24,
            height: 2,
            transform: 'translateY(-50%)',
            background: 'var(--rule)',
            opacity: 0.7,
          }}
        />
      )}

      {/* META */}
      <div
        style={{
          padding: '6px 10px',
          borderBottom:
            '1px solid var(--rule-soft)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--mono)',
          fontSize: 9,
          color: 'var(--ink-3)',
          letterSpacing: '0.08em',
        }}
      >
        <span>{displayDate}</span>

        {isLive ? (
          <span
            style={{
              background:
                'rgba(255,0,0,0.12)',
              color: '#ff4d4d',
              padding: '2px 7px',
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            LIVE {m.displayClock}
          </span>
        ) : (
          <span>
            {m.venue?.city?.toUpperCase()}
          </span>
        )}
      </div>

      {/* TEAM A */}
      <TeamRow
        code={m.a}
        name={m.aName || hintA}
        score={m.score?.[0]}
        dim={winner === 'b'}
        isHint={!m.a}
      />

      <div
        style={{
          height: 1,
          background: 'var(--rule-soft)',
        }}
      />

      {/* TEAM B */}
      <TeamRow
        code={m.b}
        name={m.bName || hintB}
        score={m.score?.[1]}
        dim={winner === 'a'}
        isHint={!m.b}
      />
    </div>
  );

  if (!hasTeams) return content;

  return (
    <Link
      href={`/match/${m.id}`}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
      }}
    >
      <div
        style={{
          transition:
            'transform 0.18s ease, box-shadow 0.18s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform =
            'translateY(-3px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform =
            'translateY(0)';
        }}
      >
        {content}
      </div>
    </Link>
  );
}

function TeamRow({
  code,
  name,
  score,
  dim,
  isHint,
}: {
  code: string | null;
  name?: string;
  score?: number;
  dim: boolean;
  isHint: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns:
          '20px 1fr 24px',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        opacity: dim ? 0.38 : 1,
      }}
    >
      {code ? (
        <Flag code={code} w={20} h={14} />
      ) : (
        <span
          style={{
            width: 20,
            height: 14,
            border:
              '1px dashed var(--rule)',
            borderRadius: 3,
          }}
        />
      )}

      <span
        style={{
          fontSize: 13,
          fontWeight: code ? 600 : 400,
          fontStyle: isHint
            ? 'italic'
            : 'normal',
          color: isHint
            ? 'var(--ink-3)'
            : 'var(--ink)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
        }}
      >
        {name || 'TBD'}
      </span>

      <span
        className="mono tnum"
        style={{
          fontSize: 13,
          textAlign: 'right',
          fontWeight:
            score !== undefined && !dim
              ? 700
              : 500,
          color:
            score !== undefined
              ? 'var(--ink)'
              : 'var(--ink-3)',
        }}
      >
        {score !== undefined &&
        score !== null
          ? score
          : '—'}
      </span>
    </div>
  );
}

function TrophyColumn({
  winner,
}: {
  winner: string | null;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--ink-3)',
          letterSpacing: '0.14em',
        }}
      >
        WINNER
      </div>

      <div
        style={{
          width: 100,
          borderRadius: 20,
          padding: '22px 12px',
          background:
            'linear-gradient(to bottom, rgba(255,215,0,0.10), rgba(255,255,255,0.04))',
          border:
            '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(10px)',
          boxShadow:
            '0 0 40px rgba(255,215,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 42 }}>
          🏆
        </span>

        {winner ? (
          <span
            className="serif"
            style={{
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {winner}
          </span>
        ) : (
          <span
            className="serif it"
            style={{
              fontSize: 11,
              color: 'var(--ink-3)',
              lineHeight: 1.5,
            }}
          >
            To be
            <br />
            written
          </span>
        )}
      </div>

      <div
        className="mono"
        style={{
          fontSize: 9,
          color: 'var(--ink-3)',
          letterSpacing: '0.12em',
          textAlign: 'center',
          lineHeight: 1.8,
        }}
      >
        JUL 19
        <br />
        METLIFE
      </div>
    </div>
  );
}