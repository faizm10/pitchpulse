'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardMap } from './map/DashboardMap';
import { TeamSelector } from './journey/TeamSelector';
import { JourneyRoute } from './journey/JourneyRoute';
import { useTeamFollow } from './Providers';
import { countries, teams } from '@/lib/data';
import type { Match } from '@/types/espn';

export function MapView() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const {
    journey,
    showTeamPicker,
    animateKey,
    teamColor,
    selectFollowedTeam,
    clearFollowedTeam,
    closeTeamPicker,
    openTeamPicker,
  } = useTeamFollow();

  useEffect(() => {
    fetch('/api/scores')
      .then((r) => r.json())
      .then((data) => {
        if (data.matches) setMatches(data.matches);
      })
      .catch(console.error);
  }, []);

  // Handle ?journey= param for hard navigations from other pages
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const code = new URLSearchParams(window.location.search).get('journey');
    if (!code) return;
    window.history.replaceState({}, '', '/');
    if (code === 'open') openTeamPicker();
    else if (teams[code]) selectFollowedTeam(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="map-pane" style={{ position: 'relative' }}>
      <DashboardMap
        matches={matches}
        onSelectMatch={showTeamPicker ? undefined : (id) => router.push(`/match/${id}`)}
      >
        {journey && (
          <JourneyRoute
            stops={journey.stops}
            teamColor={teamColor}
            triggerAnimate={animateKey}
          />
        )}
      </DashboardMap>

      {showTeamPicker && (
        <TeamSelector
          onSelect={selectFollowedTeam}
          onClose={closeTeamPicker}
          onBrowse={() => { clearFollowedTeam(); closeTeamPicker(); }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          zIndex: 10,
          left: 32,
          right: 32,
          bottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            pointerEvents: 'auto',
            flexWrap: 'wrap',
          }}
        >
          {(['CA', 'US', 'MX'] as const).map((code) => {
            const cssVar =
              code === 'CA' ? 'var(--ca)' : code === 'US' ? 'var(--us)' : 'var(--mx)';
            return (
              <a
                key={code}
                href={`/country/${code}`}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/country/${code}`);
                }}
                style={{
                  cursor: 'pointer',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 13px',
                  border: '1px solid var(--rule)',
                  borderRadius: 999,
                  background: 'var(--paper)',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  boxShadow: '0 1px 4px rgba(14,22,38,0.08)',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: cssVar }} />
                {countries[code].name.toUpperCase()} · {countries[code].cities.length}
              </a>
            );
          })}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: 'var(--ink-3)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          16 stadia · 3 nations · 104 matches
        </div>
      </div>
    </div>
  );
}
