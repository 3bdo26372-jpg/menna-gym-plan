import { CALORIE_FLOOR_KCAL, calorieRange, dayCalories, hasFoodLogged, roundCalories } from './calories'
import { isWater, WATER_TARGET_ML, type FoodEntry } from './food'
import type { AppState } from './types'

/**
 * Menna's points (نقطها): one balance, earned two ways and spent on requests,
 * surprise gifts and day passes. Earnings are derived from the food log, so
 * deleting an entry takes its points back.
 * - Water: a point per 250 ml up to 2.5 L a day, plus 5 for reaching 2 L.
 * - Calories: 10 for each finished day whose rough estimate is between 1,200
 *   and the top of that day's range. Skipping meals is never rewarded.
 */
export const WATER_POINT_ML = 250
export const WATER_POINTS_DAILY_CAP = 10
export const WATER_GOAL_BONUS = 5
export const WATER_POINTS_DAILY_MAX = WATER_POINTS_DAILY_CAP + WATER_GOAL_BONUS
export const CALORIE_POINTS_PER_DAY = 10

export function waterPointsForMl(ml: number) {
  return Math.min(WATER_POINTS_DAILY_CAP, Math.floor(ml / WATER_POINT_ML)) + (ml >= WATER_TARGET_ML ? WATER_GOAL_BONUS : 0)
}

export function waterMlByDate(entries: Pick<FoodEntry, 'date' | 'category' | 'item' | 'ml'>[]) {
  const byDate = new Map<string, number>()
  for (const entry of entries.filter(isWater)) byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + (entry.ml ?? 0))
  return byDate
}

/** Finished days that earned calorie points. */
export function calorieDaysEarned(state: Pick<AppState, 'today' | 'days' | 'foodEntries'>) {
  return state.days.filter((day) => {
    if (day.date >= state.today) return false
    const entries = state.foodEntries.filter((entry) => entry.date === day.date)
    if (!hasFoodLogged(entries)) return false
    const kcal = dayCalories(entries)
    return kcal >= CALORIE_FLOOR_KCAL && roundCalories(kcal) <= calorieRange(day.dayNumber).max
  })
}

export type PointsState = Pick<AppState, 'today' | 'days' | 'foodEntries' | 'waterSpends' | 'dayPasses'>

export function pointsBalance(state: PointsState) {
  const water = [...waterMlByDate(state.foodEntries).values()].reduce((sum, ml) => sum + waterPointsForMl(ml), 0)
  const calories = calorieDaysEarned(state).length * CALORIE_POINTS_PER_DAY
  // Cancelled requests and gifts give their points back.
  const spent = state.waterSpends.filter((spend) => spend.status !== 'cancelled').reduce((sum, spend) => sum + spend.points, 0)
    + state.dayPasses.reduce((sum, pass) => sum + pass.points, 0)
  return { water, calories, earned: water + calories, spent, balance: water + calories - spent }
}
