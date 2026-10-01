import { isIsoDate } from './date'
import { pointsBalance, type PointsState } from './points'
import { MAX_DAILY_SCORE } from './scoring'
import type { AppState, DayRecord } from './types'

/**
 * Day passes (الإكسبشن): complete a day. The day counts as trained (also for
 * the milestone rewards) and its score is filled up to 100. The first pass is
 * free; each later one costs points from the same balance as everything else.
 */
export const PASS_PRICE = 50

export interface DayPass {
  date: string
  /** Points it cost (0 for the free one). */
  points: number
  createdAt: string
}

type PassState = PointsState & Pick<AppState, 'profile'>

export function passPrice(state: Pick<AppState, 'dayPasses'>) {
  return state.dayPasses.length === 0 ? 0 : PASS_PRICE
}

export const canAffordPass = (state: PointsState) => passPrice(state) <= pointsBalance(state).balance

/** A day can take a pass while it is short of 100 and has none yet; today included. */
export const canTakePass = (day: Pick<DayRecord, 'excused' | 'score'>) => !day.excused && day.score.total < MAX_DAILY_SCORE

/** Missed the workout: no full workout and no pass. */
export const missedWorkout = (day: Pick<DayRecord, 'excused' | 'workout'>) => !day.excused && (!day.workout || day.workout.mainCompletion < 1)

export function passCandidates(state: Pick<AppState, 'today' | 'days'>) {
  return state.days.filter((day) => day.date <= state.today && canTakePass(day)).sort((a, b) => b.date.localeCompare(a.date))
}

export function validatePass(input: unknown, state: PassState): Omit<DayPass, 'createdAt'> | string {
  const date = input && typeof input === 'object' ? (input as Record<string, unknown>).date : undefined
  if (!isIsoDate(date)) return 'invalid date'
  if (!state.profile.programStartDate) return 'the program has not started yet'
  const day = state.days.find((item) => item.date === date)
  if (!day || date > state.today) return 'unknown day'
  if (!canTakePass(day)) return 'this day is already done'
  if (!canAffordPass(state)) return 'not enough points'
  return { date, points: passPrice(state) }
}
