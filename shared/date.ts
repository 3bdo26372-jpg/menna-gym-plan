/**
 * Calendar-date helpers. Every daily record is keyed by its date in Cairo
 * ("YYYY-MM-DD"), no matter which time zone the phone or server is in.
 */
export const APP_TIME_ZONE = 'Africa/Cairo'

const cairoParts = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** The Cairo calendar date for an instant (defaults to now). */
export function cairoDate(at: Date = new Date()): string {
  const parts = Object.fromEntries(cairoParts.formatToParts(at).map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function toUtc(date: string) {
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)))
}

export function addDays(date: string, days: number): string {
  return new Date(toUtc(date) + days * 86_400_000).toISOString().slice(0, 10)
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000)
}

/** Program day number for a date; the start date is day 1. */
export function dayNumberFor(startDate: string, date: string): number {
  return diffDays(startDate, date) + 1
}

export function dateRange(from: string, to: string): string[] {
  const length = diffDays(from, to) + 1
  return Array.from({ length: Math.max(0, length) }, (_, index) => addDays(from, index))
}

export const PERIOD_DAYS = 30
export const WEEK_DAYS = 7

/** 1-based period (30-day "month" by default, or 7-day week) a program day belongs to. */
export function periodForDay(dayNumber: number, length = PERIOD_DAYS): number {
  return Math.max(1, Math.ceil(dayNumber / length))
}

export function periodBounds(startDate: string, periodIndex: number, length = PERIOD_DAYS) {
  const start = addDays(startDate, (periodIndex - 1) * length)
  return { start, end: addDays(start, length - 1) }
}

const arabicLong = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
const arabicShort = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'short' })
const arabicFull = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })

export function formatDateLong(date: string) {
  return arabicLong.format(new Date(`${date}T00:00:00Z`))
}

export function formatDateShort(date: string) {
  return arabicShort.format(new Date(`${date}T00:00:00Z`))
}

export function formatDateFull(date: string) {
  return arabicFull.format(new Date(`${date}T00:00:00Z`))
}

const cairoClock = new Intl.DateTimeFormat('en-GB', { timeZone: APP_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** Current Cairo wall-clock time as "HH:MM". */
export function cairoTime(at: Date = new Date()): string {
  return cairoClock.format(at)
}
