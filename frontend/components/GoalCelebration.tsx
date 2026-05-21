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
   * Render this node once in your component tree.
   * Returning JSX (not a component function) keeps the same
   * GoalNotification instance alive across renders — React reconciles
   * by position, so trigger increments reach the existing effect once.
   */
  const celebrationNode = data
    ? <GoalNotification trigger={trigger} data={data} />
    : null;

  return { fireGoal, celebrationNode };
}
