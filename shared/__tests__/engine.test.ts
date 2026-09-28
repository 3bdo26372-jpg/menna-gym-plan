import { describe, expect, it } from 'vitest'
import { checkWritableDate, measurementComparison, newRewardUnlocks, validateCheckin, validateFeedback, validateWorkout } from '../engine'
import { validateMeasurementValues } from '../measurements'
import { buildReport } from '../report'
import { hideIfLocked } from '../rewards'
import { addDays } from '../date'
import type { AppState } from '../types'
import { checkin, day, feedback, workout } from './fixtures'

describe('validation', () => {
  it('only accepts known check-in values', () => {
    expect(validateCheckin({ energy: 'high', mood: 'good', body: 'fresh' })).toMatchObject({ energy: 'high' })
    expect(typeof validateCheckin({ energy: 'max', mood: 'good', body: 'fresh' })).toBe('string')
  })

  it('validates feedback', () => {
    expect(validateFeedback({ difficulty: 7, energyAfter: 'normal', sweating: 'high', overall: 'hard', pain: false, favoriteExerciseId: 'high-knees', hardestExerciseId: 'nope' }))
      .toMatchObject({ difficulty: 7, favoriteExerciseId: 'high-knees', hardestExerciseId: undefined })
    expect(typeof validateFeedback({ difficulty: 11, energyAfter: 'normal', sweating: 'high', overall: 'hard', pain: false })).toBe('string')
  })

  it('derives completion from the exercise log instead of trusting the client', () => {
    const result = validateWorkout({
      dayType: 'cardio-burn', intensity: 'normal', level: 0, mainCompletion: 1, warmupDone: true,
      exercises: [
        { blockId: 'warmup', slot: 0, plannedExerciseId: 'knee-circles', exerciseId: 'knee-circles', plannedSeconds: 30, completedSeconds: 30 },
        { blockId: 'cardio', slot: 0, plannedExerciseId: 'jumping-jacks', exerciseId: 'step-back-reach', plannedSeconds: 30, completedSeconds: 30, switched: true },
        { blockId: 'cardio', slot: 1, plannedExerciseId: 'high-knees', exerciseId: 'high-knees', plannedSeconds: 30, completedSeconds: 999 },
        { blockId: 'core', slot: 0, plannedExerciseId: 'lunge-twist', exerciseId: 'lunge-twist', plannedSeconds: 40, completedSeconds: 0 },
        { blockId: 'cooldown', slot: 0, plannedExerciseId: 'side-stretch', exerciseId: 'side-stretch', plannedSeconds: 40, completedSeconds: 10 },
      ],
    })
    if (typeof result === 'string') throw new Error(result)
    expect(result.mainCompletion).toBe(0.6)
    expect(result.warmupDone).toBe(true)
    expect(result.cooldownDone).toBe(false)
    expect(result.status).toBe('partial')
    expect(result.activeSeconds).toBe(100)
  })

  it('rejects unknown exercises', () => {
    expect(validateWorkout({ dayType: 'cardio-burn', intensity: 'normal', exercises: [{ blockId: 'cardio', exerciseId: 'burpees', plannedExerciseId: 'burpees' }] }))
      .toContain('unknown exercise')
  })

  it('allows writing today and yesterday only', () => {
    expect(checkWritableDate('2026-10-05', '2026-10-05', '2026-09-28')).toBeNull()
    expect(checkWritableDate('2026-10-04', '2026-10-05', '2026-09-28')).toBeNull()
    expect(checkWritableDate('2026-10-03', '2026-10-05', '2026-09-28')).not.toBeNull()
    expect(checkWritableDate('2026-10-06', '2026-10-05', '2026-09-28')).not.toBeNull()
    expect(checkWritableDate('2026-10-05', '2026-10-05', null)).not.toBeNull()
  })

  it('validates measurement ranges', () => {
    expect(validateMeasurementValues({ weight: '78.4', waist: 84 })).toEqual({ weight: 78.4, waist: 84 })
    expect(typeof validateMeasurementValues({ weight: 5 })).toBe('string')
    expect(typeof validateMeasurementValues({})).toBe('string')
  })
})

describe('rewards and reports', () => {
  const start = '2026-09-28'
  const days = Array.from({ length: 12 }, (_, index) => {
    const date = addDays(start, index)
    const skipped = index === 2 || index === 6
    return day(date, index + 1, skipped ? {} : { checkin, workout: workout({ mainCompletion: index === 8 ? 0.4 : 1 }), feedback: feedback({ favoriteExerciseId: 'boxing-hooks', hardestExerciseId: 'skater-hops' }) })
  })
  const state: AppState = {
    today: addDays(start, 11),
    profile: { name: 'Menna', programStartDate: start, timezone: 'Africa/Cairo' },
    baseline: [{ key: 'weight', value: 79.1, unit: 'kg' }, { key: 'waist', value: 85, unit: 'cm' }],
    measurements: [
      { id: 1, measuredOn: addDays(start, 6), values: { weight: 78.5, waist: 84 }, note: null, createdAt: '' },
      { id: 2, measuredOn: addDays(start, 11), values: { weight: 78.0, waist: 83 }, note: null, createdAt: '' },
    ],
    days,
    rewards: [
      { id: 'day-5', thresholdDays: 5, title: 'A', description: '', emoji: '🎁', sortOrder: 1, hint: null, unlockedOn: null, celebratedAt: null },
      { id: 'day-10', thresholdDays: 10, title: 'B', description: '', emoji: '🎁', sortOrder: 2, hint: null, unlockedOn: null, celebratedAt: null },
      { id: 'day-30', thresholdDays: 30, title: 'C', description: '', emoji: '🏆', sortOrder: 3, hint: null, unlockedOn: null, celebratedAt: null },
    ],
    reports: [],
    foodEntries: [
      { id: 1, date: addDays(start, 1), time: '08:30', category: 'breakfast', item: 'بيض وشوفان', quantity: 'طبق', ml: null, createdAt: '' },
      { id: 2, date: addDays(start, 1), time: '10:00', category: 'drink', item: 'مية', quantity: null, ml: 500, createdAt: '' },
      { id: 3, date: addDays(start, 1), time: '07:30', category: 'drink', item: 'مياه', quantity: null, ml: 250, createdAt: '' },
      { id: 4, date: addDays(start, 3), time: '14:00', category: 'lunch', item: 'فراخ ورز', quantity: null, ml: null, createdAt: '' },
      { id: 5, date: addDays(start, 3), time: '16:00', category: 'drink', item: 'قهوة', quantity: 'كوباية', ml: 200, createdAt: '' },
    ],
  }

  it('unlocks rewards on the day the active-day threshold is reached', () => {
    // Active days skip index 2, 6 (no workout) and 8 (under half done).
    expect(newRewardUnlocks(days, state.rewards)).toEqual([{ id: 'day-5', unlockedOn: addDays(start, 5) }])
  })

  it('keeps locked rewards a surprise until they unlock', () => {
    const secret = { id: 'day-5', thresholdDays: 5, sortOrder: 1, emoji: '💐', title: 'Spa day', description: 'A day at the spa', hint: 'Relaxing', celebratedAt: null }
    const locked = hideIfLocked({ ...secret, unlockedOn: null })
    expect(JSON.stringify(locked)).not.toMatch(/Spa|💐/)
    expect(locked).toMatchObject({ id: 'day-5', thresholdDays: 5, emoji: '🎁', hint: 'Relaxing' })
    expect(hideIfLocked({ ...secret, unlockedOn: '2026-10-03' })).toMatchObject({ title: 'Spa day', emoji: '💐' })
  })

  it('compares measurements with baseline and previous', () => {
    expect(measurementComparison(state, 'weight')).toMatchObject({ baseline: 79.1, previous: 78.5, current: 78, changeFromBaseline: -1.1, changeFromPrevious: -0.5 })
  })

  it('builds a supportive monthly report', () => {
    const report = buildReport(state, 'month', 1)
    expect(report.days).toHaveLength(30)
    expect(report.activeDays).toBe(9)
    expect(report.workoutCount).toBe(10)
    expect(report.measurements.find((item) => item.key === 'weight')).toMatchObject({ start: 79.1, end: 78, change: -1.1 })
    expect(report.favoriteExercises[0]).toMatchObject({ id: 'boxing-hooks' })
    expect(report.hardExercises[0]).toMatchObject({ id: 'skater-hops' })
    const text = [...report.summary, ...report.suggestions].join(' ')
    expect(text).not.toMatch(/فشل|كسل|خسرتي/)
    expect(report.inProgress).toBe(true)
    expect(report.food).toMatchObject({ loggedDays: 2, entries: 5, averageWaterMl: 750 })
    expect(report.food.days[0].entries.map((entry) => entry.time)).toEqual(['07:30', '08:30', '10:00'])
  })

  it('builds a 7-day weekly report', () => {
    const week2 = buildReport(state, 'week', 2)
    expect(week2.days).toHaveLength(7)
    expect(week2.startDate).toBe(addDays(start, 7))
    expect(week2.food.loggedDays).toBe(0)
    expect(buildReport(state, 'week', 1).food.loggedDays).toBe(2)
  })
})

describe('food log', () => {
  it('validates entries and totals only water', async () => {
    const { validateFood, waterMl, checkFoodDate } = await import('../food')
    const { diffDays } = await import('../date')
    expect(validateFood({ category: 'drink', item: ' مية ', time: '09:15', ml: '250' })).toEqual({ category: 'drink', item: 'مية', time: '09:15', quantity: null, ml: 250 })
    expect(typeof validateFood({ category: 'drink', item: '', time: '09:15' })).toBe('string')
    expect(typeof validateFood({ category: 'brunch', item: 'x', time: '09:15' })).toBe('string')
    expect(typeof validateFood({ category: 'snack', item: 'x', time: '25:00' })).toBe('string')
    expect(waterMl([{ category: 'drink', item: 'مية', ml: 300 }, { category: 'drink', item: 'شاي', ml: 200 }, { category: 'snack', item: 'مية', ml: 100 }])).toBe(300)
    expect(checkFoodDate('2026-09-22', '2026-09-28', '2026-09-01', diffDays)).toBeNull()
    expect(checkFoodDate('2026-09-21', '2026-09-28', '2026-09-01', diffDays)).not.toBeNull()
  })
})
