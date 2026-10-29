import { describe, expect, it } from 'vitest'
import { CalculationMethod, Coordinates, PrayerTimes } from 'adhan'
import { addDays } from '../date'
import {
  BIG_GIFT_WEEKS,
  cairoInstant,
  DEFAULT_PRAYER_SHOP,
  prayerBalance,
  prayerStreak,
  unopenedBigGifts,
  validatePrayerBuy,
  cairoOffsetMinutes,
  PRAYER_PLACE,
  prayerPoints,
  prayerTimes,
  prayerWeeks,
  unopenedPrayerGifts,
  validatePrayerGift,
  validatePrayerMark,
  type PrayerLog,
} from '../prayer'
import { ADHKAR, DHIKR_QUOTES, PRAYER_QUOTES, quoteLine, quoteOfDay } from '../prayerTexts'
import { dueReminders } from '../reminders'
import type { AppState, DayRecord } from '../types'

const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
const at = (date: string, minutes: number) => new Date(cairoInstant(date, minutes)).toISOString()

describe('prayer times', () => {
  it('matches the adhan library (Egyptian method) to the minute, every day for two years', () => {
    const coordinates = new Coordinates(PRAYER_PLACE.latitude, PRAYER_PLACE.longitude)
    const params = CalculationMethod.Egyptian()
    for (let date = '2026-01-01'; date < '2028-01-01'; date = addDays(date, 1)) {
      const [year, month, day] = date.split('-').map(Number)
      const reference = new PrayerTimes(coordinates, new Date(year, month - 1, day), params)
      const mine = prayerTimes(date)
      const expected = [reference.fajr, reference.dhuhr, reference.asr, reference.maghrib, reference.isha]
      mine.prayers.forEach((minutes, index) => {
        expect(Math.abs(cairoInstant(date, minutes) - expected[index].getTime())).toBeLessThanOrEqual(60_000)
      })
    }
  })

  it('follows Cairo summer time', () => {
    expect(cairoOffsetMinutes('2026-10-29')).toBe(180)
    expect(cairoOffsetMinutes('2026-10-30')).toBe(120)
    expect(prayerTimes('2026-10-30').prayers.map(clock)).toEqual(['04:40', '11:40', '14:46', '17:10', '18:28'])
  })
})

describe('prayer points', () => {
  it('gives 10 within an hour, then a point less every quarter hour, never below 2; Fajr always 10', () => {
    expect(prayerPoints(1, 0)).toBe(10)
    expect(prayerPoints(1, 60)).toBe(10)
    expect(prayerPoints(1, 61)).toBe(9)
    expect(prayerPoints(1, 75)).toBe(9)
    expect(prayerPoints(1, 76)).toBe(8)
    expect(prayerPoints(1, 600)).toBe(2)
    expect(prayerPoints(0, 600)).toBe(10)
  })

  it('takes a tick from its time until the next Fajr, and no earlier time than the prayer', () => {
    const date = '2026-10-30'
    const [fajr, dhuhr] = prayerTimes(date).prayers
    const now = cairoInstant(date, dhuhr + 30)
    expect(validatePrayerMark({ prayer: 1, prayed: true }, date, now)).toEqual({ prayer: 1, prayed: true, prayedAt: new Date(now).toISOString() })
    expect(typeof validatePrayerMark({ prayer: 2, prayed: true }, date, now)).toBe('string')
    expect(typeof validatePrayerMark({ prayer: 1, prayed: true, at: at(date, dhuhr - 5) }, date, now)).toBe('string')
    expect(validatePrayerMark({ prayer: 1, prayed: true, at: at(date, dhuhr + 10) }, date, now)).toMatchObject({ prayedAt: at(date, dhuhr + 10) })
    expect(typeof validatePrayerMark({ prayer: 5, prayed: true }, date, now)).toBe('string')
    // Yesterday's Isha after midnight still counts; after this morning's Fajr it doesn't.
    const next = addDays(date, 1)
    expect(typeof validatePrayerMark({ prayer: 4, prayed: true }, date, cairoInstant(next, 30))).toBe('object')
    expect(typeof validatePrayerMark({ prayer: 4, prayed: true }, date, cairoInstant(next, prayerTimes(next).prayers[0] + 1))).toBe('string')
    expect(fajr).toBeLessThan(dhuhr)
  })
})

const fullDay = (date: string, late = 0): PrayerLog[] => prayerTimes(date).prayers.map((minutes, prayer) => ({ date, prayer, prayedAt: at(date, minutes + late) }))

describe('prayer weeks', () => {
  const start = '2026-10-30'
  const days = (count: number, late = 0) => Array.from({ length: count }, (_, index) => fullDay(addDays(start, index), late)).flat()

  it('counts weeks of 7 days from her first prayer and earns a gift at 300 of 350', () => {
    const [week] = prayerWeeks({ today: addDays(start, 7), prayers: days(6) })
    expect(week).toMatchObject({ start, end: addDays(start, 6), earned: 300, possible: 350, goal: 300, finished: true, reached: true })
    const [short] = prayerWeeks({ today: addDays(start, 7), prayers: days(6).slice(1) })
    expect(short.reached).toBe(false)
  })

  it('leaves period days out of what the week needs', () => {
    const periods = [{ id: 1, startDate: addDays(start, 2), endDate: addDays(start, 6), createdAt: '' }]
    const [week] = prayerWeeks({ today: addDays(start, 7), prayers: days(2), periods })
    expect(week).toMatchObject({ possible: 100, goal: 86, earned: 100, reached: true })
  })

  it('offers the gift once the week is over, until she opens it', () => {
    const state = { today: addDays(start, 7), prayers: days(7) }
    expect(unopenedPrayerGifts(state).map((week) => week.start)).toEqual([start])
    expect(unopenedPrayerGifts({ ...state, today: addDays(start, 6) })).toEqual([])
    expect(validatePrayerGift({ note: '  ورد  ' }, start, state)).toEqual({ note: 'ورد' })
    const opened = { ...state, prayerGifts: [{ weekStart: start, note: null, status: 'pending' as const, createdAt: '', doneAt: null }] }
    expect(unopenedPrayerGifts(opened)).toEqual([])
    expect(typeof validatePrayerGift({}, start, opened)).toBe('string')
  })
})

describe('the big gift and the shop', () => {
  const start = '2026-09-01'
  const week = (index: number, kept: boolean) => Array.from({ length: 7 }, (_, day) => fullDay(addDays(start, index * 7 + day))).flat().slice(kept ? 0 : 10)

  it('comes after every 4 kept weeks in a row, and a missed week starts the count again', () => {
    const run = (kept: boolean[]) => prayerStreak({ today: addDays(start, kept.length * 7), prayers: kept.flatMap((keep, index) => week(index, keep)) })
    expect(run([true, true, true, true]).milestones.map((item) => item.start)).toEqual([addDays(start, 21)])
    expect(run([true, true, false, true, true, true]).milestones).toEqual([])
    expect(run([true, true, false, true, true, true]).run).toBe(3)
    expect(run([true, true, true, true, true, true, true, true]).milestones).toHaveLength(2)
    // Weeks with no prayers at all break the run too.
    expect(prayerStreak({ today: addDays(start, 9 * 7), prayers: [0, 1, 2].flatMap((index) => week(index, true)) }).run).toBe(0)
    expect(BIG_GIFT_WEEKS).toBe(4)
  })

  it('skips a week that was all period days', () => {
    const today = addDays(start, 6 * 7)
    const prayers = [0, 1, 3, 4].flatMap((index) => week(index, true))
    const periods = [{ id: 1, startDate: addDays(start, 14), endDate: addDays(start, 20), createdAt: '' }]
    expect(prayerStreak({ today, prayers, periods }).milestones.map((item) => item.start)).toEqual([addDays(start, 28)])
    const state = { today, prayers, periods, prayerBigGifts: [] }
    expect(unopenedBigGifts(state)).toHaveLength(1)
    expect(validatePrayerGift({}, addDays(start, 28), state, 'big')).toEqual({ note: null })
  })

  it('spends prayer points in the shop, and a cancelled buy gives them back', () => {
    const state = { today: addDays(start, 7), prayers: week(0, true), prayerShop: DEFAULT_PRAYER_SHOP, prayerBuys: [] }
    expect(prayerBalance(state).balance).toBe(350)
    expect(validatePrayerBuy({}, 'treat', state)).toEqual({ itemId: 'treat', title: 'حاجة حلوة تختاريها', points: 150, note: null })
    expect(typeof validatePrayerBuy({}, 'request', state)).toBe('string')
    expect(validatePrayerBuy({ note: 'كتاب' }, 'request', state)).toMatchObject({ points: 300, note: 'كتاب' })
    expect(typeof validatePrayerBuy({}, 'mat', state)).toBe('string')
    expect(typeof validatePrayerBuy({}, 'nothing', state)).toBe('string')
    const buy = { id: 1, itemId: 'request', title: '', points: 300, note: 'كتاب', status: 'pending' as const, createdAt: '', doneAt: null }
    expect(prayerBalance({ ...state, prayerBuys: [buy] }).balance).toBe(50)
    expect(prayerBalance({ ...state, prayerBuys: [{ ...buy, status: 'cancelled' as const }] }).balance).toBe(350)
  })
})

describe('prayer reminders', () => {
  const today = '2026-10-30'
  const score = { checkin: 0, workout: 0, warmupCooldown: 0, feedback: 0, water: 0, calories: 0, makeup: 0, pass: 0, rest: 0, total: 0 }
  const day: DayRecord = { date: today, dayNumber: 32, checkin: null, workout: null, feedback: null, excused: false, periodPain: null, sleep: null, score }
  const state = (extra: Partial<AppState> = {}): AppState => ({
    today, profile: { name: 'Menna', programStartDate: '2026-09-29', timezone: 'Africa/Cairo' }, baseline: [], measurements: [], days: [day],
    rewards: [], reports: [], foodEntries: [], waterSpends: [], dayPasses: [], passGifts: [], periods: [], prayers: [], prayerGifts: [], ...extra,
  })
  const none = new Set<string>()
  const prayerKeys = (list: { key: string }[]) => list.map((item) => item.key).filter((key) => key.startsWith('prayer') || key.startsWith('adhkar') || key === 'dhikr')
  const [fajr, dhuhr, asr, maghrib] = prayerTimes(today).prayers

  it('sends each prayer from 10 minutes before, with a verse or hadith', () => {
    expect(prayerKeys(dueReminders(state(), clock(dhuhr - 11), none, ''))).not.toContain('prayer-1')
    const before = dueReminders(state(), clock(dhuhr - 5), none, '').find((item) => item.key === 'prayer-1')!
    expect(before.title).toContain('الضهر كمان 5 دقايق')
    expect(before.url).toBe('/#/prayer')
    expect(before.body).toMatch(/﴿|«/)
    expect(dueReminders(state(), clock(dhuhr + 3), none, '').find((item) => item.key === 'prayer-1')!.title).toContain('أذّن الضهر')
    expect(prayerKeys(dueReminders(state(), clock(fajr), none, ''))).toEqual(['prayer-0'])
  })

  it('nudges 15 minutes before the points go down, except for Fajr, unless she prayed', () => {
    expect(prayerKeys(dueReminders(state(), clock(asr + 50), new Set(['prayer-2', 'adhkar-evening']), ''))).toEqual(['prayer-2-again'])
    expect(prayerKeys(dueReminders(state(), clock(fajr + 50), new Set(['prayer-0']), ''))).toEqual([])
    const prayed = state({ prayers: [{ date: today, prayer: 2, prayedAt: at(today, asr + 5) }] })
    expect(prayerKeys(dueReminders(prayed, clock(asr + 50), new Set(['prayer-2', 'adhkar-evening']), ''))).toEqual([])
    expect(prayerKeys(dueReminders(state(), clock(asr + 61), new Set(['prayer-2']), ''))).not.toContain('prayer-2-again')
  })

  it('stays quiet about prayers on period days, but still sends the adhkar', () => {
    const period = state({ periods: [{ id: 1, startDate: '2026-10-28', endDate: null, createdAt: '' }] })
    expect(prayerKeys(dueReminders(period, clock(asr + 40), none, ''))).toEqual(['adhkar-evening'])
  })

  it('sends the morning adhkar before Dhuhr, a dhikr after it, and the evening ones after Asr', () => {
    expect(prayerKeys(dueReminders(state(), clock(dhuhr - 100), none, ''))).toEqual(['adhkar-morning'])
    expect(prayerKeys(dueReminders(state(), clock(dhuhr + 130), none, ''))).toEqual(['dhikr'])
    expect(prayerKeys(dueReminders(state(), clock(asr + 35), new Set(['prayer-2']), ''))).toEqual(['adhkar-evening'])
    expect(prayerKeys(dueReminders(state(), clock(maghrib), none, ''))).toEqual(['prayer-3'])
  })

  it('announces a gift the day after the week, from noon', () => {
    const start = addDays(today, -7)
    const prayers = Array.from({ length: 7 }, (_, index) => fullDay(addDays(start, index))).flat()
    expect(dueReminders(state({ prayers }), '12:15', none, '').map((item) => item.key)).toContain(`prayer-gift-${start}`)
    expect(dueReminders(state({ prayers }), '11:00', none, '').map((item) => item.key)).not.toContain(`prayer-gift-${start}`)
  })
})

describe('prayer texts', () => {
  it('quotes a different text each day, in one line for notifications', () => {
    expect(quoteOfDay(PRAYER_QUOTES, '2026-10-30')).not.toEqual(quoteOfDay(PRAYER_QUOTES, '2026-10-31'))
    expect(quoteLine({ kind: 'quran', text: 'آية', source: 'البقرة: 1' })).toBe('﴿آية﴾ [البقرة: 1]')
    expect(DHIKR_QUOTES.every((quote) => quote.source.length > 0)).toBe(true)
  })

  it('gives every dhikr a count and a source', () => {
    for (const set of Object.values(ADHKAR)) {
      expect(set.items.length).toBeGreaterThan(3)
      expect(set.items.every((item) => item.count >= 1 && item.source.includes('حصن المسلم') || item.source.includes('مسلم'))).toBe(true)
      expect(new Set(set.items.map((item) => item.id)).size).toBe(set.items.length)
    }
  })
})
