import { addDays, diffDays, isIsoDate } from './date'

/**
 * Period tracking. She logs the day a period starts (and, if she wants, the
 * day it ends). The next start is predicted from the gaps between her own
 * starts, and the home page warns her a few days before it is due.
 */
export interface PeriodEntry {
  id: number
  startDate: string
  /** The last day, once she marks it. */
  endDate: string | null
  createdAt: string
}

/** Used until she has logged two starts (cycle) or one end (length). */
export const DEFAULT_CYCLE_DAYS = 28
export const DEFAULT_PERIOD_DAYS = 5
/** The home page starts warning this many days before the expected start. */
export const WARN_DAYS_BEFORE = 3
/** Only her most recent cycles count, so the average follows her as she changes. */
const RECENT_CYCLES = 6
/**
 * Gaps outside this range are left out of the average: a longer one usually
 * means a start wasn't logged, a shorter one a mistake.
 */
const CYCLE_RANGE = { min: 18, max: 50 }
export const MAX_PERIOD_DAYS = 14
/** Two starts this close together are the same period logged twice. */
const DUPLICATE_WINDOW_DAYS = 10
/** How far back a start can be logged. */
export const MAX_PAST_DAYS = 365

const byStart = (periods: PeriodEntry[]) => [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate))
const average = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)

/** Whether a gap between two starts is a real cycle that the average uses. */
const countsAsCycle = (days: number) => days >= CYCLE_RANGE.min && days <= CYCLE_RANGE.max

/** The start logged after this one, if any. */
export const nextEntry = (periods: PeriodEntry[], entry: PeriodEntry) => byStart(periods).find((item) => item.startDate > entry.startDate) ?? null

/** Days from each start to the next, oldest first, skipping implausible gaps. */
export function cycleLengths(periods: PeriodEntry[]) {
  const sorted = byStart(periods)
  return sorted.slice(1).map((entry, index) => diffDays(sorted[index].startDate, entry.startDate)).filter(countsAsCycle)
}

/** Length of a logged period, counting the start and end days. */
export const periodLength = (entry: PeriodEntry) => (entry.endDate ? diffDays(entry.startDate, entry.endDate) + 1 : null)

export type PeriodPhase = 'unknown' | 'period' | 'calm' | 'soon' | 'due' | 'late'

export interface PeriodForecast {
  /** Average days from one start to the next. */
  cycleDays: number
  /** How many of her cycles that average uses (0 means the default). */
  cyclesUsed: number
  /** Average days a period lasts. */
  periodDays: number
  /** The latest logged start up to today. */
  last: PeriodEntry | null
  /** Expected next start, from the latest start plus the average cycle. */
  nextStart: string | null
  /** Days from today to `nextStart`; negative when it is late. */
  daysUntil: number | null
  phase: PeriodPhase
  /** Day of the current period (the start is day 1), while `phase` is 'period'. */
  periodDay: number | null
}

export function periodForecast(periods: PeriodEntry[], today: string): PeriodForecast {
  const logged = byStart(periods.filter((entry) => entry.startDate <= today))
  const cycles = cycleLengths(logged).slice(-RECENT_CYCLES)
  const lengths = logged.map(periodLength).filter((days): days is number => days !== null).slice(-RECENT_CYCLES)
  const cycleDays = cycles.length ? average(cycles) : DEFAULT_CYCLE_DAYS
  const periodDays = lengths.length ? average(lengths) : DEFAULT_PERIOD_DAYS
  const last = logged.at(-1) ?? null
  if (!last) return { cycleDays, cyclesUsed: 0, periodDays, last, nextStart: null, daysUntil: null, phase: 'unknown', periodDay: null }

  const nextStart = addDays(last.startDate, cycleDays)
  const daysUntil = diffDays(today, nextStart)
  // Without an end date, assume it lasts her usual length.
  const lastDay = last.endDate ?? addDays(last.startDate, periodDays - 1)
  const ongoing = today <= lastDay
  const phase: PeriodPhase = ongoing ? 'period' : daysUntil < 0 ? 'late' : daysUntil === 0 ? 'due' : daysUntil <= WARN_DAYS_BEFORE ? 'soon' : 'calm'
  return {
    cycleDays, cyclesUsed: cycles.length, periodDays, last, nextStart, daysUntil, phase,
    periodDay: ongoing ? diffDays(last.startDate, today) + 1 : null,
  }
}

/** The next few expected starts, for planning ahead. */
export function upcomingStarts(forecast: PeriodForecast, count = 3) {
  if (!forecast.nextStart) return []
  // When it is late, the first expected date has passed; show the ones after it.
  const first = forecast.daysUntil !== null && forecast.daysUntil < 0 ? addDays(forecast.nextStart, forecast.cycleDays) : forecast.nextStart
  return Array.from({ length: count }, (_, index) => addDays(first, index * forecast.cycleDays))
}

/** A logged start close enough to `date` to be the same period. */
export function nearbyStart(periods: PeriodEntry[], date: string) {
  return periods.find((entry) => Math.abs(diffDays(entry.startDate, date)) < DUPLICATE_WINDOW_DAYS) ?? null
}

/** A new period: its start, and its end too when she logs a past one. */
export function validateNewPeriod(input: unknown, periods: PeriodEntry[], today: string): string | { startDate: string; endDate: string | null } {
  const fields = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const startDate = fields.startDate
  if (!isIsoDate(startDate)) return 'invalid date'
  if (startDate > today) return 'the start cannot be in the future'
  if (diffDays(startDate, today) > MAX_PAST_DAYS) return 'that date is too far back'
  if (nearbyStart(periods, startDate)) return 'a period is already logged near that date'
  if (fields.endDate === undefined || fields.endDate === null || fields.endDate === '') return { startDate, endDate: null }
  const entry: PeriodEntry = { id: 0, startDate, endDate: null, createdAt: '' }
  const end = validatePeriodEnd(fields, entry, [...periods, entry], today)
  return typeof end === 'string' ? end : { startDate, endDate: end.endDate }
}

export function validatePeriodEnd(input: unknown, entry: PeriodEntry, periods: PeriodEntry[], today: string): string | { endDate: string } {
  const endDate = input && typeof input === 'object' ? (input as Record<string, unknown>).endDate : undefined
  if (!isIsoDate(endDate)) return 'invalid date'
  if (endDate > today) return 'the end cannot be in the future'
  if (endDate < entry.startDate) return 'the end cannot be before the start'
  if (diffDays(entry.startDate, endDate) >= MAX_PERIOD_DAYS) return 'that is too long for one period'
  const next = nextEntry(periods, entry)
  if (next && endDate >= next.startDate) return 'the end must be before the next start'
  return { endDate }
}

/**
 * Period pain, rated 1–10 for a day (0 when she says there is none). Above this, the day is a rest day: the
 * workout's points count without training, but the day only counts as a
 * workout day (for rewards and streaks) if she actually trains.
 */
export const PAIN_REST_ABOVE = 4
export const isPainRest = (pain: number | null | undefined) => (pain ?? 0) > PAIN_REST_ABOVE

/** A pain rating 1–10, 0 for none, or null to clear it. */
export function validatePain(input: unknown): number | null | string {
  const level = input && typeof input === 'object' ? (input as Record<string, unknown>).level : undefined
  if (level === null) return null
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 0 || level > 10) return 'level must be 0–10, or null'
  return level
}
