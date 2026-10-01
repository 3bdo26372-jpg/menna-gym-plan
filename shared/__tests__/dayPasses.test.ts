import { describe, expect, it } from 'vitest'
import { addDays } from '../date'
import { isActiveDay, newRewardUnlocks } from '../engine'
import type { FoodCategory, FoodEntry } from '../food'
import { CALORIE_POINTS_PER_DAY, PASS_PRICE, calorieDaysEarned, passBalance, passCandidates, validatePass, type DayPass } from '../dayPasses'
import { checkin, day, feedback, workout } from './fixtures'

const start = '2026-09-29'
const today = addDays(start, 3)
let id = 1
const food = (date: string, item: string, category: FoodCategory = 'lunch'): FoodEntry => ({ id: id++, date, time: '12:00', category, item, quantity: null, ml: null, createdAt: '' })

const days = [
  day(start, 1, { checkin, workout: workout(), feedback: feedback() }),
  day(addDays(start, 1), 2, { checkin, workout: workout({ mainCompletion: 0.4 }) }),
  day(addDays(start, 2), 3),
  day(today, 4),
]
const state = (foodEntries: FoodEntry[] = [], dayPasses: DayPass[] = []) =>
  ({ today, profile: { name: 'Menna', programStartDate: start, timezone: 'Africa/Cairo' }, days, foodEntries, dayPasses })

describe('day passes', () => {
  it('makes the first pass free, and counts the day as trained with the full workout share', () => {
    const s = state()
    expect(passBalance(s)).toEqual({ earned: 0, spent: 0, balance: 0, price: 0 })
    expect(passCandidates(s).map((item) => item.dayNumber)).toEqual([4, 3, 2])
    expect(validatePass({ date: addDays(start, 2) }, s)).toEqual({ date: addDays(start, 2), points: 0 })
    const excused = day(addDays(start, 2), 3, { excused: true })
    expect(excused.score).toMatchObject({ pass: 40, total: 40 })
    expect(isActiveDay(excused)).toBe(true)
    expect(newRewardUnlocks([...days.slice(0, 2), excused], [{ id: 'r', thresholdDays: 2, unlockedOn: null }])).toEqual([{ id: 'r', unlockedOn: addDays(start, 2) }])
  })

  it('fills a partial workout up to its 40', () => {
    expect(day(addDays(start, 1), 2, { checkin, workout: workout({ mainCompletion: 0.4 }), excused: true }).score).toMatchObject({ workout: 10, pass: 20, total: 40 })
  })

  it('refuses days already trained or passed, and later passes without enough points', () => {
    expect(validatePass({ date: start }, state())).toBe('this day is already done')
    const used: DayPass[] = [{ date: addDays(start, 2), points: 0, createdAt: '' }]
    expect(passBalance(state([], used)).price).toBe(PASS_PRICE)
    expect(validatePass({ date: addDays(start, 1) }, state([], used))).toBe('not enough calorie points')
    expect(validatePass({ date: addDays(today, 1) }, state())).toBe('unknown day')
  })

  it('earns calorie points on finished days within the allowance, never under the floor', () => {
    const entries = [
      food(start, 'كشري'), food(start, 'فول وطعمية وعيش بلدي', 'breakfast'), // 1,450: within → points
      food(addDays(start, 1), 'كشري'), food(addDays(start, 1), 'بيتزا'), food(addDays(start, 1), 'كشري'), // 2,000: over 1,950
      food(addDays(start, 2), 'سلطة'), // 60: under the floor
      food(today, 'كشري'), food(today, 'كشري'), // today isn't finished
    ]
    expect(calorieDaysEarned(state(entries)).map((item) => item.dayNumber)).toEqual([1])
    expect(passBalance(state(entries)).earned).toBe(CALORIE_POINTS_PER_DAY)
  })
})
