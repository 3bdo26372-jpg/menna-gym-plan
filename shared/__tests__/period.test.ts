import { describe, expect, it } from 'vitest'
import { addDays } from '../date'
import {
  cycleLengths, DEFAULT_CYCLE_DAYS, DEFAULT_PERIOD_DAYS, isPainRest, periodForecast, upcomingStarts, validateNewPeriod, validatePain, validatePeriodEnd,
  type PeriodEntry,
} from '../period'

let id = 1
const entry = (startDate: string, endDate: string | null = null): PeriodEntry => ({ id: id++, startDate, endDate, createdAt: '' })
const first = '2026-07-01'

describe('predicting the next period', () => {
  it('asks for a first start when nothing is logged', () => {
    expect(periodForecast([], first)).toMatchObject({ phase: 'unknown', nextStart: null, cycleDays: DEFAULT_CYCLE_DAYS, periodDays: DEFAULT_PERIOD_DAYS })
  })

  it('uses 28 days from a single start', () => {
    const forecast = periodForecast([entry(first)], addDays(first, 10))
    expect(forecast).toMatchObject({ nextStart: addDays(first, 28), daysUntil: 18, cyclesUsed: 0, phase: 'calm' })
  })

  it('averages her own recent cycles once there are two starts', () => {
    const periods = [entry(first), entry(addDays(first, 30)), entry(addDays(first, 62))]
    const forecast = periodForecast(periods, addDays(first, 70))
    expect(forecast.cycleDays).toBe(31)
    expect(forecast.cyclesUsed).toBe(2)
    expect(forecast.nextStart).toBe(addDays(first, 93))
  })

  it('leaves gaps from a start that was not logged out of the average', () => {
    // 29, then 58 (one missing in between), then 29.
    const starts = [0, 29, 87, 116].map((offset) => entry(addDays(first, offset)))
    expect(cycleLengths(starts)).toEqual([29, 29])
    expect(periodForecast(starts, addDays(first, 120)).cycleDays).toBe(29)
  })

  it('learns how long her period lasts from the ends she logs', () => {
    const periods = [entry(first, addDays(first, 5)), entry(addDays(first, 28), addDays(first, 33))]
    expect(periodForecast(periods, addDays(first, 40)).periodDays).toBe(6)
  })

  it('counts the days of the current period, until her usual length without an end', () => {
    expect(periodForecast([entry(first)], first)).toMatchObject({ phase: 'period', periodDay: 1 })
    expect(periodForecast([entry(first)], addDays(first, 4))).toMatchObject({ phase: 'period', periodDay: 5 })
    expect(periodForecast([entry(first)], addDays(first, 5)).phase).toBe('calm')
  })

  it('stops the current period on the end she logs', () => {
    expect(periodForecast([entry(first, addDays(first, 2))], addDays(first, 3)).phase).toBe('calm')
    expect(periodForecast([entry(first, addDays(first, 6))], addDays(first, 6))).toMatchObject({ phase: 'period', periodDay: 7 })
  })

  it('warns from 3 days before, on the day, and while it is late', () => {
    const periods = [entry(first)]
    const phaseOn = (offset: number) => periodForecast(periods, addDays(first, offset)).phase
    expect([24, 25, 27, 28, 29, 40].map(phaseOn)).toEqual(['calm', 'soon', 'soon', 'due', 'late', 'late'])
    expect(periodForecast(periods, addDays(first, 31)).daysUntil).toBe(-3)
  })

  it('ignores starts after today', () => {
    expect(periodForecast([entry(first), entry(addDays(first, 30))], addDays(first, 3)).last?.startDate).toBe(first)
  })

  it('lists the next expected starts, skipping one that is already late', () => {
    expect(upcomingStarts(periodForecast([entry(first)], addDays(first, 3)))).toEqual([28, 56, 84].map((offset) => addDays(first, offset)))
    expect(upcomingStarts(periodForecast([entry(first)], addDays(first, 30)), 2)).toEqual([56, 84].map((offset) => addDays(first, offset)))
  })
})

describe('logging a period', () => {
  const today = '2026-09-15'

  it('takes a start up to today', () => {
    expect(validateNewPeriod({ startDate: today }, [], today)).toEqual({ startDate: today, endDate: null })
    expect(validateNewPeriod({ startDate: '2026-08-20' }, [], today)).toEqual({ startDate: '2026-08-20', endDate: null })
    expect(validateNewPeriod({ startDate: addDays(today, 1) }, [], today)).toBeTypeOf('string')
    expect(validateNewPeriod({ startDate: '2025-09-01' }, [], today)).toBeTypeOf('string')
    expect(validateNewPeriod({ startDate: 'yesterday' }, [], today)).toBeTypeOf('string')
  })

  it('takes a past month with its end in one go', () => {
    expect(validateNewPeriod({ startDate: '2026-08-20', endDate: '2026-08-25' }, [], today)).toEqual({ startDate: '2026-08-20', endDate: '2026-08-25' })
    expect(validateNewPeriod({ startDate: '2026-08-20', endDate: '' }, [], today)).toEqual({ startDate: '2026-08-20', endDate: null })
    expect(validateNewPeriod({ startDate: '2026-08-20', endDate: '2026-08-19' }, [], today)).toBe('the end cannot be before the start')
    expect(validateNewPeriod({ startDate: '2026-08-20', endDate: '2026-09-05' }, [], today)).toBe('that is too long for one period')
    expect(validateNewPeriod({ startDate: '2026-08-20', endDate: '2026-08-31' }, [entry('2026-08-31')], today)).toBe('the end must be before the next start')
  })

  it('refuses the same period twice', () => {
    const logged = [entry('2026-09-10')]
    expect(validateNewPeriod({ startDate: today }, logged, today)).toBe('a period is already logged near that date')
    expect(validateNewPeriod({ startDate: '2026-08-12' }, logged, today)).toEqual({ startDate: '2026-08-12', endDate: null })
  })

  it('takes an end between the start and today, before the next start', () => {
    const current = entry('2026-09-10')
    expect(validatePeriodEnd({ endDate: '2026-09-14' }, current, [current], today)).toEqual({ endDate: '2026-09-14' })
    expect(validatePeriodEnd({ endDate: '2026-09-10' }, current, [current], today)).toEqual({ endDate: '2026-09-10' })
    expect(validatePeriodEnd({ endDate: '2026-09-09' }, current, [current], today)).toBeTypeOf('string')
    expect(validatePeriodEnd({ endDate: addDays(today, 1) }, current, [current], today)).toBeTypeOf('string')

    const older = entry('2026-08-01')
    expect(validatePeriodEnd({ endDate: '2026-08-15' }, older, [older, current], today)).toBe('that is too long for one period')
    expect(validatePeriodEnd({ endDate: '2026-08-14' }, older, [older, current], today)).toEqual({ endDate: '2026-08-14' })

    const shortCycle = entry('2026-08-12')
    expect(validatePeriodEnd({ endDate: '2026-08-12' }, older, [older, shortCycle], today)).toBe('the end must be before the next start')
  })
})

describe('period pain', () => {
  it('makes a rest day above 4', () => {
    expect([null, 0, 1, 4, 5, 10].map(isPainRest)).toEqual([false, false, false, false, true, true])
  })

  it('takes 0–10, or null to clear', () => {
    expect([0, 1, 10, null].map((level) => validatePain({ level }))).toEqual([0, 1, 10, null])
    for (const level of [-1, 11, 4.5, '7', undefined]) expect(validatePain({ level })).toBeTypeOf('string')
  })
})
