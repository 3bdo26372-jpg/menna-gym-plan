import { calorieRange, dayCalories, hasFoodLogged, roundCalories } from './calories'
import { isIsoDate } from './date'
import type { AppState, DayRecord } from './types'

/**
 * Day passes (الإكسبشن): mark a day she didn't train as trained. The day gets
 * 100 points and counts toward the milestone rewards. The first pass is free;
 * after that each costs calorie points.
 *
 * Calorie points are earned on finished days whose rough calorie estimate is
 * within the plan's allowance (up to the top of the day's range). Days under a
 * healthy floor earn nothing, so skipping meals is never rewarded.
 */
export const PASS_PRICE = 50
export const CALORIE_POINTS_PER_DAY = 10
export const CALORIE_POINTS_FLOOR_KCAL = 1200

export interface DayPass {
  date: string
  /** Calorie points it cost (0 for the free one). */
  points: number
  createdAt: string
}

type PassState = Pick<AppState, 'today' | 'profile' | 'days' | 'foodEntries' | 'dayPasses'>

/** Finished days that earned calorie points. */
export function calorieDaysEarned(state: Pick<AppState, 'today' | 'days' | 'foodEntries'>) {
  return state.days.filter((day) => {
    if (day.date >= state.today) return false
    const entries = state.foodEntries.filter((entry) => entry.date === day.date)
    if (!hasFoodLogged(entries)) return false
    const kcal = dayCalories(entries)
    return kcal >= CALORIE_POINTS_FLOOR_KCAL && roundCalories(kcal) <= calorieRange(day.dayNumber).max
  })
}

export function passBalance(state: PassState) {
  const earned = calorieDaysEarned(state).length * CALORIE_POINTS_PER_DAY
  const spent = state.dayPasses.reduce((sum, pass) => sum + pass.points, 0)
  return { earned, spent, balance: earned - spent, price: state.dayPasses.length === 0 ? 0 : PASS_PRICE }
}

/** A day can take a pass when it has no full workout and no pass yet; today included. */
export const canTakePass = (day: Pick<DayRecord, 'excused' | 'workout'>) => !day.excused && (!day.workout || day.workout.mainCompletion < 1)

export function passCandidates(state: PassState) {
  return state.days.filter((day) => day.date <= state.today && canTakePass(day)).sort((a, b) => b.date.localeCompare(a.date))
}

export function validatePass(input: unknown, state: PassState): Omit<DayPass, 'createdAt'> | string {
  const date = input && typeof input === 'object' ? (input as Record<string, unknown>).date : undefined
  if (!isIsoDate(date)) return 'invalid date'
  if (!state.profile.programStartDate) return 'the program has not started yet'
  const day = state.days.find((item) => item.date === date)
  if (!day || date > state.today) return 'unknown day'
  if (!canTakePass(day)) return 'this day is already done'
  const { balance, price } = passBalance(state)
  if (price > balance) return 'not enough calorie points'
  return { date, points: price }
}
