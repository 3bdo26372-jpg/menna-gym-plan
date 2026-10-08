import { describe, expect, it } from 'vitest'
import { addDays } from '../date'
import type { FoodEntry } from '../food'
import { cycleDay, periodForecast, type PeriodEntry } from '../period'
import { formatSleep, isLateBedtime, sleepMinutes, validateSleep } from '../sleep'
import { dailyTips, DRINKS, hadDrink } from '../tips'
import type { AppState, DayRecord } from '../types'
import { day, workout } from './fixtures'

const start = '2026-10-01'
const period = (startDate: string, endDate: string | null = null): PeriodEntry => ({ id: 1, startDate, endDate, createdAt: '' })

describe('sleep', () => {
  it('reads a bedtime after midnight and one before it', () => {
    expect(sleepMinutes({ sleptAt: '02:30', wokeAt: '10:00' })).toBe(450)
    expect(sleepMinutes({ sleptAt: '23:00', wokeAt: '07:00' })).toBe(480)
    expect(formatSleep(450)).toBe('7 ساعات ونص')
    expect(formatSleep(480)).toBe('8 ساعات')
  })

  it('calls 2 am and later late', () => {
    expect(isLateBedtime({ sleptAt: '01:30', wokeAt: '09:00' })).toBe(false)
    expect(isLateBedtime({ sleptAt: '03:00', wokeAt: '11:00' })).toBe(true)
    expect(isLateBedtime({ sleptAt: '23:30', wokeAt: '07:00' })).toBe(false)
  })

  it('validates times and clears with null', () => {
    expect(validateSleep({ sleptAt: '01:00', wokeAt: '09:00' })).toEqual({ sleptAt: '01:00', wokeAt: '09:00' })
    expect(validateSleep(null)).toBeNull()
    expect(validateSleep({ sleptAt: '1am', wokeAt: '09:00' })).toBeTypeOf('string')
    expect(validateSleep({ sleptAt: '09:30', wokeAt: '09:00' })).toBeTypeOf('string')
  })
})

describe('cycle phases', () => {
  const on = (offset: number, periods = [period(start)]) => cycleDay(periodForecast(periods, addDays(start, offset)), addDays(start, offset))

  it('follows a 28-day cycle', () => {
    expect(on(0)?.phase).toBe('period')
    expect(on(6)?.phase).toBe('follicular')
    expect(on(13)?.phase).toBe('ovulation')
    expect(on(18)?.phase).toBe('luteal')
    expect(on(25)?.phase).toBe('premenstrual')
  })

  it('opens the measuring window two days after the period ends, for four days', () => {
    // A 5-day period ends on day 5, so days 8–11 suit weighing.
    expect(on(6)?.measureDaysLeft).toBe(0)
    expect(on(7)?.measureDaysLeft).toBe(4)
    expect(on(10)?.measureDaysLeft).toBe(1)
    expect(on(11)?.measureDaysLeft).toBe(0)
  })

  it('uses the end she logged', () => {
    expect(on(5, [period(start, addDays(start, 2))])?.measureDaysLeft).toBe(4)
  })

  it('says nothing long after a missed start', () => {
    expect(on(45)).toBeNull()
  })
})

function food(date: string, item: string, ml: number | null = null, category: FoodEntry['category'] = 'drink'): FoodEntry {
  return { id: 0, date, time: '12:00', category, item, quantity: null, ml, createdAt: '' }
}

function state(today: string, overrides: Partial<AppState> = {}, todayParts: Partial<DayRecord> = {}): AppState {
  const days = [day(addDays(today, -1), 1), { ...day(today, 2), sleep: null, ...todayParts }]
  return {
    today, profile: { name: 'Menna', programStartDate: addDays(today, -1), timezone: 'Africa/Cairo' }, baseline: [], measurements: [], days,
    rewards: [], reports: [], foodEntries: [], waterSpends: [], dayPasses: [], passGifts: [], periods: [], ...overrides,
  }
}
const ids = (s: AppState, hour = 10) => dailyTips(s, hour).map((tip) => tip.id)

describe('daily tips', () => {
  it('asks for sleep, the period and more water on an empty day', () => {
    expect(ids(state(start))).toEqual(['sleep-log', 'period-log', 'water', 'drink'])
  })

  it('stops asking about sleep once it is logged, unless it was short or late', () => {
    expect(ids(state(start, {}, { sleep: { sleptAt: '00:30', wokeAt: '08:30' } }))).not.toContain('sleep')
    const short = dailyTips(state(start, {}, { sleep: { sleptAt: '01:00', wokeAt: '06:00' } }), 10).find((tip) => tip.id === 'sleep')
    expect(short?.title).toContain('5 ساعات')
    expect(ids(state(start, {}, { sleep: { sleptAt: '03:30', wokeAt: '11:30' } }))).toContain('sleep')
  })

  it('asks to weigh only in the window, once a cycle', () => {
    const today = addDays(start, 8)
    const inWindow = state(today, { periods: [period(start)] })
    expect(ids(inWindow)).toContain('measure')
    expect(ids({ ...inWindow, measurements: [{ id: 1, measuredOn: today, values: { weight: 78 }, note: null, createdAt: '' }] })).not.toContain('measure')
    expect(ids(state(addDays(start, 18), { periods: [period(start)] }))).not.toContain('measure')
  })

  it('drops the water ask once yesterday was enough', () => {
    const yesterday = addDays(start, -1)
    const enough = Array.from({ length: 8 }, () => food(yesterday, 'مية', 250))
    expect(ids(state(start, { foodEntries: enough }))).not.toContain('water')
  })

  it('asks her to eat enough after a very low day', () => {
    expect(ids(state(start, { foodEntries: [food(addDays(start, -1), 'تفاحه', null, 'snack')] }))).toContain('food')
  })

  it('suggests training for the phase until she trains', () => {
    const today = addDays(start, 8)
    const tips = dailyTips(state(today, { periods: [period(start)] }), 10)
    expect(tips.find((tip) => tip.id === 'train')?.title).toMatch(/^جسمك في أحلى أوقاته يا /)
    expect(ids(state(today, { periods: [period(start)] }, { workout: workout() }))).not.toContain('train')
  })

  it('names her on every tip, and قلب دادي around ovulation', () => {
    const tips = dailyTips(state(addDays(start, 13), { periods: [period(start)] }), 10)
    expect(tips.some((tip) => tip.title.includes('قلب دادي'))).toBe(true)
    expect(tips.every((tip) => !`${tip.title}${tip.text}`.includes('{nick}'))).toBe(true)
  })

  it('drops the drink once she logged it', () => {
    const drink = dailyTips(state(start), 10).find((tip) => tip.id === 'drink')!.drink!
    expect(ids(state(start, { foodEntries: [food(start, drink.item)] }))).not.toContain('drink')
    expect(hadDrink([{ item: 'شاى أخضر بالنعناع' }], DRINKS.greenTea)).toBe(true)
  })
})
