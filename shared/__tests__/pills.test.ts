import { describe, expect, it } from 'vitest'
import { pillsDue, usualPillTime, validatePillDose, validatePillPlan } from '../pills'

const today = '2026-10-27'

describe('pills', () => {
  it('takes two times and an optional last day from today on', () => {
    expect(validatePillPlan({ times: ['16:00', '22:00'], until: null }, today)).toEqual({ times: ['16:00', '22:00'], until: null })
    expect(validatePillPlan({ times: ['16:00', '22:00'], until: '2026-11-20' }, today)).toEqual({ times: ['16:00', '22:00'], until: '2026-11-20' })
    expect(typeof validatePillPlan({ times: ['16:00'] }, today)).toBe('string')
    expect(typeof validatePillPlan({ times: ['16:00', '02:00'] }, today)).toBe('string')
    expect(typeof validatePillPlan({ times: ['16:00', '22:00'], until: '2026-10-26' }, today)).toBe('string')
    expect(validatePillDose({ slot: 1, taken: true })).toEqual({ slot: 1, taken: true })
    expect(typeof validatePillDose({ slot: 2, taken: true })).toBe('string')
  })

  it('lists the pills whose time has come and that she has not taken', () => {
    const plan = { times: ['16:00', '22:00'], until: null, updatedAt: '' }
    expect(pillsDue(plan, [], today, '15:00')).toEqual([])
    expect(pillsDue(plan, [], today, '22:30')).toEqual([0, 1])
    expect(pillsDue(plan, [{ date: today, slot: 0, takenAt: '' }], today, '22:30')).toEqual([1])
    expect(pillsDue(null, [], today, '22:30')).toEqual([])
  })

  it('suggests half an hour after her usual meal', () => {
    const meals = ['13:10', '15:30', '16:40'].map((time) => ({ category: 'breakfast' as const, time }))
    expect(usualPillTime(meals, 0)).toBe('16:00')
    expect(usualPillTime([], 1)).toBe('18:00')
  })
})
