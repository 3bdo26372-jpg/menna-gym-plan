import { CALORIE_FLOOR_KCAL, calorieRange, dayCalories, hasFoodLogged, roundCalories } from './calories'
import { waterMl, WATER_TARGET_ML, type FoodEntry } from './food'
import { isPainRest } from './period'
import type { CheckIn, Feedback, ScoreBreakdown, WorkoutResult } from './types'

/**
 * Daily score, out of 100: 40 for the workout, 30 for water, 30 for eating
 * within the plan's calories.
 * - Workout (40): check-in 6, main work 24 (proportional to what was done),
 *   warm-up 2, cool-down 2, feedback 6. A harder or longer session never earns more.
 * - Water (30): proportional to the 2 L target, capped at 30.
 * - Calories (30): full points from 1,200 up to the top of the day's range;
 *   above it 1 point is lost per 25 kcal; below 1,200 points shrink so skipping
 *   meals isn't rewarded. Nothing logged earns nothing.
 * On a period-pain day (pain above 4) the workout's share is filled in, so
 * resting costs nothing.
 * A day pass completes the day: whatever is missing is filled up to 100.
 * Older "makeup" spends do the same with their points.
 */
export const SCORE_POINTS = { checkin: 6, workout: 24, warmup: 2, cooldown: 2, feedback: 6, water: 30, calories: 30 } as const
/**
 * The 40/30/30 split and goal-based points start on this day. Earlier days
 * keep the original scoring (the workout alone is worth 100) and the points
 * they earned under the original rules (see points.ts).
 */
export const NEW_SYSTEM_FROM = '2026-10-02'
export const isLegacyDay = (date: string) => date < NEW_SYSTEM_FROM
const LEGACY_POINTS = { checkin: 15, workout: 60, warmup: 5, cooldown: 5, feedback: 15 } as const
export const MAX_DAILY_SCORE = 100
export const WORKOUT_SHARE = SCORE_POINTS.checkin + SCORE_POINTS.workout + SCORE_POINTS.warmup + SCORE_POINTS.cooldown + SCORE_POINTS.feedback
const KCAL_PER_POINT_OVER = 25

export interface FoodScoreInput {
  waterMl: number
  /** Rough calories for the day, or null when no food was logged. */
  calories: number | null
  calorieMax: number
}

export function foodScoreInput(entries: FoodEntry[], dayNumber: number): FoodScoreInput {
  return { waterMl: waterMl(entries), calories: hasFoodLogged(entries) ? dayCalories(entries) : null, calorieMax: calorieRange(dayNumber).max }
}

export const waterScore = (ml: number) => Math.min(SCORE_POINTS.water, Math.round((SCORE_POINTS.water * ml) / WATER_TARGET_ML))

export function calorieScore(calories: number | null, calorieMax: number) {
  if (calories === null) return 0
  const rounded = roundCalories(calories)
  if (rounded > calorieMax) return Math.max(0, SCORE_POINTS.calories - Math.round((rounded - calorieMax) / KCAL_PER_POINT_OVER))
  if (calories < CALORIE_FLOOR_KCAL) return Math.round((SCORE_POINTS.calories * calories) / CALORIE_FLOOR_KCAL)
  return SCORE_POINTS.calories
}

export function computeDailyScore(day: {
  checkin: CheckIn | null
  workout: WorkoutResult | null
  feedback: Feedback | null
  periodPain?: number | null
}, makeupPoints = 0, excused = false, food?: FoodScoreInput, legacy = false): ScoreBreakdown {
  const points = legacy ? LEGACY_POINTS : SCORE_POINTS
  const checkin = day.checkin ? points.checkin : 0
  const completion = day.workout ? Math.min(1, Math.max(0, day.workout.mainCompletion)) : 0
  const workout = Math.round(points.workout * completion)
  const warmupCooldown = day.workout
    ? (day.workout.warmupDone ? points.warmup : 0) + (day.workout.cooldownDone ? points.cooldown : 0)
    : 0
  const feedback = day.feedback ? points.feedback : 0
  const water = food && !legacy ? waterScore(food.waterMl) : 0
  const calories = food && !legacy ? calorieScore(food.calories, food.calorieMax) : 0
  const earned = checkin + workout + warmupCooldown + feedback + water + calories
  const workoutShare = points.checkin + points.workout + points.warmup + points.cooldown + points.feedback
  const rest = isPainRest(day.periodPain) ? workoutShare - (checkin + workout + warmupCooldown + feedback) : 0
  const makeup = Math.max(0, Math.min(makeupPoints, MAX_DAILY_SCORE - earned - rest))
  const pass = excused ? MAX_DAILY_SCORE - earned - rest - makeup : 0
  return { checkin, workout, warmupCooldown, feedback, water, calories, makeup, pass, rest, total: earned + rest + makeup + pass }
}

export const EMPTY_SCORE: ScoreBreakdown = { checkin: 0, workout: 0, warmupCooldown: 0, feedback: 0, water: 0, calories: 0, makeup: 0, pass: 0, rest: 0, total: 0 }
