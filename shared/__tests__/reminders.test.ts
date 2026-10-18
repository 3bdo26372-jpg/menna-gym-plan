import { describe, expect, it } from 'vitest'
import { dueReminders } from '../reminders'
import type { AppState, DayRecord } from '../types'
import type { FoodEntry } from '../food'

const today = '2026-10-20'
const score = { checkin: 0, workout: 0, warmupCooldown: 0, feedback: 0, water: 0, calories: 0, makeup: 0, pass: 0, rest: 0, total: 0 }
const day = (parts: Partial<DayRecord> = {}): DayRecord => ({ date: today, dayNumber: 22, checkin: null, workout: null, feedback: null, excused: false, periodPain: null, sleep: null, score, ...parts })
const water = (ml: number): FoodEntry => ({ id: 1, date: today, time: '12:00', category: 'drink', item: 'مية', quantity: null, ml, createdAt: '' })

function state(parts: Partial<DayRecord> = {}, extra: Partial<AppState> = {}): AppState {
  return {
    today, profile: { name: 'Menna', programStartDate: '2026-09-29', timezone: 'Africa/Cairo' }, baseline: [], measurements: [], days: [day(parts)],
    rewards: [], reports: [], foodEntries: [], waterSpends: [], dayPasses: [], passGifts: [], periods: [], ...extra,
  }
}
const keys = (list: { key: string }[]) => list.map((item) => item.key)
const none = new Set<string>()

describe('push reminders', () => {
  it('asks for last night\'s sleep from 12:30 until it is logged', () => {
    expect(keys(dueReminders(state(), '12:29', none, ''))).toEqual([])
    expect(keys(dueReminders(state(), '12:30', none, ''))).toEqual(['sleep'])
    expect(keys(dueReminders(state({ sleep: { sleptAt: '01:00', wokeAt: '09:00' } }), '13:00', none, ''))).toEqual([])
    expect(keys(dueReminders(state(), '16:00', none, ''))).toEqual([])
  })

  it('sends each reminder once a day', () => {
    expect(dueReminders(state(), '13:00', new Set(['sleep']), '')).toEqual([])
  })

  it('reminds about water in the evening only while under a litre', () => {
    expect(dueReminders(state({}, { foodEntries: [water(500)] }), '18:00', none, '')[0]).toMatchObject({ key: 'water', url: '/#/food/water' })
    expect(dueReminders(state({}, { foodEntries: [water(500)] }), '18:00', none, '')[0].body).toContain('0.5')
    expect(keys(dueReminders(state({}, { foodEntries: [water(1000)] }), '18:00', none, ''))).toEqual([])
  })

  it('reminds about the workout at night, but not on period or pain-rest days', () => {
    expect(keys(dueReminders(state({}, { foodEntries: [water(2000)] }), '21:00', none, ''))).toEqual(['workout'])
    expect(keys(dueReminders(state({ periodPain: 6 }, { foodEntries: [water(2000)] }), '21:00', none, ''))).toEqual([])
    const periods = [{ id: 1, startDate: '2026-10-19', endDate: null, createdAt: '' }]
    expect(keys(dueReminders(state({}, { foodEntries: [water(2000)], periods }), '21:00', none, ''))).toEqual([])
    expect(keys(dueReminders(state({ excused: true }, { foodEntries: [water(2000)] }), '21:00', none, ''))).toEqual([])
  })

  it('announces a gift pass added after she turned notifications on, once', () => {
    const passGifts = [{ id: 1, note: 'قديمة', createdAt: '2026-10-01T10:00:00Z' }, { id: 2, note: 'جديدة 🍫', createdAt: '2026-10-20T10:00:00Z' }]
    const due = dueReminders(state({ sleep: { sleptAt: '01:00', wokeAt: '09:00' } }, { passGifts }), '10:00', none, '2026-10-19T00:00:00Z')
    expect(due).toEqual([{ key: 'gift-2', title: 'جالك إكسبشن هدية 🍫', body: 'جديدة 🍫', url: '/#/today' }])
    expect(dueReminders(state({}, { passGifts }), '10:00', new Set(['gift-2']), '2026-10-19T00:00:00Z')).toEqual([])
  })

  it('fills in a nickname', () => {
    const [sleep] = dueReminders(state(), '13:00', none, '')
    expect(sleep.title).not.toContain('{nick}')
  })
})
