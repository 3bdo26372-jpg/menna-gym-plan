import { CALORIE_FLOOR_KCAL, calorieRange, dayCalories, hasFoodLogged, roundCalories } from './calories'
import { isWater, type FoodEntry } from './food'
import { ACTIVE_DAY_MIN_COMPLETION } from './rewards'
import type { AppState, DayRecord } from './types'

/**
 * Menna's points (نقطها): one balance, spent on requests, surprise gifts and
 * day passes. Points are a reward she works for, so they come from reaching
 * goals rather than from every small step:
 * - 2.5 L of water in a day: 5 (counts as soon as she reaches it)
 * - a finished day eaten within the calorie range (1,200 up to the top): 5
 * - a finished day's score: 60+ gives 3, 80+ gives 6, 100 gives 10
 *   (the score she earned herself; a day pass or makeup doesn't count)
 * - every 7 workout days in a row: 15
 * Everything is derived from the log, so deleting an entry takes its points back.
 */
export const EARN = { water: 5, calories: 5, score60: 3, score80: 6, score100: 10, streak: 15 } as const
export const WATER_GOAL_ML = 2500
export const STREAK_DAYS = 7

export type EarningKind = 'water' | 'calories' | 'score' | 'streak'
export interface Earning { date: string; kind: EarningKind; points: number }

export function waterMlByDate(entries: Pick<FoodEntry, 'date' | 'category' | 'item' | 'ml'>[]) {
  const byDate = new Map<string, number>()
  for (const entry of entries.filter(isWater)) byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + (entry.ml ?? 0))
  return byDate
}

/** The score she earned herself, without a day pass or makeup. */
export const earnedScore = (day: Pick<DayRecord, 'score'>) => day.score.total - day.score.pass - day.score.makeup

export function scorePoints(score: number) {
  return score >= 100 ? EARN.score100 : score >= 80 ? EARN.score80 : score >= 60 ? EARN.score60 : 0
}

const trained = (day: Pick<DayRecord, 'workout'>) => Boolean(day.workout && day.workout.mainCompletion >= ACTIVE_DAY_MIN_COMPLETION)

/** Every point she has earned, with the day it was earned on. */
export function earnings(state: Pick<AppState, 'today' | 'days' | 'foodEntries'>): Earning[] {
  const result: Earning[] = []
  for (const [date, ml] of waterMlByDate(state.foodEntries)) {
    if (ml >= WATER_GOAL_ML && date <= state.today) result.push({ date, kind: 'water', points: EARN.water })
  }
  let streak = 0
  for (const day of [...state.days].sort((a, b) => a.date.localeCompare(b.date))) {
    if (day.date >= state.today) break
    const entries = state.foodEntries.filter((entry) => entry.date === day.date)
    if (hasFoodLogged(entries)) {
      const kcal = dayCalories(entries)
      if (kcal >= CALORIE_FLOOR_KCAL && roundCalories(kcal) <= calorieRange(day.dayNumber).max) result.push({ date: day.date, kind: 'calories', points: EARN.calories })
    }
    const fromScore = scorePoints(earnedScore(day))
    if (fromScore) result.push({ date: day.date, kind: 'score', points: fromScore })
    streak = trained(day) ? streak + 1 : 0
    if (streak === STREAK_DAYS) {
      result.push({ date: day.date, kind: 'streak', points: EARN.streak })
      streak = 0
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date))
}

export type PointsState = Pick<AppState, 'today' | 'days' | 'foodEntries' | 'waterSpends' | 'dayPasses'>

export function pointsBalance(state: PointsState) {
  const list = earnings(state)
  const bySource = { water: 0, calories: 0, score: 0, streak: 0 } satisfies Record<EarningKind, number>
  for (const earning of list) bySource[earning.kind] += earning.points
  const earned = list.reduce((sum, earning) => sum + earning.points, 0)
  // Cancelled requests and gifts give their points back.
  const spent = state.waterSpends.filter((spend) => spend.status !== 'cancelled').reduce((sum, spend) => sum + spend.points, 0)
    + state.dayPasses.reduce((sum, pass) => sum + pass.points, 0)
  return { earned, spent, balance: earned - spent, bySource, earnings: list }
}
