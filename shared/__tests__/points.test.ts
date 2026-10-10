import { describe, expect, it } from 'vitest'
import { addDays } from '../date'
import { isActiveDay, newRewardUnlocks } from '../engine'
import type { FoodCategory, FoodEntry } from '../food'
import { PASS_PRICE, missedWorkout, passCandidates, passPrice, passPriceFor, periodPassDates, unusedGifts, validatePass, type DayPass, type PassGift } from '../dayPasses'
import { EARN, earnings, legacyWaterPoints, pointsBalance, scorePoints } from '../points'
import { computeDailyScore, foodScoreInput, isLegacyDay } from '../scoring'
import type { PeriodEntry } from '../period'
import type { DayRecord } from '../types'
import { makeupByDate, validateSpend, type WaterSpend } from '../waterPoints'
import { checkin, feedback, workout } from './fixtures'

const start = '2026-11-01'
let id = 1
const food = (date: string, item: string, category: FoodCategory = 'lunch', ml: number | null = null): FoodEntry =>
  ({ id: id++, date, time: '12:00', category, item, quantity: null, ml, createdAt: '' })
const water = (date: string, ml: number) => food(date, 'مية', 'drink', ml)
const spend = (overrides: Partial<WaterSpend>): WaterSpend => ({ id: 1, kind: 'request', points: 30, note: 'x', date: null, status: 'pending', createdAt: '', doneAt: null, ...overrides })

/** A day as the app builds it: score from the workout parts plus that day's water and food. */
function makeDay(dayNumber: number, foodEntries: FoodEntry[], parts: Partial<Pick<DayRecord, 'checkin' | 'workout' | 'feedback' | 'excused' | 'periodPain'>> = {}): DayRecord {
  const date = addDays(start, dayNumber - 1)
  const base = { checkin: null, workout: null, feedback: null, excused: false, periodPain: null, ...parts }
  return { date, dayNumber, ...base, score: computeDailyScore(base, 0, base.excused, foodScoreInput(foodEntries.filter((entry) => entry.date === date), dayNumber)) }
}
const full = { checkin, workout: workout(), feedback: feedback() }
/** A perfect day: full workout, 2.5 L of water, food within the range (1,450). */
const perfectFood = (dayNumber: number) => {
  const date = addDays(start, dayNumber - 1)
  return [water(date, 2500), food(date, 'كشري'), food(date, 'فول وطعمية وعيش بلدي', 'breakfast')]
}

function state(days: DayRecord[], foodEntries: FoodEntry[], extra: { waterSpends?: WaterSpend[]; dayPasses?: DayPass[]; passGifts?: PassGift[]; periods?: PeriodEntry[] } = {}) {
  const today = addDays(days[0]?.date ?? start, days.length - 1)
  const programStartDate = days[0]?.date ?? start
  return { today, profile: { name: 'Menna', programStartDate, timezone: 'Africa/Cairo' }, days, foodEntries, waterSpends: extra.waterSpends ?? [], dayPasses: extra.dayPasses ?? [], passGifts: extra.passGifts ?? [], periods: extra.periods ?? [] }
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
    expect(validatePass({ date: start }, state(empty, []))).toEqual({ date: start, points: 0, kind: 'regular' })
    const used = [{ date: start, points: 0, createdAt: '' }]
    expect(passPrice(state(empty, [], { dayPasses: used }))).toBe(PASS_PRICE)
    expect(validatePass({ date: addDays(start, 1) }, state(empty, [], { dayPasses: used }))).toBe('not enough points')
    const { days, foodEntries } = perfect(3) // 60 points
    const missed = [...days.slice(0, 3), makeDay(4, foodEntries)]
    expect(validatePass({ date: addDays(start, 3) }, state(missed, foodEntries, { dayPasses: used }))).toEqual({ date: addDays(start, 3), points: 50, kind: 'regular' })
  })

  it('works on any day short of 100, once a day', () => {
    expect(passCandidates(state(empty, [])).map((item) => item.dayNumber)).toEqual([3, 2, 1])
    expect(validatePass({ date: start }, state([makeDay(1, [], { excused: true }), ...empty.slice(1)], []))).toBe('this day is already done')
    expect(validatePass({ date: addDays(start, 5) }, state(empty, []))).toBe('unknown day')
    expect(missedWorkout(makeDay(1, [], full))).toBe(false)
    expect(missedWorkout(empty[0])).toBe(true)
  })
})

describe('period passes', () => {
  const days = [1, 2, 3, 4, 5].map((dayNumber) => makeDay(dayNumber, []))
  const periods: PeriodEntry[] = [{ id: 1, startDate: addDays(start, 1), endDate: null, createdAt: '' }]
  const used = [{ date: start, points: 0, kind: 'regular' as const, createdAt: '' }]

  it('gives each of the first three days of a period its own free pass, up to today', () => {
    expect(periodPassDates({ periods, today: addDays(start, 2) })).toEqual([addDays(start, 1), addDays(start, 2)])
    expect(periodPassDates({ periods, today: addDays(start, 4) })).toEqual([1, 2, 3].map((offset) => addDays(start, offset)))
  })

  it('is free even when the free pass is used up and there are no points', () => {
    const s = state(days, [], { dayPasses: used, periods })
    expect(passPriceFor(s, addDays(start, 2))).toBe(0)
    expect(validatePass({ date: addDays(start, 2) }, s)).toEqual({ date: addDays(start, 2), points: 0, kind: 'period' })
    expect(validatePass({ date: addDays(start, 4) }, s)).toBe('not enough points')
  })

  it("doesn't use up the free pass or a gift", () => {
    const periodPass = { date: addDays(start, 1), points: 0, kind: 'period' as const, createdAt: '' }
    expect(passPrice(state(days, [], { dayPasses: [periodPass], periods }))).toBe(0)
    const gift = { id: 1, note: 'هدية', createdAt: '' }
    expect(unusedGifts(state(days, [], { dayPasses: [...used, periodPass], passGifts: [gift], periods }))).toEqual([gift])
  })
})

describe('days before the new system keep what they earned', () => {
  const old = '2026-09-29'
  const oldDay = (offset: number, entries: FoodEntry[], parts: Partial<Pick<DayRecord, 'checkin' | 'workout' | 'feedback' | 'excused'>> = {}): DayRecord => {
    const date = addDays(old, offset)
    const base = { checkin: null, workout: null, feedback: null, excused: false, periodPain: null, ...parts }
    return { date, dayNumber: offset + 1, ...base, score: computeDailyScore(base, 0, base.excused, foodScoreInput(entries.filter((entry) => entry.date === date), offset + 1), isLegacyDay(date)) }
  }

  it('scores a full workout 100 before October 2, whatever the water and food', () => {
    expect(isLegacyDay('2026-10-01')).toBe(true)
    expect(isLegacyDay('2026-10-02')).toBe(false)
    const entries = [water(old, 1000), food(old, 'كشري'), food(old, 'كشري')]
    expect(oldDay(0, entries, full).score).toMatchObject({ checkin: 15, workout: 60, warmupCooldown: 10, feedback: 15, water: 0, calories: 0, total: 100 })
  })

  it('keeps the original points: a point per cup with a 2 L bonus, and 10 for food in range', () => {
    expect([1000, 1750, 2000, 2500, 4000].map(legacyWaterPoints)).toEqual([4, 7, 13, 15, 15])
    const entries = [water(old, 1000), water(addDays(old, 1), 2000), food(addDays(old, 1), 'كشري'), food(addDays(old, 1), 'فول وطعمية وعيش بلدي', 'breakfast')]
    const days = [oldDay(0, entries, full), oldDay(1, entries, full), oldDay(2, entries), oldDay(3, entries)]
    // Day 3 (Oct 2) is today and on the new system; nothing logged on it.
    expect(earnings(state(days, entries)).map((item) => [item.date.slice(5), item.kind, item.points])).toEqual([
      ['09-29', 'water', 4], ['09-30', 'water', 13], ['09-30', 'calories', 10],
    ])
  })
})

describe('gifted passes', () => {
  const empty = [makeDay(1, []), makeDay(2, []), makeDay(3, [])]
  const gift: PassGift = { id: 1, note: 'عشان انتي قلب بابا', createdAt: '' }

  it('makes one more pass free per gift, and shows the gift until it is used', () => {
    const usedFirst = [{ date: start, points: 0, createdAt: '' }]
    expect(passPrice(state(empty, [], { dayPasses: usedFirst }))).toBe(PASS_PRICE)
    expect(passPrice(state(empty, [], { dayPasses: usedFirst, passGifts: [gift] }))).toBe(0)
    expect(unusedGifts(state(empty, [], { dayPasses: usedFirst, passGifts: [gift] }))).toEqual([gift])
    expect(validatePass({ date: addDays(start, 1) }, state(empty, [], { dayPasses: usedFirst, passGifts: [gift] }))).toEqual({ date: addDays(start, 1), points: 0, kind: 'regular' })
    const usedBoth = [...usedFirst, { date: addDays(start, 1), points: 0, createdAt: '' }]
    expect(unusedGifts(state(empty, [], { dayPasses: usedBoth, passGifts: [gift] }))).toEqual([])
    expect(passPrice(state(empty, [], { dayPasses: usedBoth, passGifts: [gift] }))).toBe(PASS_PRICE)
  })
})

describe('period-pain rest days', () => {
  it('give the workout points, count them for score points, and count as workout days', () => {
    const entries = perfectFood(1)
    const rest = makeDay(1, entries, { periodPain: 7 })
    expect(rest.score).toMatchObject({ rest: 40, total: 100 })
    expect(isActiveDay(rest)).toBe(true)
    // Water 30 + calories 30 + the rest day's 40 = 100: the full 10.
    expect(earnings(state([rest, makeDay(2, entries)], entries)).find((item) => item.kind === 'score')?.points).toBe(EARN.score100)
    expect(newRewardUnlocks([rest], [{ id: 'r', thresholdDays: 1, unlockedOn: null }])).toEqual([{ id: 'r', unlockedOn: start }])
  })

  it('do not count with pain of 4 or less', () => {
    expect(isActiveDay(makeDay(1, [], { periodPain: 4 }))).toBe(false)
  })

  it('count as workout days when she trains anyway', () => {
    expect(isActiveDay(makeDay(1, [], { periodPain: 7, workout: workout({ mainCompletion: 0.5 }) }))).toBe(true)
  })

  it('count in a run of workout days', () => {
    const foodEntries = Array.from({ length: 8 }, (_, index) => perfectFood(index + 1)).flat()
    const days = Array.from({ length: 8 }, (_, index) => makeDay(index + 1, foodEntries, index === 3 ? { periodPain: 8 } : full))
    const streaks = earnings(state([...days, makeDay(9, foodEntries)], foodEntries)).filter((item) => item.kind === 'streak')
    // Days 1–7, with the rest day as day 4, are 7 workout days in a row.
    expect(streaks).toEqual([{ date: addDays(start, 6), kind: 'streak', points: EARN.streak }])
  })
})
