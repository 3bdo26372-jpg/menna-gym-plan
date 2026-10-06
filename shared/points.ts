import { CALORIE_FLOOR_KCAL, calorieRange, dayCalories, hasFoodLogged, roundCalories } from './calories'
import { isWater, type FoodEntry } from './food'
import { isPainRest } from './period'
import { ACTIVE_DAY_MIN_COMPLETION } from './rewards'
import { isLegacyDay } from './scoring'
import type { AppState, DayRecord } from './types'

/**
 * Menna's points (نقطها): one balance, spent on requests, surprise gifts and
 * day passes. Points are a reward she works for, so they come from reaching
 * goals rather than from every small step:
 * - 2.5 L of water in a day: 5 (counts as soon as she reaches it)
 * - a finished day eaten within the calorie range (1,200 up to the top): 5
 * - a finished day's score: 60+ gives 3, 80+ gives 6, 100 gives 10
 *   (the score she earned herself; a day pass or makeup doesn't count)
 * - every 7 workout days in a row: 15 (a period-pain rest day doesn't count,
 *   but doesn't break the run either)
 * Everything is derived from the log, so deleting an entry takes its points back.
 *
 * Days before NEW_SYSTEM_FROM keep the points they earned under the original
 * rules: a point per 250 ml of water (up to 10) plus 5 at 2 L, and 10 for a
 * finished day eaten within the calorie range. They don't earn score tiers.
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

/** The score she earned herself, without a day pass, makeup or a period-pain rest. */
export const earnedScore = (day: Pick<DayRecord, 'score'>) => day.score.total - day.score.pass - day.score.makeup - (day.score.rest ?? 0)

/** The original water points: a point per 250 ml up to 2.5 L, plus 5 for reaching 2 L. */
export const legacyWaterPoints = (ml: number) => Math.min(10, Math.floor(ml / 250)) + (ml >= 2000 ? 5 : 0)
const LEGACY_CALORIE_POINTS = 10

export function scorePoints(score: number) {
  return score >= 100 ? EARN.score100 : score >= 80 ? EARN.score80 : score >= 60 ? EARN.score60 : 0
}

const trained = (day: Pick<DayRecord, 'workout'>) => Boolean(day.workout && day.workout.mainCompletion >= ACTIVE_DAY_MIN_COMPLETION)

/** Every point she has earned, with the day it was earned on. */
export function earnings(state: Pick<AppState, 'today' | 'days' | 'foodEntries'>): Earning[] {
  const result: Earning[] = []
  for (const [date, ml] of waterMlByDate(state.foodEntries)) {
    if (date > state.today) continue
    if (isLegacyDay(date)) {
      if (legacyWaterPoints(ml)) result.push({ date, kind: 'water', points: legacyWaterPoints(ml) })
    } else if (ml >= WATER_GOAL_ML) result.push({ date, kind: 'water', points: EARN.water })
  }
  let streak = 0
  for (const day of [...state.days].sort((a, b) => a.date.localeCompare(b.date))) {
    if (day.date >= state.today) break
    const entries = state.foodEntries.filter((entry) => entry.date === day.date)
    if (hasFoodLogged(entries)) {
      const kcal = dayCalories(entries)
      if (kcal >= CALORIE_FLOOR_KCAL && roundCalories(kcal) <= calorieRange(day.dayNumber).max) {
        result.push({ date: day.date, kind: 'calories', points: isLegacyDay(day.date) ? LEGACY_CALORIE_POINTS : EARN.calories })
      }
    }
    const fromScore = isLegacyDay(day.date) ? 0 : scorePoints(earnedScore(day))
    if (fromScore) result.push({ date: day.date, kind: 'score', points: fromScore })
    if (trained(day)) streak += 1
    else if (!isPainRest(day.periodPain)) streak = 0
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
