import { describe, expect, it } from 'vitest'
import { pillDosesOn, pillsDue, pillsOn, pillTakenCount, pillTimes, takesOn, validatePill, validatePillDose, type Pill } from '../pills'

const today = '2026-11-06'
const pill = (id: number, time: string, extra: Partial<Pill> = {}): Pill => ({ id, name: `برشامة ${id}`, time, addedOn: '2026-11-01', removedOn: null, ...extra })

describe('pills', () => {
  it('takes a name and a time inside the day', () => {
    expect(validatePill({ name: '  فيتامين   د ', time: '20:00' })).toEqual({ name: 'فيتامين د', time: '20:00', everyHours: null })
    expect(typeof validatePill({ name: '', time: '20:00' })).toBe('string')
    expect(typeof validatePill({ name: 'x'.repeat(41), time: '20:00' })).toBe('string')
    expect(validatePill({ name: 'حديد', time: '02:00' })).toEqual({ name: 'حديد', time: '02:00', everyHours: null })
    expect(validatePill({ name: 'حديد', time: '00:00' })).toEqual({ name: 'حديد', time: '00:00', everyHours: null })
    expect(typeof validatePill({ name: 'حديد', time: '23:50' })).toBe('string')
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
    expect(validatePillDose({ pillId: 1, taken: true }, list, today)).toEqual({ pillId: 1, slot: 0, taken: true })
    expect(typeof validatePillDose({ pillId: 2, taken: true }, list, today)).toBe('string')
    expect(validatePillDose({ pillId: 2, taken: true }, list, '2026-11-05')).toEqual({ pillId: 2, slot: 0, taken: true })
    expect(typeof validatePillDose({ pillId: 9, taken: true }, list, today)).toBe('string')
  })

  it('lists the pills whose time has come and that she has not taken', () => {
    const list = [pill(1, '16:00'), pill(2, '22:00')]
    expect(pillsDue(list, [], today, '15:00')).toEqual([])
    expect(pillsDue(list, [], today, '22:30').map((item) => item.pill.id)).toEqual([1, 2])
    expect(pillsDue(list, [{ date: today, pillId: 1, takenAt: '' }], today, '22:30').map((item) => item.pill.id)).toEqual([2])
    expect(pillsDue(undefined, [], today, '22:30')).toEqual([])
  })

  it('repeats a pill every few hours round the clock, at the same times every day', () => {
    expect(pillTimes({ time: '02:00', everyHours: null })).toEqual(['02:00'])
    expect(pillTimes({ time: '02:00', everyHours: 8 })).toEqual(['02:00', '10:00', '18:00'])
    expect(pillTimes({ time: '20:30', everyHours: 12 })).toEqual(['20:30', '08:30'])
    expect(validatePill({ name: 'مضاد', time: '20:00', everyHours: 6 })).toEqual({ name: 'مضاد', time: '20:00', everyHours: 6 })
    expect(typeof validatePill({ name: 'مضاد', time: '20:00', everyHours: 5 })).toBe('string')
    // 11:50 at night would come before midnight with no reminder left that day.
    expect(typeof validatePill({ name: 'مضاد', time: '11:50', everyHours: 12 })).toBe('string')
  })

  it('ticks each dose of a repeating pill on its own', () => {
    const list = [pill(1, '20:00', { everyHours: 12 }), pill(2, '09:00')]
    expect(pillDosesOn(list, today).map((dose) => [dose.pill.id, dose.slot, dose.time])).toEqual([[1, 1, '08:00'], [2, 0, '09:00'], [1, 0, '20:00']])
    expect(validatePillDose({ pillId: 1, slot: 1, taken: true }, list, today)).toEqual({ pillId: 1, slot: 1, taken: true })
    expect(typeof validatePillDose({ pillId: 1, slot: 2, taken: true }, list, today)).toBe('string')
    expect(typeof validatePillDose({ pillId: 2, slot: 1, taken: true }, list, today)).toBe('string')
    const doses = [{ date: today, pillId: 1, slot: 1, takenAt: '' }]
    expect(pillsDue(list, doses, today, '21:00').map((dose) => [dose.pill.id, dose.slot])).toEqual([[2, 0], [1, 0]])
    expect(pillTakenCount(doses, today, list[0])).toBe(1)
  })
})
