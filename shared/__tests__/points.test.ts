import { describe, expect, it } from 'vitest'
import { addDays } from '../date'
import { isActiveDay, newRewardUnlocks } from '../engine'
import type { FoodCategory, FoodEntry } from '../food'
import { PASS_PRICE, missedWorkout, passCandidates, passPrice, validatePass, type DayPass } from '../dayPasses'
import { calorieDaysEarned, pointsBalance, waterPointsForMl } from '../points'
import { computeDailyScore } from '../scoring'
import { makeupByDate, validateSpend, type WaterSpend } from '../waterPoints'
import { checkin, day, feedback, workout } from './fixtures'

const start = '2026-09-29'
const today = addDays(start, 3)
let id = 1
const food = (date: string, item: string, category: FoodCategory = 'lunch', ml: number | null = null): FoodEntry =>
  ({ id: id++, date, time: '12:00', category, item, quantity: null, ml, createdAt: '' })
const water = (date: string, ml: number) => food(date, 'مية', 'drink', ml)
const spend = (overrides: Partial<WaterSpend>): WaterSpend => ({ id: 1, kind: 'request', points: 30, note: 'x', date: null, status: 'pending', createdAt: '', doneAt: null, ...overrides })

const days = [
  day(start, 1, { checkin, workout: workout(), feedback: feedback() }),
  day(addDays(start, 1), 2, { checkin, workout: workout({ mainCompletion: 0.4 }) }),
  day(addDays(start, 2), 3),
  day(today, 4),
]
function state({ foodEntries = [] as FoodEntry[], waterSpends = [] as WaterSpend[], dayPasses = [] as DayPass[], list = days } = {}) {
  return { today, profile: { name: 'Menna', programStartDate: start, timezone: 'Africa/Cairo' }, days: list, foodEntries, waterSpends, dayPasses }
}

describe('one points balance from water and calories', () => {
  it('earns water points per 250 ml up to 2.5 L, plus a bonus at 2 L', () => {
    expect([0, 240, 1000, 1750, 2000, 2500, 4000].map(waterPointsForMl)).toEqual([0, 0, 4, 7, 13, 15, 15])
  })

  it('earns calorie points on finished days within the allowance, never under the floor', () => {
    const entries = [
      food(start, 'كشري'), food(start, 'فول وطعمية وعيش بلدي', 'breakfast'), // 1,450: within
      food(addDays(start, 1), 'كشري'), food(addDays(start, 1), 'بيتزا'), food(addDays(start, 1), 'كشري'), // 2,000: over 1,950
      food(addDays(start, 2), 'سلطة'), // under the floor
      food(today, 'كشري'), food(today, 'كشري'), // today isn't finished
    ]
    expect(calorieDaysEarned(state({ foodEntries: entries })).map((item) => item.dayNumber)).toEqual([1])
  })

  it('adds both into one balance, spent by requests, gifts and passes', () => {
    const foodEntries = [water(start, 2500), water(addDays(start, 1), 2000), food(start, 'كشري'), food(start, 'فول وطعمية وعيش بلدي', 'breakfast')]
    const waterSpends = [spend({ points: 30 }), spend({ kind: 'gift', points: 75, status: 'cancelled' })]
    const dayPasses = [{ date: addDays(start, 2), points: 0, createdAt: '' }]
    expect(pointsBalance(state({ foodEntries, waterSpends, dayPasses }))).toEqual({ water: 28, calories: 10, earned: 38, spent: 30, balance: 8 })
  })

  it('lets requests and gifts spend the shared balance', () => {
    const rich = { foodEntries: [water(start, 2500), water(addDays(start, 1), 2500), water(addDays(start, 2), 2500), water(today, 2500), water(addDays(start, -1), 2500), food(start, 'كشري'), food(start, 'فول وطعمية وعيش بلدي', 'breakfast')] }
    expect(validateSpend({ kind: 'request', note: '  ' }, state(rich))).toBe('write what you would like')
    expect(validateSpend({ kind: 'request', note: ' خروجة ' }, state(rich))).toEqual({ kind: 'request', points: 30, note: 'خروجة', date: null, status: 'pending' })
    expect(validateSpend({ kind: 'gift' }, state(rich))).toEqual({ kind: 'gift', points: 75, note: null, date: null, status: 'pending' })
    expect(validateSpend({ kind: 'gift' }, state({ foodEntries: [water(start, 2500)] }))).toBe('not enough points')
    expect(validateSpend({ kind: 'makeup', date: start }, state(rich))).toBe('kind must be request or gift')
  })

  it('still counts older makeup spends', () => {
    expect(makeupByDate([spend({ kind: 'makeup', points: 10, date: start, status: 'done' }), spend({ kind: 'makeup', points: 40, date: start, status: 'cancelled' })]).get(start)).toBe(10)
  })
})

describe('day passes', () => {
  it('fills the day to 100 and counts it as trained', () => {
    const excused = day(addDays(start, 2), 3, { excused: true })
    expect(excused.score).toMatchObject({ pass: 100, total: 100 })
    expect(computeDailyScore({ checkin: null, workout: null, feedback: null }, 0, true, { waterMl: 2000, calories: 1800, calorieMax: 1950 })).toMatchObject({ water: 30, calories: 30, pass: 40, total: 100 })
    expect(isActiveDay(excused)).toBe(true)
    expect(newRewardUnlocks([...days.slice(0, 2), excused], [{ id: 'r', thresholdDays: 2, unlockedOn: null }])).toEqual([{ id: 'r', unlockedOn: addDays(start, 2) }])
  })

  it('makes the first pass free, then costs points from the shared balance', () => {
    expect(passPrice(state())).toBe(0)
    expect(validatePass({ date: addDays(start, 2) }, state())).toEqual({ date: addDays(start, 2), points: 0 })
    const used = [{ date: addDays(start, 2), points: 0, createdAt: '' }]
    expect(passPrice(state({ dayPasses: used }))).toBe(PASS_PRICE)
    expect(validatePass({ date: addDays(start, 1) }, state({ dayPasses: used }))).toBe('not enough points')
    const rich = [water(start, 2500), water(addDays(start, 1), 2500), water(addDays(start, 2), 2500), water(today, 2500)]
    expect(validatePass({ date: addDays(start, 1) }, state({ dayPasses: used, foodEntries: rich }))).toEqual({ date: addDays(start, 1), points: 50 })
  })

  it('works on any day short of 100, and only once a day', () => {
    // Day 1 trained but logged no water or food, so it is short of 100 too.
    expect(passCandidates(state()).map((item) => item.dayNumber)).toEqual([4, 3, 2, 1])
    const full = day(start, 1, { excused: true })
    expect(validatePass({ date: start }, state({ list: [full, ...days.slice(1)] }))).toBe('this day is already done')
    expect(validatePass({ date: addDays(today, 1) }, state())).toBe('unknown day')
    expect(missedWorkout(days[0])).toBe(false)
    expect(missedWorkout(days[2])).toBe(true)
  })
})
