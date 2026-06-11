'use client';

import { useEffect, useState } from 'react';
import type { Match } from '@/types/espn';

const POLL_MS = 30_000;

export function useLiveMatches() {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/scores');
        const data = await res.json();
        if (cancelled) return;
        const all: Match[] = data.matches ?? [];
        setLiveMatches(all.filter((m) => m.state === 'in'));
      } catch {
        if (!cancelled) setLiveMatches([]);
      }
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return liveMatches;
}
