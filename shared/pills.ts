import { addDays, isIsoDate } from './date'
import type { FoodEntry } from './food'

/**
 * Her pills: two a day, one after breakfast and one after lunch. She picks
 * when to be reminded of each and until which day she takes them (or no end),
 * and ticks each one off when she takes it.
 */
export interface PillPlan {
  /** "HH:MM" reminder times, one per slot in PILL_SLOTS order. */
  times: string[]
  /** The last day she takes them, or null when there is no end yet. */
  until: string | null
  updatedAt: string
}

export interface PillDose {
  date: string
  slot: number
  takenAt: string
}

export const PILL_SLOTS = [
  { label: 'بعد الفطار', emoji: '🍳', meal: 'breakfast' as const, fallback: '13:00' },
  { label: 'بعد الغدا', emoji: '🍲', meal: 'lunch' as const, fallback: '18:00' },
]

/** Reminder times stay inside the day, so each one belongs to its own date. */
export const PILL_TIME_FROM = '05:00'
export const PILL_TIME_UNTIL = '23:45'
/** The longest she can plan ahead. */
export const PILL_MAX_DAYS = 366

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export function validatePillPlan(input: unknown, today: string): Omit<PillPlan, 'updatedAt'> | string {
  const fields = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const times = fields.times
  if (!Array.isArray(times) || times.length !== PILL_SLOTS.length) return `times must list ${PILL_SLOTS.length} times`
  for (const time of times) {
    if (typeof time !== 'string' || !TIME.test(time) || time < PILL_TIME_FROM || time > PILL_TIME_UNTIL) return `each time must be between ${PILL_TIME_FROM} and ${PILL_TIME_UNTIL}`
  }
  const until = fields.until ?? null
  if (until !== null && (!isIsoDate(until) || until < today || until > addDays(today, PILL_MAX_DAYS))) return 'until must be a date from today on, or null'
  return { times: times as string[], until: until as string | null }
}

export function validatePillDose(input: unknown): { slot: number; taken: boolean } | string {
  const fields = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  if (!Number.isInteger(fields.slot) || (fields.slot as number) < 0 || (fields.slot as number) >= PILL_SLOTS.length) return 'unknown pill slot'
  if (typeof fields.taken !== 'boolean') return 'taken must be true or false'
  return { slot: fields.slot as number, taken: fields.taken }
}

/** Whether she is still taking them on this day. */
export const pillsOn = (plan: PillPlan | null | undefined, date: string): plan is PillPlan => Boolean(plan && (!plan.until || date <= plan.until))

export const pillTaken = (doses: PillDose[] | undefined, date: string, slot: number) => (doses ?? []).some((dose) => dose.date === date && dose.slot === slot)

/** The slots whose time has come today and that she hasn't taken yet. */
export function pillsDue(plan: PillPlan | null | undefined, doses: PillDose[] | undefined, date: string, time: string) {
  if (!pillsOn(plan, date)) return []
  return PILL_SLOTS.map((_, slot) => slot).filter((slot) => time >= plan.times[slot] && !pillTaken(doses, date, slot))
}

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const clock = (total: number) => `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`

/** Half an hour after she usually eats this meal (the middle of her logged times), on the quarter hour. */
export function usualPillTime(entries: Pick<FoodEntry, 'category' | 'time'>[], slot: number) {
  const { meal, fallback } = PILL_SLOTS[slot]
  const times = entries.filter((entry) => entry.category === meal && entry.time >= PILL_TIME_FROM).map((entry) => minutes(entry.time)).sort((a, b) => a - b)
  if (!times.length) return fallback
  const after = Math.round((times[Math.floor(times.length / 2)] + 30) / 15) * 15
  return clock(Math.min(after, minutes(PILL_TIME_UNTIL)))
}
