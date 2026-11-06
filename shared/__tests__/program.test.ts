import { describe, expect, it } from 'vitest'
import { EXERCISES, EXERCISE_BY_ID } from '../exercises'
import { adaptiveState, buildWorkoutPlan, dayTypeAfter, feltLight, LEVELS, LONG_BREAK_DAYS, MAX_LEVEL, nextDayType, planForDay, TINY_TITLE } from '../program'
import type { PeriodEntry } from '../period'
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
  it('rotates the three active days workout by workout', () => {
    expect([null, 'cardio-burn', 'box-kick', 'sculpt-sweat'].map((type) => dayTypeAfter(type as never))).toEqual(['cardio-burn', 'box-kick', 'sculpt-sweat', 'cardio-burn'])
  })

  it('picks up after the last active workout, so rest days never skip a type', () => {
    const days = [
      day('2026-11-03', 36, { workout: workout({ dayType: 'box-kick' }) }),
      day('2026-11-04', 37),
      day('2026-11-05', 38, { workout: workout({ dayType: 'light' }) }),
      day('2026-11-06', 39),
    ]
    expect(nextDayType(days, '2026-11-07')).toBe('sculpt-sweat')
    expect(nextDayType([], '2026-11-07')).toBe('cardio-burn')
    // Less than half of a workout doesn't move the rotation on.
    expect(nextDayType([day('2026-11-03', 36, { workout: workout({ dayType: 'box-kick', mainCompletion: 0.2 }) })], '2026-11-04')).toBe('cardio-burn')
  })

  it('goes gentle just before her period, and light when she is tired too', () => {
    const periods: PeriodEntry[] = [{ id: 1, startDate: '2026-10-12', endDate: '2026-10-16', createdAt: '' }]
    // A 28-day cycle: the next one is expected on 11-09, so 11-06 is just before it.
    const before = planForDay([], '2026-11-06', 39, checkin, periods)
    expect(before.intensity).toBe('gentle')
    expect(before.dayType).not.toBe('light')
    expect(before.blocks.find((block) => block.id === 'cardio')!.exerciseIds.every((id) => EXERCISE_BY_ID[id].impact === 'low')).toBe(true)
    expect(planForDay([], '2026-11-06', 39, { ...checkin, body: 'tired' }, periods).dayType).toBe('light')
    expect(planForDay([], '2026-10-25', 27, checkin, periods).intensity).toBe('normal')
  })

  it('leaves skater steps out of every workout', () => {
    for (let dayNumber = 1; dayNumber <= 24; dayNumber++) {
      for (const level of [0, MAX_LEVEL]) {
        for (const intensity of [{ energy: 'low' as const }, {}]) {
          const plan = buildWorkoutPlan({ date: '2026-11-06', dayNumber, level, checkin: { ...checkin, ...intensity } })
          expect(plan.blocks.flatMap((block) => block.exerciseIds)).not.toContain('skater-steps')
        }
      }
    }
    expect(buildWorkoutPlan({ date: '2026-11-06', dayNumber: 1, level: 0, painReported: true }).blocks.flatMap((block) => block.exerciseIds)).not.toContain('skater-steps')
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
    expect(adaptiveState(history(['easy', 'easy']), '2026-10-03').level).toBe(0)
    expect(adaptiveState(history(['easy', 'easy', 'easy']), '2026-10-03').level).toBe(1)
    expect(LEVELS[1].workSeconds - LEVELS[0].workSeconds).toBe(5)
  })

  it('moves down after two Hard workouts and eases the next one', () => {
    const state = adaptiveState(history(['easy', 'easy', 'easy', 'hard', 'hard']), '2026-10-03')
    expect(state.level).toBe(0)
    expect(state.easeAfterHard).toBe(true)
  })

  it('counts a Perfect workout that felt light (difficulty 4 or less) toward the next level', () => {
    const light = (index: number, overrides = {}) => day(addDays(start, index), index + 1, {
      checkin, workout: workout({ dayType: 'box-kick' }), feedback: feedback({ overall: 'perfect', difficulty: 3, ...overrides }),
    })
    expect(adaptiveState([light(0), light(1), light(2)], '2026-10-03').level).toBe(1)
    // Low energy afterwards, or a 5/10, doesn't count.
    expect(feltLight(feedback({ overall: 'perfect', difficulty: 3, energyAfter: 'low' }))).toBe(false)
    expect(feltLight(feedback({ overall: 'perfect', difficulty: 5 }))).toBe(false)
    expect(adaptiveState([light(0), light(1), light(2, { difficulty: 6 })], '2026-10-03').level).toBe(0)
  })

  it('goes up one level at a time, and light days count neither way', () => {
    const easy = (index: number, dayType: 'cardio-burn' | 'light' = 'cardio-burn') => day(addDays(start, index), index + 1, {
      checkin, workout: workout({ dayType }), feedback: feedback({ overall: 'easy' }),
    })
    expect(adaptiveState([easy(0), easy(1), easy(2, 'light'), easy(3)], '2026-10-03')).toMatchObject({ level: 1, lightStreak: 0 })
    expect(adaptiveState([0, 1, 2, 3, 4].map((index) => easy(index)), '2026-10-03')).toMatchObject({ level: 1, lightStreak: 2 })
  })

  it('steps down a level after a long break, so she comes back gently', () => {
    const easy = (index: number) => day(addDays(start, index), index + 1, { checkin, workout: workout(), feedback: feedback({ overall: 'easy' }) })
    const three = [easy(0), easy(1), easy(2)]
    expect(adaptiveState(three, addDays(start, 3 + LONG_BREAK_DAYS - 2)).level).toBe(1)
    expect(adaptiveState(three, addDays(start, 2 + LONG_BREAK_DAYS)).level).toBe(0)
  })

  it('says so on the day the level goes up', () => {
    const easy = (index: number) => day(addDays(start, index), index + 1, { checkin, workout: workout({ dayType: 'box-kick' }), feedback: feedback({ overall: 'easy' }) })
    const plan = planForDay([easy(0), easy(1), easy(2)], addDays(start, 3), 4, checkin)
    expect(plan.level).toBe(1)
    expect(plan.notes.join(' ')).toContain('مستوى جديد')
    expect(plan.dayType).toBe('sculpt-sweat')
  })

  it('never progresses while pain is reported', () => {
    const state = adaptiveState(history(['easy', 'easy', 'easy'], true), '2026-10-01')
    expect(state.level).toBe(0)
    expect(state.painReported).toBe(true)
  })
})

describe('period pain and the workout', () => {
  it('is a tiny, jump-free session of about 5 minutes when the pain is above 4', () => {
    const plan = buildWorkoutPlan({ date: '2026-10-05', dayNumber: 2, level: 4, periodPain: 6 })
    expect(plan.title).toBe(TINY_TITLE)
    expect(plan.dayType).toBe('light')
    expect(plan.totalSeconds).toBeLessThanOrEqual(6 * 60)
    for (const id of plan.blocks.flatMap((block) => block.exerciseIds)) expect(EXERCISE_BY_ID[id].impact).toBe('low')
  })

  it('takes the jumps out for milder pain', () => {
    const plan = buildWorkoutPlan({ date: '2026-10-05', dayNumber: 1, level: 0, periodPain: 3 })
    expect(plan.intensity).toBe('gentle')
    const cardio = plan.blocks.find((block) => block.id === 'cardio')!
    for (const id of cardio.exerciseIds) expect(EXERCISE_BY_ID[id].impact).toBe('low')
  })

  it('reads the pain she logged for the day', () => {
    const date = '2026-10-05'
    expect(planForDay([day(date, 1, { periodPain: 9 })], date, 1).title).toBe(TINY_TITLE)
    expect(planForDay([day(date, 1, { periodPain: 0 })], date, 1).title).not.toBe(TINY_TITLE)
  })
})
