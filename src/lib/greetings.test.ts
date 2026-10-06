import { describe, expect, it } from 'vitest'
import { greetingFor, greetingKind, type GreetingInput } from './greetings'

const base: GreetingInput = { dayNumber: 1, hour: 9, painRest: false, periodDay: false, trained: false, waterDone: false, score: 0 }
const kind = (overrides: Partial<GreetingInput>) => greetingKind({ ...base, ...overrides })

describe('home page greeting', () => {
  it('is gentle on a period-pain rest day, and never nudges then', () => {
    expect(kind({ painRest: true })).toBe('pain')
    expect(kind({ painRest: true, hour: 21 })).toBe('pain')
    expect(kind({ painRest: true, trained: true })).toBe('pain-trained')
    expect(kind({ painRest: true, score: 100 })).toBe('pain')
  })

  it('nudges from 7 pm when there is no workout yet', () => {
    expect(kind({ hour: 18 })).toBe('evening')
    expect(kind({ hour: 19 })).toBe('lazy')
    expect(kind({ hour: 19, waterDone: true })).toBe('lazy')
    expect(kind({ hour: 21, trained: true })).toBe('trained')
    expect(kind({ hour: 21, periodDay: true })).toBe('period')
  })

  it('praises the water target and the workout', () => {
    expect(kind({ waterDone: true })).toBe('water')
    expect(kind({ trained: true })).toBe('trained')
    expect(kind({ trained: true, waterDone: true })).toBe('all-done')
    expect(kind({ trained: true, waterDone: true, score: 100 })).toBe('perfect')
  })

  it('greets by the time of day otherwise', () => {
    expect([3, 9, 14, 17].map((hour) => kind({ hour }))).toEqual(['night', 'morning', 'afternoon', 'evening'])
  })

  it('rotates the lines day by day and fills in a nickname', () => {
    const lines = new Set([1, 2, 3, 4, 5].map((dayNumber) => greetingFor({ ...base, painRest: true, dayNumber }).line))
    expect(lines.size).toBe(5)
    expect(greetingFor({ ...base, painRest: true, dayNumber: 1 }).line).toContain('البطل بتاعنا النهارده صغنون')
    for (let dayNumber = 1; dayNumber < 8; dayNumber++) {
      const greeting = greetingFor({ ...base, waterDone: true, dayNumber })
      expect(greeting.title + greeting.line).not.toContain('{nick}')
    }
  })
})
