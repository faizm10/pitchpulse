'use client';

import { useState, useEffect } from 'react';
import { useWindowWidth } from '@/hooks/useWindowWidth';
import Link from 'next/link';
import { stadiums } from '@/lib/data';
import { BackBar, Stat } from './Shared';
import { StadiumMiniMap } from './StadiumMiniMap';

interface WikipediaData {
  title: string;
  extract: string;
  thumbnail: string | null;
  url: string | null;
}

interface MatchData {
  id: string;
  date: string;
  name: string;
  state: string;
  statusDetail: string;
  homeTeam: { id: string; name: string; abbreviation: string; logo: string | null; score: string | null } | null;
  awayTeam: { id: string; name: string; abbreviation: string; logo: string | null; score: string | null } | null;
  venueName: string | null;
}

interface StadiumEnrichment {
  wikipedia: WikipediaData | null;
  matches: MatchData[];
}

export function StadiumView({ id }: { id: string }) {
  const s = stadiums.find((x) => x.id === id);
  const [enrichment, setEnrichment] = useState<StadiumEnrichment | null>(null);
  const [imgError, setImgError] = useState(false);
  const width = useWindowWidth();
  const isMobile = width < 640;
  const isTablet = width < 1024;
  const pad = isMobile ? '16px' : isTablet ? '24px' : '56px';

  useEffect(() => {
    fetch(`/api/stadium/${id}`)
      .then((r) => r.json())
      .then(setEnrichment)
      .catch(() => {});
  }, [id]);

  if (!s) return <div style={{ padding: 60 }}>Stadium not found</div>;

  const wiki = enrichment?.wikipedia ?? null;
  const espnMatches = enrichment?.matches ?? [];
  const heroImg = wiki?.thumbnail && !imgError ? wiki.thumbnail : null;
  const realName = wiki?.title ?? s.name;

  const sortedMatches = [...espnMatches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="screen" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <BackBar label={`${s.country === 'CA' ? 'CANADA' : s.country === 'MX' ? 'MEXICO' : 'UNITED STATES'} · STADIUM`} />

      {/* Hero image */}
      {heroImg && (
        <div style={{ position: 'relative', width: '100%', height: 380, overflow: 'hidden' }}>
          <img
            src={heroImg}
            alt={realName}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 65%, var(--paper) 100%)',
          }} />
        </div>
      )}

      <div style={{ padding: heroImg ? `0 ${pad} 48px` : `48px ${pad}`, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: isMobile ? 0 : 48, alignItems: 'start' }}>
        {/* Left: info column */}
        <div>
          {/* Name + description */}
          <div style={{ marginBottom: 40 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Stadium · {s.city.toUpperCase()}</div>
            <div className="headline" style={{ fontSize: 48, lineHeight: 1.1, marginBottom: 16 }}>{realName}</div>
            {wiki?.extract && (
              <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)', margin: 0 }}>
                {wiki.extract.length > 600 ? wiki.extract.slice(0, 600) + '…' : wiki.extract}
              </p>
            )}
            {wiki?.url && (
              <a href={wiki.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: 10, fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--mono)', letterSpacing: '0.08em' }}>
                Wikipedia ↗
              </a>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 24, borderTop: '1px solid var(--rule)', paddingTop: 22, marginBottom: 48 }}>
            <Stat n={s.capacity.toLocaleString()} l="Capacity" />
            <Stat n={String(s.opened)} l="Opened" />
            <Stat n={s.surface} l="Surface" />
            <Stat n={s.orientation} l="Orientation" />
          </div>

          {/* All WC2026 matches */}
          <div style={{ marginBottom: 56 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--ink-3)', marginBottom: 16 }}>
              WC2026 MATCHES AT THIS VENUE
            </div>
            {enrichment === null ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Loading matches…</div>
            ) : sortedMatches.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>No matches scheduled yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sortedMatches.map((m) => (
                  <MatchRow key={m.id} match={m} isMobile={isMobile} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: mini-map */}
        <div style={isMobile ? {} : { position: 'sticky', top: 80 }}>
          <div style={{ height: 420, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--rule)', boxShadow: '0 4px 24px rgba(14,22,38,0.08)' }}>
            <StadiumMiniMap lat={s.lat} lng={s.lng} name={realName} />
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)', letterSpacing: '0.08em', textAlign: 'center' }}>
            {s.city}{s.country === 'CA' ? ', Canada' : s.country === 'MX' ? ', Mexico' : ', USA'}
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchRow({ match, isMobile }: { match: MatchData; isMobile: boolean }) {
  const isLive = match.state === 'in';
  const isFT = match.state === 'post';
  const isPre = match.state === 'pre';

  const kickoff = new Date(match.date);
  const dateStr = kickoff.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const timeStr = kickoff.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

  const home = match.homeTeam;
  const away = match.awayTeam;

  return (
    <Link href={`/match/${match.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr auto 1fr' : '100px 1fr auto 1fr 100px',
        alignItems: 'center',
        gap: isMobile ? 8 : 12,
        padding: isMobile ? '12px 14px' : '14px 20px',
        borderRadius: 10,
        border: '1px solid var(--rule)',
        background: 'var(--paper-2)',
        cursor: 'pointer',
        transition: 'background 150ms',
      }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paper-3, var(--rule-soft))')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--paper-2)')}
      >
        {/* Date / status — hidden on mobile (3-col layout omits this) */}
        {!isMobile && (
          <div>
            <div className="mono" style={{ fontSize: 10, color: isLive ? 'var(--live)' : 'var(--ink-3)', letterSpacing: '0.1em', fontWeight: isLive ? 700 : 400 }}>
              {isLive ? '● LIVE' : isFT ? 'FULL TIME' : dateStr}
            </div>
            {isPre && (
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{timeStr}</div>
            )}
            {isFT && match.statusDetail && (
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{match.statusDetail}</div>
            )}
          </div>
        )}

        {/* Home team */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{home?.name ?? '—'}</span>
          {home?.logo && <img src={home.logo} alt={home.abbreviation} style={{ width: 24, height: 24, objectFit: 'contain' }} />}
        </div>

        {/* Score */}
        <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', textAlign: 'center', minWidth: 60 }}>
          {isPre ? 'vs' : `${home?.score ?? 0} – ${away?.score ?? 0}`}
        </div>

        {/* Away team */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {away?.logo && <img src={away.logo} alt={away.abbreviation} style={{ width: 24, height: 24, objectFit: 'contain' }} />}
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{away?.name ?? '—'}</span>
        </div>

        {/* Arrow — hidden on mobile */}
        {!isMobile && (
          <div style={{ textAlign: 'right', color: 'var(--ink-3)', fontSize: 14 }}>→</div>
        )}
      </div>
    </Link>
  );
}
