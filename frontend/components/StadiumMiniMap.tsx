'use client';

import { useEffect, useRef } from 'react';
import { Map, MapMarker, MarkerContent } from '@/components/ui/map';

interface StadiumMiniMapProps {
  lat: number;
  lng: number;
  name: string;
}

export function StadiumMiniMap({ lat, lng, name }: StadiumMiniMapProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' }}>
      <Map
        center={[lng, lat]}
        zoom={13}
        minZoom={2}
        maxZoom={18}
        theme="light"
        dragRotate={false}
        pitchWithRotate={false}
      >
        <MapMarker longitude={lng} latitude={lat}>
          <MarkerContent>
            <div style={{ position: 'relative' }}>
              {/* Glow */}
              <div style={{
                position: 'absolute', inset: -4, borderRadius: '50%',
                filter: 'blur(6px)', opacity: 0.8,
                backgroundColor: 'var(--accent, #e5392b)',
              }} />
              {/* Dot */}
              <div style={{
                position: 'relative',
                width: 14, height: 14, borderRadius: '50%',
                border: '2px solid white',
                backgroundColor: 'var(--accent, #e5392b)',
                boxShadow: '0 0 12px rgba(255,255,255,0.2)',
              }} />
            </div>
          </MarkerContent>
        </MapMarker>
      </Map>

      {/* Stadium name badge */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12,
        background: 'rgba(14,22,38,0.75)',
        backdropFilter: 'blur(8px)',
        borderRadius: 8,
        padding: '5px 10px',
        color: 'white',
        fontSize: 11,
        fontFamily: 'var(--mono)',
        letterSpacing: '0.08em',
        pointerEvents: 'none',
      }}>
        {name}
      </div>
    </div>
  );
}
