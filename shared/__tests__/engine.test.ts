import { describe, expect, it } from 'vitest'
import { checkWritableDate, measurementComparison, newRewardUnlocks, validateCheckin, validateFeedback, validateWorkout } from '../engine'
import { validateMeasurementValues } from '../measurements'
import { buildReport } from '../report'
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
      { id: 'day-5', thresholdDays: 5, title: 'A', description: '', emoji: '🎁', sortOrder: 1, unlockedOn: null, celebratedAt: null },
      { id: 'day-10', thresholdDays: 10, title: 'B', description: '', emoji: '🎁', sortOrder: 2, unlockedOn: null, celebratedAt: null },
      { id: 'day-30', thresholdDays: 30, title: 'C', description: '', emoji: '🏆', sortOrder: 3, unlockedOn: null, celebratedAt: null },
    ],
    reports: [],
  }

  it('unlocks rewards on the day the active-day threshold is reached', () => {
    // Active days skip index 2, 6 (no workout) and 8 (under half done).
    expect(newRewardUnlocks(days, state.rewards)).toEqual([{ id: 'day-5', unlockedOn: addDays(start, 5) }])
  })

  it('compares measurements with baseline and previous', () => {
    expect(measurementComparison(state, 'weight')).toMatchObject({ baseline: 79.1, previous: 78.5, current: 78, changeFromBaseline: -1.1, changeFromPrevious: -0.5 })
  })

  it('builds a supportive monthly report', () => {
    const report = buildReport(state, 1)
    expect(report.days).toHaveLength(30)
    expect(report.activeDays).toBe(9)
    expect(report.workoutCount).toBe(10)
    expect(report.measurements.find((item) => item.key === 'weight')).toMatchObject({ start: 79.1, end: 78, change: -1.1 })
    expect(report.favoriteExercises[0]).toMatchObject({ id: 'boxing-hooks' })
    expect(report.hardExercises[0]).toMatchObject({ id: 'skater-hops' })
    const text = [...report.summary, ...report.suggestions].join(' ')
    expect(text).not.toMatch(/فشل|كسل|خسرتي/)
    expect(report.inProgress).toBe(true)
  })
})
