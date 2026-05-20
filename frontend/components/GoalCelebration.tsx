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
import type { GoalData } from '@/components/GoalNotification';

export type { GoalData };

export interface FireGoalOptions extends GoalData {}

export function useGoalCelebration() {
  const [trigger, setTrigger] = useState(0);
  const [data, setData] = useState<GoalData | null>(null);

  /** Call this to fire the celebration with the provided goal data. */
  const fireGoal = useCallback((goalData: GoalData) => {
    setData(goalData);
    setTrigger(n => n + 1);
  }, []);

  /**
   * Render <GoalCelebrationMount /> once in your component tree.
   * It renders nothing until fireGoal() is called.
   */
  function GoalCelebrationMount() {
    if (!data) return null;
    return <GoalNotification trigger={trigger} data={data} />;
  }

  return { fireGoal, GoalCelebrationMount };
}
