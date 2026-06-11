'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { initPostHog } from '@/lib/posthog';
import { buildJourney } from '@/lib/journey';
import { getTeamColor } from '@/lib/teamColor';
import { teams } from '@/lib/data';
import type { Tweaks } from '@/lib/types';
import type { JourneyScenario, JourneyState, LiveSchedule } from '@/types/journey';

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

// ───────── Team follow + journey (unified) ─────────

interface TeamFollowContextValue {
  myTeam: string | null;
  journey: JourneyState | null;
  scenario: JourneyScenario;
  showTeamPicker: boolean;
  liveSchedule: LiveSchedule | null;
  scheduleLoading: boolean;
  animateKey: number;
  teamColor: string;
  selectFollowedTeam: (code: string) => void;
  openTeamPicker: () => void;
  closeTeamPicker: () => void;
  setScenario: (s: JourneyScenario) => void;
  replayJourney: () => void;
  clearFollowedTeam: () => void;
}

const TeamFollowContext = createContext<TeamFollowContextValue | null>(null);

export function useTeamFollow(): TeamFollowContextValue {
  const v = useContext(TeamFollowContext);
  if (!v) throw new Error('useTeamFollow must be used inside <Providers>');
  return v;
}

/** @deprecated Prefer useTeamFollow — kept for components that only need myTeam */
export function useMyTeam(): { myTeam: string | null; setMyTeam: (code: string | null) => void } {
  const { myTeam, selectFollowedTeam, clearFollowedTeam } = useTeamFollow();
  return {
    myTeam,
    setMyTeam: (code) => (code ? selectFollowedTeam(code) : clearFollowedTeam()),
  };
}

// ───────── Provider tree ─────────

export function Providers({ children }: { children: ReactNode }) {
  const [tweaks, setTweaks] = useState<Tweaks>(DEFAULT_TWEAKS);
  const [myTeam, setMyTeamState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [journey, setJourney] = useState<JourneyState | null>(null);
  const [scenario, setScenarioState] = useState<JourneyScenario>('first');
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [liveSchedule, setLiveSchedule] = useState<LiveSchedule | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [animateKey, setAnimateKey] = useState(0);

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    try {
      const t = localStorage.getItem('pp-tweaks');
      if (t) setTweaks({ ...DEFAULT_TWEAKS, ...JSON.parse(t) });
    } catch {}
    try {
      const m = localStorage.getItem('pp-my-team');
      if (m) setMyTeamState(m);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('data-look', tweaks.look);
    el.setAttribute('data-density', tweaks.density);
    el.setAttribute('data-type', tweaks.type);
    try {
      localStorage.setItem('pp-tweaks', JSON.stringify(tweaks));
    } catch {}
  }, [tweaks]);

  useEffect(() => {
    if (myTeam) {
      try {
        localStorage.setItem('pp-my-team', myTeam);
      } catch {}
    } else {
      try {
        localStorage.removeItem('pp-my-team');
      } catch {}
    }
  }, [myTeam]);

  useEffect(() => {
    let cancelled = false;
    setScheduleLoading(true);
    fetch('/api/wc/group-schedule')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.schedule) setLiveSchedule(data.schedule);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setScheduleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rebuildJourney = useCallback(
    (code: string, scen: JourneyScenario, bumpAnimate: boolean) => {
      const result = buildJourney(code, scen, liveSchedule);
      if (result) {
        setJourney(result);
        if (bumpAnimate) setAnimateKey((k) => k + 1);
      }
    },
    [liveSchedule],
  );

  // Hydrate journey when myTeam was saved (static fallback if schedule API fails)
  useEffect(() => {
    if (!hydrated || !myTeam || scheduleLoading) return;
    if (journey?.teamCode === myTeam) return;
    rebuildJourney(myTeam, scenario, true);
  }, [hydrated, scheduleLoading, myTeam, liveSchedule]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild with live schedule when it arrives after static fallback
  useEffect(() => {
    if (!hydrated || !myTeam || !liveSchedule || scheduleLoading) return;
    const result = buildJourney(myTeam, scenario, liveSchedule);
    if (result) setJourney(result);
  }, [hydrated, liveSchedule, myTeam, scenario, scheduleLoading]);

  const selectFollowedTeam = useCallback(
    (code: string) => {
      if (!teams[code]) return;
      setMyTeamState(code);
      setScenarioState('first');
      setShowTeamPicker(false);
      rebuildJourney(code, 'first', true);
    },
    [rebuildJourney],
  );

  const openTeamPicker = useCallback(() => setShowTeamPicker(true), []);

  const closeTeamPicker = useCallback(() => {
    setShowTeamPicker(false);
  }, []);

  const setScenario = useCallback(
    (s: JourneyScenario) => {
      setScenarioState(s);
      if (myTeam) {
        const result = buildJourney(myTeam, s, liveSchedule);
        if (result) setJourney(result);
      }
    },
    [myTeam, liveSchedule],
  );

  const replayJourney = useCallback(() => {
    setAnimateKey((k) => k + 1);
  }, []);

  const clearFollowedTeam = useCallback(() => {
    setMyTeamState(null);
    setJourney(null);
    setShowTeamPicker(false);
  }, []);

  const teamColor = useMemo(
    () => getTeamColor(journey?.teamCode ?? myTeam),
    [journey?.teamCode, myTeam],
  );

  const setTweak = <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
    setTweaks((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <TweaksContext.Provider value={{ tweaks, setTweak }}>
      <TeamFollowContext.Provider
        value={{
          myTeam,
          journey,
          scenario,
          showTeamPicker,
          liveSchedule,
          scheduleLoading,
          animateKey,
          teamColor,
          selectFollowedTeam,
          openTeamPicker,
          closeTeamPicker,
          setScenario,
          replayJourney,
          clearFollowedTeam,
        }}
      >
        {children}
      </TeamFollowContext.Provider>
    </TweaksContext.Provider>
  );
}
