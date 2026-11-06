import { addDays, dateRange, diffDays, WEEK_DAYS } from './date'
import { cycleDay, isPainRest, periodForecast, periodRestDates, type PeriodEntry } from './period'
import { ACTIVE_DAY_MIN_COMPLETION } from './rewards'
import type { AppState, DayRecord } from './types'

/**
 * The training week. A program week is 7 days from the start date (the same
 * weeks as the weekly report). Each week has a number of workouts to aim for,
 * 5 at most, and she picks which days they are:
 * - a usual week: 5 workouts and 2 rest days
 * - a sensitive week, with 3 or more days just before or during her period
 *   (or rated painful): 4 workouts and 3 rest days
 * - logged period days and pain-rest days are rest on top of that, so they
 *   lower the week's workouts instead of using up her rest days
 *
 * A rest day costs nothing: the workout's share of the score is filled in,
 * and the day counts like a trained one, the same as a pain-rest day. She can
 * choose a rest day herself (today or yesterday); a past day without a
 * workout becomes one by itself while the week still has rest days left.
 * Only a day past that is a missed workout.
 *
 * Weeks before WEEKLY_PLAN_FROM keep the old "every day is a workout day" rule.
 */
export const WEEKLY_PLAN_FROM = '2026-11-03'
export const USUAL_WORKOUTS = 5
export const SENSITIVE_WORKOUTS = 4
/** This many period, pain or premenstrual days make a week a sensitive one. */
export const SENSITIVE_WEEK_DAYS = 3
/** Days before a period that count as "just before" it. */
const BEFORE_PERIOD_DAYS = 5

export type WeekDayKind = 'workout' | 'pass' | 'period' | 'rest' | 'missed' | 'today' | 'upcoming'

export interface WeekDay {
  date: string
  kind: WeekDayKind
  /** She picked this rest day herself. */
  chosen: boolean
}

export interface TrainingWeek {
  /** 1-based program week. */
  index: number
  startDate: string
  endDate: string
  sensitive: boolean
  /** Workouts to aim for this week (5 at most). */
  target: number
  /** Rest days the week gives her, besides period and pain days. */
  restAllowance: number
  /** Workouts and passed days so far. */
  done: number
  restUsed: number
  restLeft: number
  workoutsLeft: number
  /** Days still free to train: today (unless it is already settled) and the days after it. */
  daysLeft: number
  days: WeekDay[]
}

type WeekDayInput = Pick<DayRecord, 'date' | 'workout' | 'excused' | 'periodPain'>

export interface WeekInput {
  startDate: string
  today: string
  days: WeekDayInput[]
  /** The days she chose to rest. */
  restDays: string[]
  periods: PeriodEntry[] | undefined
}

/** The week input from the app state; null before the program starts. */
export function weekInput(state: Pick<AppState, 'today' | 'profile' | 'days' | 'periods' | 'restDays'>): WeekInput | null {
  const startDate = state.profile.programStartDate
  return startDate ? { startDate, today: state.today, days: state.days, restDays: state.restDays ?? [], periods: state.periods } : null
}

/** This week, or null before the program starts or while the weekly plan hasn't begun. */
export function currentWeek(state: Pick<AppState, 'today' | 'profile' | 'days' | 'periods' | 'restDays'>): TrainingWeek | null {
  const input = weekInput(state)
  return input && followsWeeklyPlan(input.startDate, input.today) ? trainingWeek(input) : null
}

export const trained = (day: Pick<DayRecord, 'workout'> | undefined) => Boolean(day?.workout && day.workout.mainCompletion >= ACTIVE_DAY_MIN_COMPLETION)

export const weekIndexFor = (startDate: string, date: string) => Math.floor(diffDays(startDate, date) / WEEK_DAYS) + 1
export const weekStartFor = (startDate: string, index: number) => addDays(startDate, (index - 1) * WEEK_DAYS)

/** Weeks that follow the weekly plan: the ones that start on or after WEEKLY_PLAN_FROM. */
export const followsWeeklyPlan = (startDate: string, date: string) => weekStartFor(startDate, weekIndexFor(startDate, date)) >= WEEKLY_PLAN_FROM

/**
 * Days just before or during a period: the 5 days before each logged start,
 * the logged period days, and what her forecast expects for the days ahead.
 */
function sensitiveDates(periods: PeriodEntry[] | undefined, today: string, dates: string[]) {
  const list = periods ?? []
  const result = new Set(periodRestDates(list, today))
  for (const entry of list) {
    for (let back = 1; back <= BEFORE_PERIOD_DAYS; back++) result.add(addDays(entry.startDate, -back))
  }
  for (const date of dates) {
    const phase = cycleDay(periodForecast(list, date), date)?.phase
    if (phase === 'premenstrual' || phase === 'period') result.add(date)
  }
  return result
}

export function trainingWeek(input: WeekInput, index = weekIndexFor(input.startDate, input.today)): TrainingWeek {
  const startDate = weekStartFor(input.startDate, index)
  const endDate = addDays(startDate, WEEK_DAYS - 1)
  const dates = dateRange(startDate, endDate)
  const byDate = new Map(input.days.map((day) => [day.date, day]))
  const periodDays = new Set(periodRestDates(input.periods, input.today))
  const chosen = new Set(input.restDays)
  const sensitive = sensitiveDates(input.periods, input.today, dates)

  const isPeriod = (date: string) => periodDays.has(date) || isPainRest(byDate.get(date)?.periodPain)
  const periodCount = dates.filter((date) => date <= input.today && isPeriod(date)).length
  const sensitiveCount = dates.filter((date) => sensitive.has(date) || (date <= input.today && isPeriod(date))).length
  const isSensitive = sensitiveCount >= SENSITIVE_WEEK_DAYS
  const restAllowance = WEEK_DAYS - (isSensitive ? SENSITIVE_WORKOUTS : USUAL_WORKOUTS)
  const target = Math.max(0, WEEK_DAYS - restAllowance - periodCount)

  // What each day already is, before rest days are handed out.
  const base = dates.map((date): WeekDayKind | null => {
    const day = byDate.get(date)
    if (trained(day)) return 'workout'
    if (date <= input.today && isPeriod(date)) return 'period'
    if (day?.excused) return 'pass'
    return null
  })
  // Rest days she chose come first, then the week's other rest days go to
  // past days without a workout, oldest first.
  let restUsed = dates.filter((date, i) => base[i] === null && chosen.has(date) && date <= input.today).length
  const days = dates.map((date, i): WeekDay => {
    const kind = base[i]
    if (kind) return { date, kind, chosen: false }
    if (chosen.has(date) && date <= input.today) return { date, kind: 'rest', chosen: true }
    if (date > input.today) return { date, kind: 'upcoming', chosen: false }
    if (date === input.today) return { date, kind: 'today', chosen: false }
    if (restUsed < restAllowance) {
      restUsed += 1
      return { date, kind: 'rest', chosen: false }
    }
    return { date, kind: 'missed', chosen: false }
  })

  const done = days.filter((day) => day.kind === 'workout' || day.kind === 'pass').length
  return {
    index,
    startDate,
    endDate,
    sensitive: isSensitive,
    target,
    restAllowance,
    done,
    restUsed,
    restLeft: Math.max(0, restAllowance - restUsed),
    workoutsLeft: Math.max(0, target - done),
    daysLeft: days.filter((day) => day.kind === 'today' || day.kind === 'upcoming').length,
    days,
  }
}

/** Every rest day of the weekly plan, up to today. */
export function restDayDates(input: WeekInput) {
  const result = new Set<string>()
  if (input.today < WEEKLY_PLAN_FROM) return result
  const last = weekIndexFor(input.startDate, input.today)
  for (let index = 1; index <= last; index++) {
    if (weekStartFor(input.startDate, index) < WEEKLY_PLAN_FROM) continue
    for (const day of trainingWeek(input, index).days) if (day.kind === 'rest') result.add(day.date)
  }
  return result
}

/**
 * Whether she can choose to rest today: it follows the weekly plan, has no
 * workout yet, isn't already a period or passed day, and the week still has a
 * rest day for it.
 */
export function canChooseRest(input: WeekInput, date: string) {
  if (!followsWeeklyPlan(input.startDate, date) || date > input.today) return false
  const week = trainingWeek(input, weekIndexFor(input.startDate, date))
  // Past days without a workout already become rest by themselves.
  return week.days.find((item) => item.date === date)?.kind === 'today' && week.restLeft > 0
}

export function validateRestDay(input: unknown): { rest: boolean } | string {
  const rest = input && typeof input === 'object' ? (input as Record<string, unknown>).rest : undefined
  if (typeof rest !== 'boolean') return 'rest must be true or false'
  return { rest }
}
