import { isIsoDate } from './date'
import { checkWritableDate } from './engine'
import { isWater, WATER_TARGET_ML, type FoodEntry } from './food'
import { MAX_DAILY_SCORE } from './scoring'
import type { AppState } from './types'

/**
 * Water points (نقط المية). Every 250 ml of water earns a point, up to 2.5 L a
 * day, and reaching the 2 L daily target adds a bonus. Points are derived from
 * the food log, so deleting a water entry takes its points back. Menna spends
 * them on a request (she writes what she wants), a surprise gift (chosen for
 * her), or on making up a finished day's missing score points (1 point each).
 *
 * Requests and gifts stay "pending" until they are marked done in the database;
 * a spend marked "cancelled" gives its points back.
 */
export const WATER_POINT_ML = 250
export const WATER_POINTS_DAILY_CAP = 10
export const WATER_GOAL_BONUS = 5
export const WATER_POINTS_DAILY_MAX = WATER_POINTS_DAILY_CAP + WATER_GOAL_BONUS
export const SPEND_PRICE = { request: 30, gift: 75 } as const

export type WaterSpendKind = 'request' | 'gift' | 'makeup'
export type WaterSpendStatus = 'pending' | 'done' | 'cancelled'

export interface WaterSpend {
  id: number
  kind: WaterSpendKind
  points: number
  /** What she asked for (request) or an optional hint (gift). */
  note: string | null
  /** The day whose score was made up (makeup only). */
  date: string | null
  status: WaterSpendStatus
  createdAt: string
  doneAt: string | null
}

export type NewWaterSpend = Pick<WaterSpend, 'kind' | 'points' | 'note' | 'date' | 'status'>
export interface WaterSpendInput { kind: WaterSpendKind; note?: string; date?: string; points?: number }

export const NOTE_MAX_LENGTH = 300

export function waterPointsForMl(ml: number) {
  return Math.min(WATER_POINTS_DAILY_CAP, Math.floor(ml / WATER_POINT_ML)) + (ml >= WATER_TARGET_ML ? WATER_GOAL_BONUS : 0)
}

export function waterMlByDate(entries: Pick<FoodEntry, 'date' | 'category' | 'item' | 'ml'>[]) {
  const byDate = new Map<string, number>()
  for (const entry of entries.filter(isWater)) byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + (entry.ml ?? 0))
  return byDate
}

const counts = (spend: Pick<WaterSpend, 'status'>) => spend.status !== 'cancelled'

export function waterPointsBalance(foodEntries: Pick<FoodEntry, 'date' | 'category' | 'item' | 'ml'>[], spends: Pick<WaterSpend, 'points' | 'status'>[]) {
  const earned = [...waterMlByDate(foodEntries).values()].reduce((sum, ml) => sum + waterPointsForMl(ml), 0)
  const spent = spends.filter(counts).reduce((sum, spend) => sum + spend.points, 0)
  return { earned, spent, balance: earned - spent }
}

/** Score points made up per day, for computeDailyScore. */
export function makeupByDate(spends: Pick<WaterSpend, 'kind' | 'date' | 'points' | 'status'>[]) {
  const byDate = new Map<string, number>()
  for (const spend of spends) {
    if (spend.kind === 'makeup' && spend.date && counts(spend)) byDate.set(spend.date, (byDate.get(spend.date) ?? 0) + spend.points)
  }
  return byDate
}

/** A day can be made up once it is closed, i.e. it can no longer be logged (today and yesterday still can). */
export function checkMakeupDate(date: unknown, today: string, programStartDate: string | null): string | null {
  if (!isIsoDate(date)) return 'invalid date'
  if (!programStartDate) return 'the program has not started yet'
  if (date < programStartDate) return 'date is before the program start'
  if (date > today) return 'date is in the future'
  if (checkWritableDate(date, today, programStartDate) === null) return 'this day can still be logged, so it cannot be made up yet'
  return null
}

type SpendState = Pick<AppState, 'today' | 'profile' | 'days' | 'foodEntries' | 'waterSpends'>

/** Closed days that are still short of 100, newest first. */
export function makeupCandidates(state: SpendState) {
  return state.days
    .filter((day) => checkMakeupDate(day.date, state.today, state.profile.programStartDate) === null && day.score.total < MAX_DAILY_SCORE)
    .map((day) => ({ day, gap: MAX_DAILY_SCORE - day.score.total }))
    .sort((a, b) => b.day.date.localeCompare(a.day.date))
}

export function validateSpend(input: unknown, state: SpendState): NewWaterSpend | string {
  if (!input || typeof input !== 'object') return 'spend must be an object'
  const raw = input as Record<string, unknown>
  const { balance } = waterPointsBalance(state.foodEntries, state.waterSpends)
  const note = typeof raw.note === 'string' ? raw.note.trim().slice(0, NOTE_MAX_LENGTH) : ''

  let spend: NewWaterSpend
  if (raw.kind === 'request') {
    if (!note) return 'write what you would like'
    spend = { kind: 'request', points: SPEND_PRICE.request, note, date: null, status: 'pending' }
  } else if (raw.kind === 'gift') {
    spend = { kind: 'gift', points: SPEND_PRICE.gift, note: note || null, date: null, status: 'pending' }
  } else if (raw.kind === 'makeup') {
    const problem = checkMakeupDate(raw.date, state.today, state.profile.programStartDate)
    if (problem) return problem
    const date = raw.date as string
    const day = state.days.find((item) => item.date === date)
    if (!day) return 'unknown day'
    const gap = MAX_DAILY_SCORE - day.score.total
    if (gap <= 0) return 'this day already has 100 points'
    const points = raw.points === undefined ? Math.min(gap, balance) : Number(raw.points)
    if (balance < 1) return 'not enough water points'
    if (!Number.isInteger(points) || points < 1 || points > gap) return `points must be between 1 and ${gap}`
    spend = { kind: 'makeup', points, note: null, date, status: 'done' }
  } else {
    return 'kind must be request, gift or makeup'
  }
  if (spend.points > balance) return 'not enough water points'
  return spend
}
