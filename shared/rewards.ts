import type { RewardState } from './types'

/**
 * Reward milestones. Rewards are a surprise: the real titles and descriptions
 * live only in the database (set directly there, not from the app), and the
 * API hides them until the day each reward unlocks. `thresholdDays` counts
 * active days: days where at least half of the workout was done.
 */
export interface RewardDefinition {
  id: string
  thresholdDays: number
  title: string
  description: string
  emoji: string
  sortOrder: number
}

export const DEFAULT_REWARDS: RewardDefinition[] = [
  { id: 'day-5', thresholdDays: 5, sortOrder: 1, emoji: '🎁', title: 'مكافأة اليوم الخامس', description: 'مكافأة بعد ٥ أيام حركة.' },
  { id: 'day-10', thresholdDays: 10, sortOrder: 2, emoji: '🎁', title: 'مكافأة اليوم العاشر', description: 'مكافأة بعد ١٠ أيام حركة.' },
  { id: 'day-30', thresholdDays: 30, sortOrder: 3, emoji: '🏆', title: 'مكافأة الشهر الأول', description: 'مكافأة الشهر الأول كامل.' },
]

/** A day counts toward rewards when at least half of its main workout was done. */
export const ACTIVE_DAY_MIN_COMPLETION = 0.5

/** Replace a locked reward's details with a generic surprise card, so they never leave the server early. */
export function hideIfLocked(reward: RewardState): RewardState {
  if (reward.unlockedOn) return reward
  return {
    ...reward,
    emoji: '🎁',
    title: `مفاجأة يوم ${reward.thresholdDays}`,
    description: `مفاجأة سرّية بتتفتح لما توصلي لـ ${reward.thresholdDays} يوم حركة 🤫`,
  }
}
