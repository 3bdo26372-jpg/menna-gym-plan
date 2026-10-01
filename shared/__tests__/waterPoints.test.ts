import { describe, expect, it } from 'vitest'
import { addDays } from '../date'
import type { FoodEntry } from '../food'
import { computeDailyScore } from '../scoring'
import type { DayRecord } from '../types'
import { makeupByDate, makeupCandidates, validateSpend, waterPointsBalance, waterPointsForMl, type WaterSpend } from '../waterPoints'
import { checkin, day, feedback, workout } from './fixtures'

const start = '2026-09-29'
const today = addDays(start, 4)

const water = (date: string, ml: number, id = 0): FoodEntry => ({ id, date, time: '10:00', category: 'drink', item: 'مية', quantity: null, ml, createdAt: '' })
const spend = (overrides: Partial<WaterSpend>): WaterSpend => ({
  id: 1, kind: 'request', points: 30, note: 'x', date: null, status: 'pending', createdAt: '', doneAt: null, ...overrides,
})

function state({ foodEntries = [] as FoodEntry[], waterSpends = [] as WaterSpend[], days = [] as DayRecord[] } = {}) {
  return { today, profile: { name: 'Menna', programStartDate: start, timezone: 'Africa/Cairo' }, days, foodEntries, waterSpends }
}

describe('water points', () => {
  it('gives a point per 250 ml up to 2.5 L, plus a bonus at 2 L', () => {
    expect(waterPointsForMl(0)).toBe(0)
    expect(waterPointsForMl(240)).toBe(0)
    expect(waterPointsForMl(1000)).toBe(4)
    expect(waterPointsForMl(1750)).toBe(7)
    expect(waterPointsForMl(2000)).toBe(13)
    expect(waterPointsForMl(2500)).toBe(15)
    expect(waterPointsForMl(4000)).toBe(15)
  })

  it('caps points per day, not across days, and only counts water', () => {
    const entries = [
      water(start, 1500), water(start, 1500),
      water(addDays(start, 1), 500),
      { ...water(addDays(start, 1), 500), item: 'قهوة' },
    ]
    // Day 1: 3 L → 10 + 5 bonus. Day 2: 500 ml of water → 2 (the coffee does not count).
    expect(waterPointsBalance(entries, [])).toEqual({ earned: 17, spent: 0, balance: 17 })
  })

  it('subtracts spends, except cancelled ones', () => {
    const spends = [spend({ points: 30 }), spend({ points: 75, status: 'cancelled' }), spend({ kind: 'makeup', points: 5, status: 'done' })]
    expect(waterPointsBalance([water(start, 2500), water(addDays(start, 1), 2500), water(addDays(start, 2), 2500)], spends))
      .toEqual({ earned: 45, spent: 35, balance: 10 })
  })

  it('adds up made-up points per day', () => {
    const spends = [
      spend({ kind: 'makeup', points: 10, date: start, status: 'done' }),
      spend({ kind: 'makeup', points: 5, date: start, status: 'done' }),
      spend({ kind: 'makeup', points: 40, date: start, status: 'cancelled' }),
    ]
    expect(makeupByDate(spends).get(start)).toBe(15)
  })
})

describe('spending water points', () => {
  const rich = [water(start, 2500), water(addDays(start, 1), 2500), water(addDays(start, 2), 2500), water(addDays(start, 3), 2500), water(today, 2500)]
  const days = [
    day(start, 1, { checkin, workout: workout(), feedback: feedback() }),
    day(addDays(start, 1), 2, { checkin, workout: workout({ mainCompletion: 0.5 }) }),
    day(addDays(start, 2), 3),
    day(addDays(start, 3), 4),
    day(today, 5),
  ]

  it('needs a note for a request and enough points', () => {
    expect(validateSpend({ kind: 'request', note: '  ' }, state({ foodEntries: rich }))).toBe('write what you would like')
    expect(validateSpend({ kind: 'request', note: ' خروجة ' }, state({ foodEntries: rich })))
      .toEqual({ kind: 'request', points: 30, note: 'خروجة', date: null, status: 'pending' })
    expect(validateSpend({ kind: 'request', note: 'خروجة' }, state({ foodEntries: [water(start, 2500)] }))).toBe('not enough water points')
  })

  it('lets a gift be a surprise with an optional hint', () => {
    expect(validateSpend({ kind: 'gift' }, state({ foodEntries: rich })))
      .toEqual({ kind: 'gift', points: 75, note: null, date: null, status: 'pending' })
    expect(validateSpend({ kind: 'gift' }, state({ foodEntries: rich, waterSpends: [spend({ points: 10 })] }))).toBe('not enough water points')
  })

  it('only makes up finished days, up to their gap', () => {
    const s = state({ foodEntries: rich, days })
    // Today and yesterday can still be logged.
    expect(validateSpend({ kind: 'makeup', date: today }, s)).toMatch(/can still be logged/)
    expect(validateSpend({ kind: 'makeup', date: addDays(today, -1) }, s)).toMatch(/can still be logged/)
    const full = days.map((item) => (item.date === start ? { ...item, score: computeDailyScore(item, 60) } : item))
    expect(validateSpend({ kind: 'makeup', date: start }, state({ foodEntries: rich, days: full }))).toBe('this day already has 100 points')
    // Day 2 scored 6 + 12 + 4 = 22 (no water or food logged that day), so it is 78 short; the balance is 75.
    expect(validateSpend({ kind: 'makeup', date: addDays(start, 1) }, s))
      .toEqual({ kind: 'makeup', points: 75, note: null, date: addDays(start, 1), status: 'done' })
    expect(validateSpend({ kind: 'makeup', date: addDays(start, 1), points: 79 }, s)).toBe('points must be between 1 and 78')
    expect(validateSpend({ kind: 'makeup', date: addDays(start, 1), points: 20 }, s)).toMatchObject({ points: 20 })
  })

  it('makes up only what the balance covers', () => {
    const s = state({ foodEntries: [water(start, 2000)], days })
    expect(validateSpend({ kind: 'makeup', date: addDays(start, 2) }, s)).toMatchObject({ points: 13 })
    expect(validateSpend({ kind: 'makeup', date: addDays(start, 2), points: 14 }, s)).toBe('not enough water points')
    expect(validateSpend({ kind: 'makeup', date: addDays(start, 2) }, state({ days }))).toBe('not enough water points')
  })

  it('lists finished days that are short of 100, newest first', () => {
    const madeUp = days.map((item) => item.date === addDays(start, 2) ? { ...item, score: computeDailyScore(item, 100) } : item)
    expect(makeupCandidates(state({ days: madeUp })).map(({ day: item, gap }) => [item.dayNumber, gap])).toEqual([[2, 78], [1, 60]])
    expect(makeupCandidates(state({ days })).map(({ day: item }) => item.dayNumber)).toEqual([3, 2, 1])
  })
})
