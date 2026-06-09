'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardMap } from './map/DashboardMap';
import { TeamSelector } from './journey/TeamSelector';
import { JourneyPanel } from './journey/JourneyPanel';
import { JourneyRoute } from './journey/JourneyRoute';
import { useJourneySimulator } from './journey/JourneySimulator';
import { countries, teams } from '@/lib/data';
import type { Match } from '@/types/espn';

export function MapView() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    fetch('/api/scores')
      .then((r) => r.json())
      .then((data) => { if (data.matches) setMatches(data.matches); })
      .catch(console.error);
  }, []);

  const sim = useJourneySimulator();

  // Auto-open journey for ?journey=XXX (set by the topbar "Follow Your Team" link)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('journey');
    if (code && teams[code]) {
      sim.selectTeam(code);
      // Clean the param from the URL without a reload
      window.history.replaceState({}, '', '/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="map-pane" style={{ position: 'relative' }}>
      <DashboardMap
        matches={matches}
        onSelectMatch={sim.isOpen ? undefined : (id) => router.push(`/match/${id}`)}
      >
        {sim.journey && (
          <JourneyRoute
            stops={sim.journey.stops}
            teamColor={sim.teamColor}
            triggerAnimate={sim.animateKey}
          />
        )}
      </DashboardMap>

      {/* Journey overlay UI (outside Map context) */}
      {sim.showSelector && (
        <TeamSelector onSelect={sim.selectTeam} onClose={sim.closeSelector} />
      )}
      {sim.journey && !sim.showSelector && (
        <JourneyPanel
          journey={sim.journey}
          scenario={sim.scenario}
          onScenarioChange={sim.changeScenario}
          onReplay={sim.replay}
          onClose={sim.closeSimulator}
        />
      )}

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', zIndex: 10,
        left: 32, right: 32, bottom: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', pointerEvents: 'auto', flexWrap: 'wrap' }}>
          {/* Journey CTA button */}
          {!sim.isOpen && (
            <button
              type="button"
              onClick={sim.openSimulator}
              style={{
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 999,
                background: 'rgba(10,14,22,0.75)',
                backdropFilter: 'blur(8px)',
                fontFamily: 'var(--mono)', fontSize: 11,
                letterSpacing: '0.08em', color: 'white',
                boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                transition: 'all 150ms',
              }}
            >
              <span style={{ fontSize: 14 }}>⚽</span>
              FOLLOW YOUR TEAM'S JOURNEY
            </button>
          )}

          {(['CA', 'US', 'MX'] as const).map((code) => {
            const cssVar = code === 'CA' ? 'var(--ca)' : code === 'US' ? 'var(--us)' : 'var(--mx)';
            return (
              <a
                key={code}
                href={`/country/${code}`}
                onClick={(e) => { e.preventDefault(); router.push(`/country/${code}`); }}
                style={{
                  cursor: 'pointer', textDecoration: 'none', color: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 13px', border: '1px solid var(--rule)', borderRadius: 999,
                  background: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: 11,
                  letterSpacing: '0.08em', boxShadow: '0 1px 4px rgba(14,22,38,0.08)',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: cssVar }} />
                {countries[code].name.toUpperCase()} · {countries[code].cities.length}
              </a>
            );
          })}
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          16 stadia · 3 nations · 104 matches
        </div>
      </div>
    </div>
  );
}
