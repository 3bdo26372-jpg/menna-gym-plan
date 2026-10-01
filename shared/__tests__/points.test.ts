import { describe, expect, it } from 'vitest'
import { addDays } from '../date'
import { isActiveDay, newRewardUnlocks } from '../engine'
import type { FoodCategory, FoodEntry } from '../food'
import { PASS_PRICE, missedWorkout, passCandidates, passPrice, validatePass, type DayPass } from '../dayPasses'
import { EARN, earnings, pointsBalance, scorePoints } from '../points'
import { computeDailyScore, foodScoreInput } from '../scoring'
import type { DayRecord } from '../types'
import { makeupByDate, validateSpend, type WaterSpend } from '../waterPoints'
import { checkin, feedback, workout } from './fixtures'

const start = '2026-09-01'
let id = 1
const food = (date: string, item: string, category: FoodCategory = 'lunch', ml: number | null = null): FoodEntry =>
  ({ id: id++, date, time: '12:00', category, item, quantity: null, ml, createdAt: '' })
const water = (date: string, ml: number) => food(date, 'مية', 'drink', ml)
const spend = (overrides: Partial<WaterSpend>): WaterSpend => ({ id: 1, kind: 'request', points: 30, note: 'x', date: null, status: 'pending', createdAt: '', doneAt: null, ...overrides })

/** A day as the app builds it: score from the workout parts plus that day's water and food. */
function makeDay(dayNumber: number, foodEntries: FoodEntry[], parts: Partial<Pick<DayRecord, 'checkin' | 'workout' | 'feedback' | 'excused'>> = {}): DayRecord {
  const date = addDays(start, dayNumber - 1)
  const base = { checkin: null, workout: null, feedback: null, excused: false, ...parts }
  return { date, dayNumber, ...base, score: computeDailyScore(base, 0, base.excused, foodScoreInput(foodEntries.filter((entry) => entry.date === date), dayNumber)) }
}
const full = { checkin, workout: workout(), feedback: feedback() }
/** A perfect day: full workout, 2.5 L of water, food within the range (1,450). */
const perfectFood = (dayNumber: number) => {
  const date = addDays(start, dayNumber - 1)
  return [water(date, 2500), food(date, 'كشري'), food(date, 'فول وطعمية وعيش بلدي', 'breakfast')]
}

function state(days: DayRecord[], foodEntries: FoodEntry[], extra: { waterSpends?: WaterSpend[]; dayPasses?: DayPass[] } = {}) {
  const today = addDays(start, days.length - 1)
  return { today, profile: { name: 'Menna', programStartDate: start, timezone: 'Africa/Cairo' }, days, foodEntries, waterSpends: extra.waterSpends ?? [], dayPasses: extra.dayPasses ?? [] }
}

/** n perfect finished days, then today. */
function perfect(n: number) {
  const foodEntries = Array.from({ length: n }, (_, index) => perfectFood(index + 1)).flat()
  const days = [...Array.from({ length: n }, (_, index) => makeDay(index + 1, foodEntries, full)), makeDay(n + 1, foodEntries)]
  return { days, foodEntries }
}

describe('earning points by reaching goals', () => {
  it('gives score points by tier: 60+, 80+ and 100', () => {
    expect([59, 60, 79, 80, 99, 100].map(scorePoints)).toEqual([0, EARN.score60, EARN.score60, EARN.score80, EARN.score80, EARN.score100])
  })

  it('pays a perfect finished day 20: water 5, calories 5, score 10', () => {
    const { days, foodEntries } = perfect(1)
    expect(days[0].score.total).toBe(100)
    expect(earnings(state(days, foodEntries)).map((item) => [item.kind, item.points])).toEqual([['water', 5], ['calories', 5], ['score', 10]])
  })

  it('needs the full 2.5 L for water points, and counts it today already', () => {
    const today = addDays(start, 1)
    const entries = [water(start, 2250), water(today, 2500)]
    const days = [makeDay(1, entries), makeDay(2, entries)]
    expect(earnings(state(days, entries))).toEqual([{ date: today, kind: 'water', points: 5 }])
  })

  it('only scores finished days, and never counts a day pass toward the score tiers', () => {
    const entries = perfectFood(1)
    const excused = makeDay(1, entries, { excused: true })
    expect(excused.score.total).toBe(100)
    // Water 30 + calories 30 = 60 earned by her: 3 points, not the 10 of a full 100.
    expect(earnings(state([excused, makeDay(2, entries)], entries)).find((item) => item.kind === 'score')?.points).toBe(EARN.score60)
  })

  it('adds a bonus for every 7 workout days in a row', () => {
    const { days, foodEntries } = perfect(8)
    expect(earnings(state(days, foodEntries)).filter((item) => item.kind === 'streak')).toEqual([{ date: addDays(start, 6), kind: 'streak', points: EARN.streak }])
    expect(pointsBalance(state(days, foodEntries)).bySource).toEqual({ water: 40, calories: 40, score: 80, streak: 15 })
  })
})

describe('spending the one balance', () => {
  it('pays requests and gifts, and gives cancelled ones back', () => {
    const { days, foodEntries } = perfect(4) // 80 points
    const s = state(days, foodEntries, { waterSpends: [spend({ points: 30 }), spend({ kind: 'gift', points: 75, status: 'cancelled' })] })
    expect(pointsBalance(s)).toMatchObject({ earned: 80, spent: 30, balance: 50 })
    expect(validateSpend({ kind: 'request', note: '  ' }, s)).toBe('write what you would like')
    expect(validateSpend({ kind: 'request', note: ' خروجة ' }, s)).toEqual({ kind: 'request', points: 30, note: 'خروجة', date: null, status: 'pending' })
    expect(validateSpend({ kind: 'gift' }, s)).toBe('not enough points')
    expect(validateSpend({ kind: 'gift' }, state(days, foodEntries))).toEqual({ kind: 'gift', points: 75, note: null, date: null, status: 'pending' })
    expect(validateSpend({ kind: 'makeup', date: start }, s)).toBe('kind must be request or gift')
  })

  it('still counts older makeup spends', () => {
    expect(makeupByDate([spend({ kind: 'makeup', points: 10, date: start, status: 'done' }), spend({ kind: 'makeup', points: 40, date: start, status: 'cancelled' })]).get(start)).toBe(10)
  })
})

describe('day passes', () => {
  const empty = [makeDay(1, []), makeDay(2, []), makeDay(3, [])]

  it('fills the day to 100 and counts it as trained', () => {
    const excused = makeDay(1, [], { excused: true })
    expect(excused.score).toMatchObject({ pass: 100, total: 100 })
    expect(isActiveDay(excused)).toBe(true)
    expect(newRewardUnlocks([excused], [{ id: 'r', thresholdDays: 1, unlockedOn: null }])).toEqual([{ id: 'r', unlockedOn: start }])
  })

  it('makes the first pass free, then costs points from the balance', () => {
    expect(passPrice(state(empty, []))).toBe(0)
    expect(validatePass({ date: start }, state(empty, []))).toEqual({ date: start, points: 0 })
    const used = [{ date: start, points: 0, createdAt: '' }]
    expect(passPrice(state(empty, [], { dayPasses: used }))).toBe(PASS_PRICE)
    expect(validatePass({ date: addDays(start, 1) }, state(empty, [], { dayPasses: used }))).toBe('not enough points')
    const { days, foodEntries } = perfect(3) // 60 points
    const missed = [...days.slice(0, 3), makeDay(4, foodEntries)]
    expect(validatePass({ date: addDays(start, 3) }, state(missed, foodEntries, { dayPasses: used }))).toEqual({ date: addDays(start, 3), points: 50 })
  })

  it('works on any day short of 100, once a day', () => {
    expect(passCandidates(state(empty, [])).map((item) => item.dayNumber)).toEqual([3, 2, 1])
    expect(validatePass({ date: start }, state([makeDay(1, [], { excused: true }), ...empty.slice(1)], []))).toBe('this day is already done')
    expect(validatePass({ date: addDays(start, 5) }, state(empty, []))).toBe('unknown day')
    expect(missedWorkout(makeDay(1, [], full))).toBe(false)
    expect(missedWorkout(empty[0])).toBe(true)
  })
})
