'use client';

/**
 * GoalCelebration — reusable goal celebration hook + mount component.
 *
 * Usage:
 *   const { fireGoal, GoalCelebrationMount } = useGoalCelebration();
 *
 *   // Render once anywhere in your tree:
 *   <GoalCelebrationMount />
 *
 *   // Trigger from anywhere:
 *   fireGoal({ given, surname, number, minute, ... });
 */

import { useCallback, useState } from 'react';
import { GoalNotification } from '@/components/GoalNotification';
import type { GoalData, GoalVariant } from '@/components/GoalNotification';

export type { GoalData, GoalVariant };

export function useGoalCelebration() {
  const [trigger, setTrigger] = useState(0);
  const [data, setData] = useState<GoalData | null>(null);
  const [variant, setVariant] = useState<GoalVariant | undefined>(undefined);

  const fireGoal = useCallback((goalData: GoalData, goalVariant?: GoalVariant) => {
    setData(goalData);
    // Easter egg: Ronaldo always gets the SIUUU variant regardless of what's selected
    const fullName = `${goalData.given} ${goalData.surname}`.toLowerCase();
    const isRonaldo = fullName.includes('ronaldo');
    setVariant(isRonaldo ? 'siuuu' : goalVariant);
    setTrigger(n => n + 1);
  }, []);

  const celebrationNode = data
    ? <GoalNotification trigger={trigger} data={data} variant={variant} />
    : null;

  return { fireGoal, celebrationNode };
}
