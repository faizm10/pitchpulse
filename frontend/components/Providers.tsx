'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { initPostHog } from '@/lib/posthog';
import type { Tweaks } from '@/lib/types';

// ───────── Tweaks ─────────

const DEFAULT_TWEAKS: Tweaks = {
  type: 'editorial',
  look: 'atlas',
  mapStyle: 'dots',
  density: 'cozy',
  aiSummary: true,
};

interface TweaksContextValue {
  tweaks: Tweaks;
  setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
}

const TweaksContext = createContext<TweaksContextValue | null>(null);

export function useTweaks(): TweaksContextValue {
  const v = useContext(TweaksContext);
  if (!v) throw new Error('useTweaks must be used inside <Providers>');
  return v;
}

// ───────── My team ─────────

interface MyTeamContextValue {
  myTeam: string | null;
  setMyTeam: (code: string | null) => void;
}

const MyTeamContext = createContext<MyTeamContextValue | null>(null);

export function useMyTeam(): MyTeamContextValue {
  const v = useContext(MyTeamContext);
  if (!v) throw new Error('useMyTeam must be used inside <Providers>');
  return v;
}

// ───────── Journey request ─────────
// Lets Topbar signal MapView to open the journey simulator without URL tricks.

interface JourneyRequestContextValue {
  /** Team code to jump to, 'open' to show team selector, or null = no pending request */
  journeyRequest: string | null;
  requestJourney: (codeOrOpen: string) => void;
  consumeJourneyRequest: () => void;
}

const JourneyRequestContext = createContext<JourneyRequestContextValue | null>(null);

export function useJourneyRequest(): JourneyRequestContextValue {
  const v = useContext(JourneyRequestContext);
  if (!v) throw new Error('useJourneyRequest must be used inside <Providers>');
  return v;
}

// ───────── Provider tree ─────────

export function Providers({ children }: { children: ReactNode }) {
  const [tweaks, setTweaks] = useState<Tweaks>(DEFAULT_TWEAKS);
  const [myTeam, setMyTeamState] = useState<string | null>(null);
  const [journeyRequest, setJourneyRequest] = useState<string | null>(null);
  const requestJourney = useCallback((codeOrOpen: string) => setJourneyRequest(codeOrOpen), []);
  const consumeJourneyRequest = useCallback(() => setJourneyRequest(null), []);

  useEffect(() => { initPostHog(); }, []);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const t = localStorage.getItem('pp-tweaks');
      if (t) setTweaks({ ...DEFAULT_TWEAKS, ...JSON.parse(t) });
    } catch {}
    try {
      const m = localStorage.getItem('pp-my-team');
      if (m) setMyTeamState(m);
    } catch {}
  }, []);

  // Persist + apply attrs
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('data-look', tweaks.look);
    el.setAttribute('data-density', tweaks.density);
    el.setAttribute('data-type', tweaks.type);
    try { localStorage.setItem('pp-tweaks', JSON.stringify(tweaks)); } catch {}
  }, [tweaks]);

  useEffect(() => {
    if (myTeam) {
      try { localStorage.setItem('pp-my-team', myTeam); } catch {}
    } else {
      try { localStorage.removeItem('pp-my-team'); } catch {}
    }
  }, [myTeam]);

  const setTweak = <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
    setTweaks((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <TweaksContext.Provider value={{ tweaks, setTweak }}>
      <MyTeamContext.Provider value={{ myTeam, setMyTeam: setMyTeamState }}>
        <JourneyRequestContext.Provider value={{ journeyRequest, requestJourney, consumeJourneyRequest }}>
          {children}
        </JourneyRequestContext.Provider>
      </MyTeamContext.Provider>
    </TweaksContext.Provider>
  );
}
