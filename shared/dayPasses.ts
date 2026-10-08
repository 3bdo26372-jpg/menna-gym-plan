import { addDays, isIsoDate } from './date'
import { pointsBalance, type PointsState } from './points'
import { MAX_DAILY_SCORE } from './scoring'
import type { AppState, DayRecord } from './types'

/**
 * Day passes (الإكسبشن): complete a day. The day counts as trained (also for
 * the milestone rewards) and its score is filled up to 100. The first pass is
 * free, and so is one per gift (pass_gifts); each other one costs points from
 * the same balance as everything else.
 *
 * The first days of each logged period also come with a free pass each, for
 * that day only (kind 'period'). Those don't use up the free pass or a gift.
 */
export const PASS_PRICE = 50

export interface PassGift {
  id: number
  /** Shown to her until she uses it. */
  note: string | null
  createdAt: string
}

export interface DayPass {
  date: string
  /** Points it cost (0 for the free one). */
  points: number
  /** 'period' for a free pass on one of the first days of a period. */
  kind?: PassKind
  createdAt: string
}

export type PassKind = 'regular' | 'period'
export const PERIOD_PASS_DAYS = 3

/** Periods can be missing while the app is newer than the API. */
type WithPeriods = Partial<Pick<AppState, 'periods'>>
type PassState = PointsState & Pick<AppState, 'profile' | 'passGifts'> & WithPeriods

const freePassesUsed = (state: Pick<AppState, 'dayPasses'>) => state.dayPasses.filter((pass) => pass.points === 0 && pass.kind !== 'period').length

/** The first days of every logged period, up to today. Each has its own free pass. */
export function periodPassDates(state: WithPeriods & Pick<AppState, 'today'>) {
  return (state.periods ?? []).flatMap((entry) => Array.from({ length: PERIOD_PASS_DAYS }, (_, index) => addDays(entry.startDate, index)))
    .filter((date) => date <= state.today)
}

export const isPeriodPassDate = (state: WithPeriods & Pick<AppState, 'today'>, date: string) => periodPassDates(state).includes(date)

/** What a pass for this day costs: nothing on the first days of a period, otherwise the usual price. */
export const passPriceFor = (state: PointsState & Pick<AppState, 'passGifts'> & WithPeriods, date: string) => (isPeriodPassDate(state, date) ? 0 : passPrice(state))

export const canAffordPassFor = (state: PointsState & Pick<AppState, 'passGifts'> & WithPeriods, date: string) => passPriceFor(state, date) <= pointsBalance(state).balance

/** Gifts not used yet. The first free pass is used first, then gifts in order. */
export function unusedGifts(state: Pick<AppState, 'dayPasses' | 'passGifts'>) {
  return [...state.passGifts].sort((a, b) => a.id - b.id).slice(Math.max(0, freePassesUsed(state) - 1))
}

export function passPrice(state: Pick<AppState, 'dayPasses' | 'passGifts'>) {
  return freePassesUsed(state) < 1 + state.passGifts.length ? 0 : PASS_PRICE
}

export const canAffordPass = (state: PointsState & Pick<AppState, 'passGifts'>) => passPrice(state) <= pointsBalance(state).balance

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
  if (isPeriodPassDate(state, date)) return { date, points: 0, kind: 'period' }
  if (!canAffordPass(state)) return 'not enough points'
  return { date, points: passPrice(state), kind: 'regular' }
}
