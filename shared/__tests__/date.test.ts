import { describe, expect, it } from 'vitest'
import { addDays, cairoDate, dateRange, dayNumberFor, diffDays, isIsoDate, periodBounds, periodForDay } from '../date'

describe('Cairo dates', () => {
  it('uses the Cairo calendar day, not UTC', () => {
    // 22:30 UTC on Oct 5 is already Oct 6 in Cairo (UTC+2/+3).
    expect(cairoDate(new Date('2026-10-05T22:30:00Z'))).toBe('2026-10-06')
    expect(cairoDate(new Date('2026-10-05T20:59:00Z'))).toBe('2026-10-05')
  })

  it('does arithmetic on calendar dates', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(diffDays('2026-09-28', '2026-10-28')).toBe(30)
    expect(dayNumberFor('2026-09-28', '2026-09-28')).toBe(1)
    expect(dateRange('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'])
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026-02-28')).toBe(true)
  })

  it('splits the program into 30-day periods', () => {
    expect(periodForDay(1)).toBe(1)
    expect(periodForDay(30)).toBe(1)
    expect(periodForDay(31)).toBe(2)
    expect(periodBounds('2026-09-28', 2)).toEqual({ start: '2026-10-28', end: '2026-11-26' })
  })
})
