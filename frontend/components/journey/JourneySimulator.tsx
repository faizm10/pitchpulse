'use client';

import { useState, useCallback } from 'react';
import { buildJourney } from '@/lib/journey';
import { getTeamColor } from '@/lib/teamColor';
import { useLiveForms } from '@/hooks/useLiveForms';
import type { JourneyState, JourneyScenario, LiveSchedule } from '@/types/journey';

export interface JourneySimulatorState {
  isOpen: boolean;
  journey: JourneyState | null;
  showSelector: boolean;
  scenario: JourneyScenario;
  animateKey: number;
  teamColor: string;
  openSimulator: () => void;
  closeSimulator: () => void;
  selectTeam: (code: string) => void;
  changeScenario: (s: JourneyScenario) => void;
  replay: () => void;
  closeSelector: () => void;
}

export function useJourneySimulator(liveSchedule: LiveSchedule | null = null): JourneySimulatorState {
  const [isOpen, setIsOpen] = useState(false);
  const [journey, setJourney] = useState<JourneyState | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [scenario, setScenario] = useState<JourneyScenario>('first');
  const [animateKey, setAnimateKey] = useState(0);
  const liveForms = useLiveForms();

  const openSimulator = useCallback(() => {
    setIsOpen(true);
    setShowSelector(true);
  }, []);

  const closeSimulator = useCallback(() => {
    setIsOpen(false);
    setJourney(null);
    setShowSelector(false);
  }, []);

  const closeSelector = useCallback(() => {
    if (!journey) {
      setIsOpen(false);
    }
    setShowSelector(false);
  }, [journey]);

  const selectTeam = useCallback(
    (teamCode: string) => {
      const result = buildJourney(teamCode, scenario, liveSchedule, liveForms);
      if (result) {
        setJourney(result);
        setAnimateKey((k) => k + 1);
      }
      setShowSelector(false);
    },
    [scenario, liveSchedule, liveForms],
  );

  const changeScenario = useCallback(
    (newScenario: JourneyScenario) => {
      setScenario(newScenario);
      if (journey) {
        const result = buildJourney(journey.teamCode, newScenario, liveSchedule, liveForms);
        // Do NOT bump animateKey — routes update silently, no re-animation
        if (result) setJourney(result);
      }
    },
    [journey, liveSchedule, liveForms],
  );

  const replay = useCallback(() => {
    setAnimateKey((k) => k + 1);
  }, []);

  const teamColor = getTeamColor(journey?.teamCode ?? null);

  return {
    isOpen,
    journey,
    showSelector,
    scenario,
    animateKey,
    teamColor,
    openSimulator,
    closeSimulator,
    selectTeam,
    changeScenario,
    replay,
    closeSelector,
  };
}
