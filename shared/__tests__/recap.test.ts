import { describe, expect, it } from 'vitest'
import { addDays, dateRange } from '../date'
import type { FoodEntry } from '../food'
import { yesterdayRecap } from '../recap'
import type { AppState, DayRecord } from '../types'
import { checkin, day, feedback, workout } from './fixtures'

const START = '2026-09-29'
const WEEK6 = '2026-11-03'

let nextId = 1
const food = (date: string, category: FoodEntry['category'], item: string, ml: number | null = null): FoodEntry => ({
  id: nextId++, date, time: '12:00', category, item, quantity: null, ml, createdAt: '',
})
const goodDay = (date: string) => [
  food(date, 'breakfast', 'بيض وعيش'), food(date, 'lunch', 'فراخ ورز'), food(date, 'dinner', 'زبادي وفاكهة'), food(date, 'snack', 'تفاحة'),
  ...Array.from({ length: 8 }, () => food(date, 'drink', 'مية', 250)),
]

function state(today: string, days: DayRecord[], extra: Partial<AppState> = {}): AppState {
  const byDate = new Map(days.map((item) => [item.date, item]))
  return {
    today,
    profile: { name: 'Menna', programStartDate: START, timezone: 'Africa/Cairo' },
    baseline: [], measurements: [], rewards: [], reports: [], foodEntries: [], waterSpends: [], dayPasses: [], passGifts: [], periods: [],
    days: dateRange(START, today).map((date, index) => byDate.get(date) ?? day(date, index + 1)),
    restDays: [],
    ...extra,
  }
}

/** Words that tell her she fell short. The recap never uses them. */
const BLAME = /قصّرتي|قصرتي|مقصرة|فشلتي|للأسف|غلطتي|ليه ما/

describe("yesterday's recap", () => {
  it('cheers a full day and has nothing to add', () => {
    const yesterday = addDays(WEEK6, 1)
    const recap = yesterdayRecap(state(addDays(WEEK6, 2), [day(yesterday, 36, { checkin, workout: workout({ dayType: 'box-kick' }), feedback: feedback() })], {
      foodEntries: goodDay(yesterday), prayers: [0, 1, 2, 3, 4].map((prayer) => ({ date: yesterday, prayer, prayedAt: '' })),
    }))!
    expect(recap.perfect).toBe(true)
    expect(recap.next).toEqual([])
    expect(recap.done.join(' ')).toContain('ملاكمة')
    expect(recap.cheer).toMatch(/يوم/)
  })

  it('names what was left out as a small step for today, gently', () => {
    const yesterday = addDays(WEEK6, 1)
    const recap = yesterdayRecap(state(addDays(WEEK6, 2), [], {
      foodEntries: [food(yesterday, 'drink', 'مية', 250), food(yesterday, 'drink', 'مية', 250), food(yesterday, 'drink', 'مية', 1000)],
      prayers: [{ date: yesterday, prayer: 0, prayedAt: '' }],
    }))!
    expect(recap.perfect).toBe(false)
    expect(recap.next.length).toBeLessThanOrEqual(3)
    expect(recap.next.join(' ')).toContain('النهارده')
    expect(recap.next.some((line) => line.includes('1.5 لتر') && line.includes('كوبايتين'))).toBe(true)
    for (const line of [...recap.next, recap.cheer]) expect(line).not.toMatch(BLAME)
  })

  it("calls an unused weekday a rest day, not a missed workout", () => {
    const recap = yesterdayRecap(state(addDays(WEEK6, 2), [day(WEEK6, 36, { checkin, workout: workout(), feedback: feedback() })], { foodEntries: goodDay(addDays(WEEK6, 1)) }))!
    expect(recap.done).toContain('يوم راحة من حقك 🌙')
    expect(recap.next.join(' ')).not.toContain('التمرين')
  })

  it('keeps a missed workout light and points at the days still to come', () => {
    // No workout on days 1–3: two are the week's rest days, the third is a missed workout.
    const recap = yesterdayRecap(state(addDays(WEEK6, 3), []))!
    const line = recap.next.find((item) => item.includes('التمرين'))!
    expect(line).toContain('ولا يهمك')
    expect(line).toContain('4 أيام')
    expect(line).not.toMatch(BLAME)
    // On the first day of a new week, it talks about the new week.
    const fresh = yesterdayRecap(state(addDays(WEEK6, 7), []))!
    expect(fresh.next.find((item) => item.includes('التمرين'))).toContain('أسبوع جديد')
  })

  it('asks for the feedback of a workout she finished without rating it', () => {
    const yesterday = addDays(WEEK6, 1)
    const recap = yesterdayRecap(state(addDays(WEEK6, 2), [day(yesterday, 36, { checkin, workout: workout() })], { foodEntries: goodDay(yesterday) }))!
    expect(recap.next.join(' ')).toContain('تقييم')
  })

  it('names the pills she did not tick, and leaves out the ones she stopped', () => {
    const yesterday = addDays(WEEK6, 1)
    const pills = [
      { id: 1, name: 'برشامة بعد الفطار', time: '14:30', addedOn: '2026-10-27', removedOn: WEEK6 },
      { id: 3, name: 'برشامة بعد الغدا', time: '20:00', addedOn: WEEK6, removedOn: null },
    ]
    const recap = yesterdayRecap(state(addDays(WEEK6, 2), [], { pills, pillDoses: [] }))!
    const line = recap.next.find((item) => item.includes('💊'))
    expect(line).toContain('برشامة بعد الغدا')
    expect(line).not.toContain('الفطار')
    const taken = yesterdayRecap(state(addDays(WEEK6, 2), [], { pills, pillDoses: [{ date: yesterday, pillId: 3, takenAt: '' }] }))!
    expect(taken.done).toContain('برشامة بعد الغدا 💊')
  })
})
