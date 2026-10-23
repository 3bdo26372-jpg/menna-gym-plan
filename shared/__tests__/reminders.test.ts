import { describe, expect, it } from 'vitest'
import { dueReminders, sayTime, waterPlan } from '../reminders'
import type { AppState, DayRecord } from '../types'
import type { FoodEntry } from '../food'

const today = '2026-10-20'
const score = { checkin: 0, workout: 0, warmupCooldown: 0, feedback: 0, water: 0, calories: 0, makeup: 0, pass: 0, rest: 0, total: 0 }
const day = (parts: Partial<DayRecord> = {}): DayRecord => ({ date: today, dayNumber: 22, checkin: null, workout: null, feedback: null, excused: false, periodPain: null, sleep: null, score, ...parts })
const waterEntry = (ml: number): FoodEntry => ({ id: 1, date: today, time: '12:00', category: 'drink', item: 'مية', quantity: null, ml, createdAt: '' })

function state(parts: Partial<DayRecord> = {}, extra: Partial<AppState> = {}): AppState {
  return {
    today, profile: { name: 'Menna', programStartDate: '2026-09-29', timezone: 'Africa/Cairo' }, baseline: [], measurements: [], days: [day(parts)],
    rewards: [], reports: [], foodEntries: [], waterSpends: [], dayPasses: [], passGifts: [], periods: [], ...extra,
  }
}
const keys = (list: { key: string }[]) => list.map((item) => item.key)
/** Keys without the half-hourly water reminders, for tests about the others. */
const others = (list: { key: string }[]) => keys(list).filter((key) => !key.startsWith('water-'))
const none = new Set<string>()

describe('push reminders', () => {
  it('asks for last night\'s sleep from 12:30 until it is logged', () => {
    expect(others(dueReminders(state(), '12:29', none, ''))).toEqual([])
    expect(others(dueReminders(state(), '12:30', none, ''))).toEqual(['sleep'])
    expect(others(dueReminders(state({ sleep: { sleptAt: '01:00', wokeAt: '09:00' } }), '13:00', none, ''))).toEqual([])
    expect(others(dueReminders(state(), '16:00', none, ''))).toEqual([])
  })

  it('sends each reminder once a day', () => {
    expect(others(dueReminders(state(), '13:00', new Set(['sleep']), ''))).toEqual([])
  })

  it('spreads ten glasses from when she woke up to 23:30', () => {
    expect(waterPlan('11:30')).toHaveLength(10)
    expect(waterPlan('11:30')[0]).toBe(11 * 60 + 30)
    expect(waterPlan('11:30')[1]).toBe(11 * 60 + 30 + 72)
    expect(waterPlan(null)[0]).toBe(12 * 60)
    expect(sayTime(16 * 60 + 30)).toBe('4:30 العصر')
    expect(sayTime(21 * 60)).toBe('9 بالليل')
  })

  it('sends each glass once when it is due, says how many are left and when the next one is', () => {
    const woke = { sleep: { sleptAt: '02:00', wokeAt: '11:30' } }
    const water = (time: string, entries: FoodEntry[] = []) => dueReminders(state(woke, { foodEntries: entries }), time, none, '').filter((item) => item.key.startsWith('water-'))
    expect(water('11:29')).toEqual([])
    const [first] = water('11:30')
    expect(first.key).toBe('water-glass-1')
    expect(first.body).toContain('أول كوباية')
    expect(first.body).toContain('12:42 الضهر')
    expect(water('12:00', [{ ...waterEntry(250), time: '11:40' }])).toEqual([])
    const [second] = water('12:45', [{ ...waterEntry(250), time: '11:40' }])
    expect(second).toMatchObject({ key: 'water-glass-2' })
    expect(second.body).toContain('شربتي كوباية واحدة وفاضل 9 كوبايات')
    expect(water('20:00', [waterEntry(2500)])).toEqual([])
  })

  it('waits for noon when she has not logged when she woke up', () => {
    expect(dueReminders(state(), '11:45', none, '').some((item) => item.key.startsWith('water-'))).toBe(false)
    expect(dueReminders(state(), '12:00', none, '').some((item) => item.key === 'water-glass-1')).toBe(true)
  })

  it('asks if she still likes his program when nothing is logged by the evening', () => {
    const missed = dueReminders(state(), '18:00', none, '').find((item) => item.key === 'missed')
    expect(missed?.title).toMatch(/برنامج بابا/)
    expect(others(dueReminders(state(), '17:59', none, ''))).not.toContain('missed')
    expect(others(dueReminders(state({}, { foodEntries: [waterEntry(250)] }), '19:00', none, ''))).not.toContain('missed')
    expect(others(dueReminders(state({ sleep: { sleptAt: '01:00', wokeAt: '09:00' } }), '19:00', none, ''))).not.toContain('missed')
  })

  it('reminds about the workout at night, but not on period or pain-rest days', () => {
    expect(others(dueReminders(state({}, { foodEntries: [waterEntry(2500)] }), '21:00', none, ''))).toEqual(['workout'])
    expect(others(dueReminders(state({ periodPain: 6 }, { foodEntries: [waterEntry(2500)] }), '21:00', none, ''))).toEqual([])
    const periods = [{ id: 1, startDate: '2026-10-19', endDate: null, createdAt: '' }]
    expect(others(dueReminders(state({}, { foodEntries: [waterEntry(2500)], periods }), '21:00', none, ''))).toEqual([])
    expect(others(dueReminders(state({ excused: true }, { foodEntries: [waterEntry(2500)] }), '21:00', none, ''))).toEqual([])
  })

  it('announces a gift pass added after she turned notifications on, once', () => {
    const passGifts = [{ id: 1, note: 'قديمة', createdAt: '2026-10-01T10:00:00Z' }, { id: 2, note: 'جديدة 🍫', createdAt: '2026-10-20T10:00:00Z' }]
    const due = dueReminders(state({ sleep: { sleptAt: '01:00', wokeAt: '09:00' } }, { passGifts }), '10:00', none, '2026-10-19T00:00:00Z').filter((item) => !item.key.startsWith('water-'))
    expect(due).toEqual([{ key: 'gift-2', title: 'جالك إكسبشن هدية 🍫', body: 'جديدة 🍫', url: '/#/today' }])
    expect(dueReminders(state({}, { passGifts }), '10:00', new Set(['gift-2']), '2026-10-19T00:00:00Z')).toEqual([])
  })

  it('fills in a nickname', () => {
    const [sleep] = dueReminders(state(), '13:00', none, '')
    expect(sleep.title).not.toContain('{nick}')
  })
})
