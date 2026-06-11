'use client';

import type { JourneyState } from '@/types/journey';

interface TeamTravelStatsProps {
  journey: JourneyState;
}

export function TeamTravelStats({ journey }: TeamTravelStatsProps) {
  const stats = [
    { n: journey.totalDistanceKm.toLocaleString(), l: 'km total' },
    { n: journey.citiesCount, l: 'cities' },
    { n: journey.stadiumsCount, l: 'stadiums' },
    { n: journey.stops.length, l: 'matches (full run)' },
  ];

  return (
    <div className="rail-team-stats">
      {stats.map(({ n, l }) => (
        <div key={l} className="rail-team-stats__cell">
          <div className="serif tnum rail-team-stats__value">{n}</div>
          <div className="mono rail-team-stats__label">{l}</div>
        </div>
      ))}
    </div>
  );
}
