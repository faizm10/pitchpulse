'use client';

import { useCallback, useRef, useState } from 'react';
import { GoalNotification, type GoalData } from '@/components/GoalNotification';

const FALLBACK_GOAL: GoalData = {
  given: '',
  surname: 'Goal',
  number: 9,
  minute: 0,
  homeTeam: 'HOME',
  awayTeam: 'AWAY',
  homeScore: 0,
  awayScore: 0,
  teamColor: '#1d4ed8',
  accentColor: '#f4d35e',
  matchLabel: 'MATCH',
  assist: '',
  flag: '⚽',
};

export function useGoalCelebration() {
  const [trigger, setTrigger] = useState(0);
  const dataRef = useRef<GoalData>(FALLBACK_GOAL);

  const playGoal = useCallback((goalData: GoalData) => {
    dataRef.current = goalData;
    setTrigger((t) => t + 1);
  }, []);

  const celebration = (
    <GoalNotification trigger={trigger} data={dataRef.current} />
  );

  return { playGoal, celebration };
}
