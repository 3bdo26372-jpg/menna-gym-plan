import { pointsBalance, type PointsState } from './points'

/**
 * Spending points (see points.ts) on a request (she writes what she wants) or
 * a surprise gift (chosen for her). Both stay "pending" until they are marked
 * done in the database; a spend marked "cancelled" gives its points back.
 * Older "makeup" spends (filling a day's score with points) are still counted,
 * but new ones go through a day pass instead.
 */
export { WATER_GOAL_BONUS, WATER_POINTS_DAILY_MAX, waterMlByDate, waterPointsForMl } from './points'
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

const counts = (spend: Pick<WaterSpend, 'status'>) => spend.status !== 'cancelled'

/** Score points made up per day, for computeDailyScore. */
export function makeupByDate(spends: Pick<WaterSpend, 'kind' | 'date' | 'points' | 'status'>[]) {
  const byDate = new Map<string, number>()
  for (const spend of spends) {
    if (spend.kind === 'makeup' && spend.date && counts(spend)) byDate.set(spend.date, (byDate.get(spend.date) ?? 0) + spend.points)
  }
  return byDate
}

export function validateSpend(input: unknown, state: PointsState): NewWaterSpend | string {
  if (!input || typeof input !== 'object') return 'spend must be an object'
  const raw = input as Record<string, unknown>
  const note = typeof raw.note === 'string' ? raw.note.trim().slice(0, NOTE_MAX_LENGTH) : ''
  let spend: NewWaterSpend
  if (raw.kind === 'request') {
    if (!note) return 'write what you would like'
    spend = { kind: 'request', points: SPEND_PRICE.request, note, date: null, status: 'pending' }
  } else if (raw.kind === 'gift') {
    spend = { kind: 'gift', points: SPEND_PRICE.gift, note: note || null, date: null, status: 'pending' }
  } else {
    return 'kind must be request or gift'
  }
  if (spend.points > pointsBalance(state).balance) return 'not enough points'
  return spend
}
