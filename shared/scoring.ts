import type { CheckIn, Feedback, ScoreBreakdown, WorkoutResult } from './types'

/**
 * Daily score, out of 100. It rewards showing up, not intensity: choosing a
 * harder workout or training longer never earns extra points. Water points
 * spent on a finished day ("makeup") fill its gap, up to 100.
 */
export const SCORE_POINTS = { checkin: 15, workout: 60, warmup: 5, cooldown: 5, feedback: 15 } as const
export const MAX_DAILY_SCORE = 100

export function computeDailyScore(day: {
  checkin: CheckIn | null
  workout: WorkoutResult | null
  feedback: Feedback | null
}, makeupPoints = 0): ScoreBreakdown {
  const checkin = day.checkin ? SCORE_POINTS.checkin : 0
  const completion = day.workout ? Math.min(1, Math.max(0, day.workout.mainCompletion)) : 0
  const workout = Math.round(SCORE_POINTS.workout * completion)
  const warmupCooldown = day.workout
    ? (day.workout.warmupDone ? SCORE_POINTS.warmup : 0) + (day.workout.cooldownDone ? SCORE_POINTS.cooldown : 0)
    : 0
  const feedback = day.feedback ? SCORE_POINTS.feedback : 0
  const earned = checkin + workout + warmupCooldown + feedback
  const makeup = Math.max(0, Math.min(makeupPoints, MAX_DAILY_SCORE - earned))
  return { checkin, workout, warmupCooldown, feedback, makeup, total: earned + makeup }
}

export const EMPTY_SCORE: ScoreBreakdown = { checkin: 0, workout: 0, warmupCooldown: 0, feedback: 0, makeup: 0, total: 0 }
