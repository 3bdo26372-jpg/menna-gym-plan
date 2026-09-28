import { describe, expect, it } from 'vitest'
import { buildWorkoutPlan } from '../../shared/program'
import { validateWorkout } from '../../shared/engine'
import { createSession, exerciseForStep, remainingMs, sessionReducer, toWorkoutInput, workSummary, type Session } from './session'

const plan = buildWorkoutPlan({ date: '2026-09-28', dayNumber: 1, level: 0 })
const T0 = 1_000_000

const run = (session: Session, ...actions: Parameters<typeof sessionReducer>[1][]) => actions.reduce(sessionReducer, session)

describe('workout session', () => {
  it('flattens the plan into timed work and rest steps matching the plan length', () => {
    const session = createSession('2026-09-28', plan)
    const total = session.steps.reduce((sum, step) => sum + step.seconds, 0)
    expect(total).toBe(plan.totalSeconds)
    expect(session.steps[0]).toMatchObject({ kind: 'work', blockId: 'warmup' })
    expect(session.steps.at(-1)).toMatchObject({ kind: 'work', blockId: 'cooldown' })
  })

  it('keeps time from timestamps: pausing and resuming never resets the timer', () => {
    let session = run(createSession('2026-09-28', plan), { type: 'play', now: T0 })
    session = run(session, { type: 'tick', now: T0 + 10_000 }, { type: 'pause', now: T0 + 12_000 })
    expect(session.remainingMs).toBe(18_000)
    session = run(session, { type: 'play', now: T0 + 60_000 })
    expect(remainingMs(session, T0 + 61_000)).toBe(17_000)
  })

  it('catches up on steps that ended while the phone was locked', () => {
    let session = run(createSession('2026-09-28', plan), { type: 'play', now: T0 })
    session = run(session, { type: 'tick', now: T0 + 75_000 })
    expect(session.stepIndex).toBe(2)
    expect(session.completed).toEqual({ 0: 30, 1: 30 })
    expect(remainingMs(session, T0 + 75_000)).toBe(15_000)
  })

  it('records partial time when skipping and finishes after the last step', () => {
    let session = run(createSession('2026-09-28', plan), { type: 'play', now: T0 }, { type: 'skip', now: T0 + 12_000 })
    expect(session.completed[0]).toBe(12)
    expect(session.stepIndex).toBe(1)
    session = run(session, { type: 'finish', now: T0 + 20_000 })
    expect(session.finished).toBe(true)
    expect(workSummary(session).done).toBe(20)
  })

  it('switches to the easier alternative for this and later rounds without losing progress', () => {
    let session = createSession('2026-09-28', plan)
    const cardioIndex = session.steps.findIndex((step) => step.blockId === 'cardio' && step.kind === 'work')
    session = { ...session, stepIndex: cardioIndex, remainingMs: 21_000 }
    const planned = session.steps[cardioIndex].plannedExerciseId
    session = run(session, { type: 'switch', exerciseId: 'step-back-reach' })
    expect(session.remainingMs).toBe(21_000)
    const laterRound = session.steps.findIndex((step, index) => index > cardioIndex && step.kind === 'work' && step.plannedExerciseId === planned)
    expect(exerciseForStep(session, session.steps[laterRound])).toBe('step-back-reach')
    session = run(session, { type: 'play', now: T0 }, { type: 'tick', now: T0 + 21_000 })
    const input = toWorkoutInput(session)
    const log = input.exercises.find((item) => item.plannedExerciseId === planned && item.completedSeconds > 0)!
    expect(log).toMatchObject({ exerciseId: 'step-back-reach', switched: true, completedSeconds: 30 })
    expect(typeof validateWorkout(input)).toBe('object')
  })
})
