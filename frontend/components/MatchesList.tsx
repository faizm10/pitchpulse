'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { stadiums } from '@/lib/data';
import { Flag } from './Shared';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live', dot: 'var(--live)' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'ft', label: 'Full time' },
] as const;

type FilterId = 'all' | 'live' | 'upcoming' | 'ft';

export function MatchesList() {
  const [filter, setFilter] = useState<FilterId>('all');
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await fetch('/api/scores');
        const data = await res.json();

        console.log('matches:', data); // <-- check states here


        setMatches(data.matches || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadMatches();
  }, []);

  const filtered = matches.filter((m) => {
    if (filter === 'live') return m.state === 'in';
    if (filter === 'ft') return m.state === 'post';
    if (filter === 'upcoming') return m.state === 'pre';

    return true;
  });

  return (
    <div className="screen">
      <div
        style={{
          padding: '40px 56px 24px',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <div className="eyebrow">
          All matches · {filtered.length} scheduled
        </div>

        <div
          className="headline"
          style={{ fontSize: 64, marginTop: 8 }}
        >
          Every kickoff,
          <br />
          <em>in one place.</em>
        </div>

        <div
          style={{
            marginTop: 24,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                cursor: 'pointer',
                background:
                  filter === f.id
                    ? 'var(--ink)'
                    : 'transparent',
                color:
                  filter === f.id
                    ? 'var(--paper)'
                    : 'var(--ink)',
                border: '1px solid var(--rule)',
                borderRadius: 999,
                padding: '8px 16px',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {'dot' in f && f.dot && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: f.dot,
                  }}
                />
              )}

              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '32px 56px 64px' }}>
        {loading && (
          <div
            className="serif it"
            style={{
              fontSize: 28,
              color: 'var(--ink-3)',
            }}
          >
            Loading matches...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div
              className="serif it"
              style={{
                fontSize: 28,
                color: 'var(--ink-3)',
              }}
            >
              No matches found.
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: 0 }}>
          {filtered.map((m) => (
            <MatchListRow key={m.id} m={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchListRow({ m }: { m: any }) {
  const router = useRouter();

  const stadium = stadiums.find(
    (s) =>
      s.city?.toLowerCase() ===
      m.venue?.city?.toLowerCase()
  );

  return (
    <div
      onClick={() => router.push(`/match/${m.id}`)}
      style={{
        display: 'grid',
        gridTemplateColumns:
          '140px 1fr auto 1fr 160px 28px',
        gap: 24,
        padding: '20px 0',
        borderTop: '1px solid var(--rule-soft)',
        alignItems: 'center',
        cursor: 'pointer',
      }}
    >
      <div>
        {m.state === 'in' && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--live)',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
            }}
          >
            <span className="status-dot live" />
            LIVE · {m.displayClock}
          </span>
        )}

        {m.state === 'post' && (
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--ink-3)',
              letterSpacing: '0.12em',
            }}
          >
            FULL TIME
          </span>
        )}

        {m.state === 'pre' && (
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--ink-2)',
              letterSpacing: '0.12em',
            }}
          >
            {new Date(m.date).toLocaleString()}
          </span>
        )}
      </div>

      {/* Home team */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          justifyContent: 'flex-end',
        }}
      >
        <span
          className="serif"
          style={{ fontSize: 22 }}
        >
          {m.homeTeam.name}
        </span>

        <Flag
          code={m.homeTeam.abbreviation}
          w={32}
          h={20}
        />
      </div>

      {/* Score */}
      <div
        className="serif tnum"
        style={{
          fontSize: 28,
          minWidth: 80,
          textAlign: 'center',
        }}
      >
        {m.state === 'pre' ? (
          <span
            style={{
              color: 'var(--ink-3)',
              fontSize: 14,
              fontStyle: 'italic',
            }}
          >
            vs
          </span>
        ) : (
          `${m.homeTeam.score}–${m.awayTeam.score}`
        )}
      </div>

      {/* Away team */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <Flag
          code={m.awayTeam.abbreviation}
          w={32}
          h={20}
        />

        <span
          className="serif"
          style={{ fontSize: 22 }}
        >
          {m.awayTeam.name}
        </span>
      </div>

      {/* Stadium */}
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--ink-3)',
          letterSpacing: '0.12em',
          textAlign: 'right',
        }}
      >
        {m.venue?.city?.toUpperCase()}
        <br />

        <span style={{ opacity: 0.7 }}>
          {m.venue?.name?.toUpperCase()}
        </span>
      </div>

      <div
        style={{
          color: 'var(--ink-3)',
          fontSize: 16,
        }}
      >
        ›
      </div>
    </div>
  );
}