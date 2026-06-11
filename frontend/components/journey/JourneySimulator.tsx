'use client';

import { useState, useCallback } from 'react';
import { buildJourney } from '@/lib/journey';
import { teams } from '@/lib/data';
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

  // Pick the first flag colour that isn't too light (e.g. England's flag[0] is #FFFFFF)
  const teamColor = journey
    ? (teams[journey.teamCode]?.flag.find((c) => {
        const r = parseInt(c.slice(1, 3), 16) / 255;
        const g = parseInt(c.slice(3, 5), 16) / 255;
        const b = parseInt(c.slice(5, 7), 16) / 255;
        return 0.299 * r + 0.587 * g + 0.114 * b < 0.72;
      }) ?? '#4285F4')
    : '#4285F4';

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
