'use client';

import { getJourneyStopStageLabel } from '@/lib/journey';
import type { JourneyStop } from '@/types/journey';

function StopRow({ stop }: { stop: JourneyStop }) {
  const stageLabel = getJourneyStopStageLabel(stop);

  return (
    <div className="rail-team-stop">
      <div
        className="rail-team-stop__bar"
        style={{
          background: stop.confirmed ? 'var(--live)' : 'var(--ink-3)',
          opacity: stop.confirmed ? 1 : 0.5,
        }}
      />
      <div className="rail-team-stop__body">
        <div className="rail-team-stop__meta">
          <span
            className="mono"
            style={{ color: stop.confirmed ? 'var(--live)' : 'var(--ink-3)' }}
          >
            {stageLabel}
            {!stop.confirmed && ' · projected'}
          </span>
          <span className="mono rail-team-stop__date">{stop.date}</span>
        </div>
        <p className="rail-team-stop__venue">{stop.venueName}</p>
        <p className="mono rail-team-stop__city">
          {stop.confirmed ? `${stop.city} · vs ${stop.opponent}` : stop.city}
        </p>
      </div>
    </div>
  );
}

interface JourneyStopsListProps {
  stops: JourneyStop[];
}

export function JourneyStopsList({ stops }: JourneyStopsListProps) {
  return (
    <div className="rail-team-block">
      <div className="rail-h">
        <span>Your path</span>
        <div className="rail-team-stops__legend mono">
          <span>
            <span className="rail-team-stops__swatch rail-team-stops__swatch--confirmed" />
            confirmed
          </span>
          <span>
            <span className="rail-team-stops__swatch rail-team-stops__swatch--projected" />
            projected
          </span>
        </div>
      </div>
      <div className="rail-team-stops">
        {stops.map((stop, i) => (
          <StopRow key={`${stop.venueId}-${i}`} stop={stop} />
        ))}
      </div>
    </div>
  );
}
