import { describe, expect, it } from 'vitest'
import { EXERCISES, EXERCISE_BY_ID } from '../exercises'
import { adaptiveState, buildWorkoutPlan, dayTypeFor, LEVELS, MAX_LEVEL } from '../program'
import { checkin, day, feedback, workout } from './fixtures'
import { addDays } from '../date'

const FORBIDDEN = /floor|lying|seated|kneeling|plank|wall|chair|bench|dumbbell|band|cable|machine/i

describe('exercise catalog', () => {
  it('only contains standing, equipment-free movements with local media', () => {
    for (const exercise of EXERCISES) {
      expect(exercise.name).not.toMatch(FORBIDDEN)
      expect(exercise.media).toBe(`/exercises/${exercise.id}.webp`)
      expect(exercise.instruction.length).toBeGreaterThan(20)
    }
  })

  it('gives every jumping movement a low-impact alternative', () => {
    for (const exercise of EXERCISES.filter((item) => item.impact === 'high')) {
      const alternative = EXERCISE_BY_ID[exercise.alternativeId ?? '']
      expect(alternative, exercise.id).toBeDefined()
      expect(alternative.impact).toBe('low')
    }
  })

  it('points every alternative at a real exercise', () => {
    for (const exercise of EXERCISES) if (exercise.alternativeId) expect(EXERCISE_BY_ID[exercise.alternativeId]).toBeDefined()
  })
})

describe('workout plans', () => {
  it('rotates three active days and a Light Movement Day', () => {
    expect([1, 2, 3, 4, 5, 8].map(dayTypeFor)).toEqual(['cardio-burn', 'box-kick', 'sculpt-sweat', 'light', 'cardio-burn', 'light'])
  })

  it('keeps level 0 workouts around 15–20 minutes and the top level under 30', () => {
    for (let dayNumber = 1; dayNumber <= 12; dayNumber++) {
      const plan = buildWorkoutPlan({ date: '2026-09-28', dayNumber, level: 0, checkin })
      const minutes = plan.totalSeconds / 60
      if (plan.dayType === 'light') expect(minutes).toBeGreaterThanOrEqual(12)
      else expect(minutes).toBeGreaterThanOrEqual(15)
      expect(minutes).toBeLessThanOrEqual(20)
      const top = buildWorkoutPlan({ date: '2026-09-28', dayNumber, level: MAX_LEVEL, checkin })
      expect(top.totalSeconds / 60).toBeLessThanOrEqual(30)
    }
  })

  it('always has warm-up, main work and standing stretches, with no repeats in a block', () => {
    for (let dayNumber = 1; dayNumber <= 16; dayNumber++) {
      const plan = buildWorkoutPlan({ date: '2026-09-28', dayNumber, level: 3 })
      expect(plan.blocks[0].id).toBe('warmup')
      expect(plan.blocks.at(-1)!.id).toBe('cooldown')
      for (const block of plan.blocks) {
        expect(new Set(block.exerciseIds).size).toBe(block.exerciseIds.length)
        for (const id of block.exerciseIds) expect(EXERCISE_BY_ID[id], id).toBeDefined()
      }
      const cooldown = plan.blocks.at(-1)!.exerciseIds
      expect(cooldown).toContain('standing-quad-stretch')
      expect(cooldown).toContain('runners-stretch')
      if (plan.dayType !== 'light') expect(plan.blocks.find((block) => block.id === 'cardio')!.exerciseIds.some((id) => EXERCISE_BY_ID[id].impact === 'high')).toBe(true)
    }
  })

  it('rotates exercises between weeks', () => {
    const week1 = buildWorkoutPlan({ date: '2026-09-28', dayNumber: 1, level: 0 }).blocks[1].exerciseIds
    const week2 = buildWorkoutPlan({ date: '2026-10-02', dayNumber: 5, level: 0 }).blocks[1].exerciseIds
    expect(week2).not.toEqual(week1)
  })

  it('swaps jumps for their alternatives on a low-energy day', () => {
    const plan = buildWorkoutPlan({ date: '2026-09-28', dayNumber: 1, level: 0, checkin: { ...checkin, energy: 'low' } })
    expect(plan.intensity).toBe('gentle')
    expect(plan.blocks[1].exerciseIds.every((id) => EXERCISE_BY_ID[id].impact === 'low')).toBe(true)
  })

  it('turns the day into light movement after pain', () => {
    const plan = buildWorkoutPlan({ date: '2026-09-28', dayNumber: 1, level: 2, painReported: true })
    expect(plan.dayType).toBe('light')
    expect(plan.notes.join(' ')).toContain('ألم')
  })

  it('only adds harder exercises at higher levels', () => {
    const low = Array.from({ length: 12 }, (_, i) => buildWorkoutPlan({ date: '2026-09-28', dayNumber: i + 1, level: 0 }))
    expect(low.flatMap((plan) => plan.blocks.flatMap((block) => block.exerciseIds))).not.toContain('sprint-knees')
  })
})

describe('adaptation', () => {
  const start = '2026-09-28'
  const history = (overalls: ('easy' | 'perfect' | 'hard')[], pain = false) =>
    overalls.map((overall, index) => day(addDays(start, index), index + 1, {
      checkin, workout: workout({ dayType: 'cardio-burn' }), feedback: feedback({ overall, pain }),
    }))

  it('moves up one level after three Easy workouts', () => {
    expect(adaptiveState(history(['easy', 'easy']), '2026-10-10').level).toBe(0)
    expect(adaptiveState(history(['easy', 'easy', 'easy']), '2026-10-10').level).toBe(1)
    expect(LEVELS[1].workSeconds - LEVELS[0].workSeconds).toBe(5)
  })

  it('moves down after two Hard workouts and eases the next one', () => {
    const state = adaptiveState(history(['easy', 'easy', 'easy', 'hard', 'hard']), '2026-10-03')
    expect(state.level).toBe(0)
    expect(state.easeAfterHard).toBe(true)
  })

  it('never progresses while pain is reported', () => {
    const state = adaptiveState(history(['easy', 'easy', 'easy'], true), '2026-10-01')
    expect(state.level).toBe(0)
    expect(state.painReported).toBe(true)
  })
})
