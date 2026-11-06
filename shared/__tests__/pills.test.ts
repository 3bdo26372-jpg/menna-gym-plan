import { describe, expect, it } from 'vitest'
import { pillsDue, pillsOn, takesOn, validatePill, validatePillDose, type Pill } from '../pills'

const today = '2026-11-06'
const pill = (id: number, time: string, extra: Partial<Pill> = {}): Pill => ({ id, name: `برشامة ${id}`, time, addedOn: '2026-11-01', removedOn: null, ...extra })

describe('pills', () => {
  it('takes a name and a time inside the day', () => {
    expect(validatePill({ name: '  فيتامين   د ', time: '20:00' })).toEqual({ name: 'فيتامين د', time: '20:00' })
    expect(typeof validatePill({ name: '', time: '20:00' })).toBe('string')
    expect(typeof validatePill({ name: 'x'.repeat(41), time: '20:00' })).toBe('string')
    expect(typeof validatePill({ name: 'حديد', time: '02:00' })).toBe('string')
    expect(typeof validatePill({ name: 'حديد', time: '8pm' })).toBe('string')
  })

  it('knows which pills she takes on a day: from the day she added it, until the day she removed it', () => {
    const stopped = pill(2, '09:00', { removedOn: today })
    expect(takesOn(pill(1, '20:00'), today)).toBe(true)
    expect(takesOn(pill(1, '20:00'), '2026-10-31')).toBe(false)
    expect(takesOn(stopped, '2026-11-05')).toBe(true)
    expect(takesOn(stopped, today)).toBe(false)
    expect(pillsOn([pill(3, '22:00'), pill(1, '13:00'), stopped], today).map((item) => item.id)).toEqual([1, 3])
  })

  it('only ticks a pill she takes that day', () => {
    const list = [pill(1, '20:00'), pill(2, '09:00', { removedOn: today })]
    expect(validatePillDose({ pillId: 1, taken: true }, list, today)).toEqual({ pillId: 1, taken: true })
    expect(typeof validatePillDose({ pillId: 2, taken: true }, list, today)).toBe('string')
    expect(validatePillDose({ pillId: 2, taken: true }, list, '2026-11-05')).toEqual({ pillId: 2, taken: true })
    expect(typeof validatePillDose({ pillId: 9, taken: true }, list, today)).toBe('string')
  })

  it('lists the pills whose time has come and that she has not taken', () => {
    const list = [pill(1, '16:00'), pill(2, '22:00')]
    expect(pillsDue(list, [], today, '15:00')).toEqual([])
    expect(pillsDue(list, [], today, '22:30').map((item) => item.id)).toEqual([1, 2])
    expect(pillsDue(list, [{ date: today, pillId: 1, takenAt: '' }], today, '22:30').map((item) => item.id)).toEqual([2])
    expect(pillsDue(undefined, [], today, '22:30')).toEqual([])
  })
})
