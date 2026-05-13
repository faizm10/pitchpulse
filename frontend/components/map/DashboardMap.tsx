"use client";

import { useCallback, useEffect, useState } from "react";
import { Map, MapControls, useMap } from "@/components/ui/map";
import { StadiumMarkers } from "./StadiumMarkers";
import { MapLoadingSkeleton } from "./MapLoadingSkeleton";
import type { Match } from "@/types/espn";

function MapLoadedObserver({ onLoad }: { onLoad: () => void }) {
  const { isLoaded } = useMap();
  useEffect(() => { if (isLoaded) onLoad(); }, [isLoaded, onLoad]);
  return null;
}

interface DashboardMapProps {
  matches: Match[];
  onSelectMatch?: (id: string) => void;
}

export function DashboardMap({ matches, onSelectMatch }: DashboardMapProps) {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const handleLoad = useCallback(() => setIsMapLoaded(true), []);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden" }}>
      {!isMapLoaded && <MapLoadingSkeleton />}
      <Map
        center={[-100, 38]}
        zoom={3}
        minZoom={2.5}
        maxZoom={12}
        theme="light"
      >
        <MapLoadedObserver onLoad={handleLoad} />
        <StadiumMarkers matches={matches} onSelectMatch={onSelectMatch} />
        <MapControls position="bottom-right" showZoom showCompass />
      </Map>
    </div>
  );
}
