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
    // Easter eggs: override variant for legendary players
    const fullName = `${goalData.given} ${goalData.surname}`.toLowerCase();
    const isRonaldo = fullName.includes('ronaldo');
    const isMessi   = fullName.includes('messi');
    setVariant(isRonaldo ? 'siuuu' : isMessi ? 'goat' : goalVariant);
    setTrigger(n => n + 1);
  }, []);

  const celebrationNode = data
    ? <GoalNotification trigger={trigger} data={data} variant={variant} />
    : null;

  return { fireGoal, celebrationNode };
}
