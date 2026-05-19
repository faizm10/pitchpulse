"use client";

import { useCallback, useEffect, useState } from "react";
import { Map, MapControls, useMap } from "@/components/ui/map";
import { StadiumMarkers } from "./StadiumMarkers";
import { MapLoadingSkeleton } from "./MapLoadingSkeleton";
import { DEFAULT_MAP_VIEW } from "@/data/venues";
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
        center={DEFAULT_MAP_VIEW.center}
        zoom={DEFAULT_MAP_VIEW.zoom}
        minZoom={DEFAULT_MAP_VIEW.minZoom}
        maxZoom={DEFAULT_MAP_VIEW.maxZoom}
        theme="light"
      >
        <MapLoadedObserver onLoad={handleLoad} />
        <StadiumMarkers matches={matches} onSelectMatch={onSelectMatch} />
        <MapControls position="bottom-right" showZoom showCompass />
      </Map>
    </div>
  );
}
