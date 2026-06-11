'use client';

import { useEffect, useRef, useState } from 'react';
import { MapRoute, useMap } from '@/components/ui/map';
import type { JourneyStop } from '@/types/journey';

interface JourneyRouteProps {
  stops: JourneyStop[];
  teamColor: string;
  triggerAnimate: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function JourneyRoute({ stops, teamColor, triggerAnimate }: JourneyRouteProps) {
  const { map, isLoaded } = useMap();
  const [visibleCount, setVisibleCount] = useState(0);
  // Track which animateKey we last ran the flyTo sequence for
  const lastAnimatedKey = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoaded || !map) return;
    if (stops.length < 2) { setVisibleCount(0); return; }

    const shouldAnimate = triggerAnimate !== lastAnimatedKey.current;

    if (!shouldAnimate) {
      // Scenario changed — just reveal all segments instantly, no flyTo
      setVisibleCount(stops.length - 1);
      return;
    }

    // New team selected or explicit Replay — run the full flyTo animation once
    lastAnimatedKey.current = triggerAnimate;
    setVisibleCount(0);
    let cancelled = false;

    const run = async () => {
      map.flyTo({ center: stops[0].coords, zoom: 5, duration: 1500 });
      await delay(2000);
      if (cancelled) return;

      for (let i = 1; i < stops.length; i++) {
        if (cancelled) return;
        setVisibleCount(i);
        map.flyTo({ center: stops[i].coords, zoom: 5.5, duration: 1200 });
        await delay(1600);
      }

      if (!cancelled) {
        map.flyTo({ center: [-96, 36], zoom: 3.5, duration: 2000 });
      }
    };

    run();
    return () => { cancelled = true; };
  }, [isLoaded, map, stops, triggerAnimate]);

  const confirmedSegments: Array<[[number, number], [number, number]]> = [];
  const projectedSegments: Array<[[number, number], [number, number]]> = [];

  for (let i = 0; i < Math.min(visibleCount, stops.length - 1); i++) {
    const from = stops[i].coords;
    const to = stops[i + 1].coords;
    if (stops[i + 1].confirmed) {
      confirmedSegments.push([from, to]);
    } else {
      projectedSegments.push([from, to]);
    }
  }

  return (
    <>
      {confirmedSegments.map(([from, to], i) => (
        <MapRoute
          key={`jc-${i}`}
          id={`journey-confirmed-${i}`}
          coordinates={[from, to]}
          color={teamColor}
          width={3}
          opacity={0.9}
          interactive={false}
        />
      ))}
      {projectedSegments.map(([from, to], i) => (
        <MapRoute
          key={`jp-${i}`}
          id={`journey-projected-${i}`}
          coordinates={[from, to]}
          color={teamColor}
          width={2}
          opacity={0.55}
          dashArray={[5, 4]}
          interactive={false}
        />
      ))}
    </>
  );
}
