/**
 * Reward milestones. The titles and descriptions are placeholders that can be
 * edited from the Rewards page (they are stored in the database), so changing
 * a reward never needs a code change. `thresholdDays` counts active days: days
 * where at least half of the workout was done.
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
  { id: 'day-5', thresholdDays: 5, sortOrder: 1, emoji: '🎁', title: 'مكافأة اليوم الخامس', description: 'اكتبي هنا المكافأة اللي تستاهليها بعد ٥ أيام حركة.' },
  { id: 'day-10', thresholdDays: 10, sortOrder: 2, emoji: '🎁', title: 'مكافأة اليوم العاشر', description: 'اكتبي هنا المكافأة اللي تستاهليها بعد ١٠ أيام حركة.' },
  { id: 'day-30', thresholdDays: 30, sortOrder: 3, emoji: '🏆', title: 'مكافأة الشهر الأول', description: 'اكتبي هنا مكافأة الشهر الأول كامل.' },
]

/** A day counts toward rewards when at least half of its main workout was done. */
export const ACTIVE_DAY_MIN_COMPLETION = 0.5
