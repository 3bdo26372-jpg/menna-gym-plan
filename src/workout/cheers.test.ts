import { describe, expect, it } from 'vitest'
import { EXERCISE_BY_ID } from '../../shared/exercises'
import { buildWorkoutPlan } from '../../shared/program'
import { feedback } from '../../shared/__tests__/fixtures'
import { CHEER_MS, currentCheer, finishStyle, HARD_CHEER_GAP, HARD_CHEERS, hardestExerciseIds, MAX_HARD_CHEERS, planCheers, regularCheers } from './cheers'
import { createSession, sessionReducer, type PlayerStep, type Session } from './session'

const T0 = 1_000_000

/** A level-0 workout played from start to end without skipping anything. */
function completedSession(dayNumber: number) {
  const session = createSession('2026-10-01', buildWorkoutPlan({ date: '2026-10-01', dayNumber, level: 0 }))
  return [
    { type: 'play', now: T0 } as const,
    { type: 'tick', now: T0 + 60 * 60 * 1000 } as const,
  ].reduce(sessionReducer, session)
}

const workStep = (plannedExerciseId: string, slot: number): PlayerStep => ({
  kind: 'work', blockId: 'core', blockTitle: '', slot, round: 1, rounds: 1, plannedExerciseId, seconds: 30,
})

describe('workout cheers', () => {
  const session = completedSession(1)
  const cheers = planCheers(session, new Set())
  const workIndexes = session.steps.flatMap((step, index) => (step.kind === 'work' ? [index] : []))
  const positions = [...cheers.keys()].map((index) => workIndexes.indexOf(index))

  it('cheers a few times a workout, never close together and never in the cool-down', () => {
    expect(session.finished).toBe(true)
    expect(cheers.size).toBeGreaterThanOrEqual(3)
    expect(cheers.size).toBeLessThanOrEqual(6)
    positions.slice(1).forEach((position, index) => expect(position - positions[index]).toBeGreaterThanOrEqual(HARD_CHEER_GAP))
    for (const index of cheers.keys()) expect(session.steps[index].blockId).not.toBe('cooldown')
  })

  it('tells her she is the strongest pink princess after a jump, once a workout', () => {
    const hard = [...cheers.entries()].filter(([, cheer]) => HARD_CHEERS.includes(cheer))
    expect(hard.length).toBeGreaterThan(0)
    expect(hard.length).toBeLessThanOrEqual(MAX_HARD_CHEERS)
    for (const [index] of hard) expect(EXERCISE_BY_ID[session.steps[index].plannedExerciseId].impact).toBe('high')
  })

  it('does not count skipped exercises', () => {
    expect(planCheers({ ...session, completed: {} }, new Set()).size).toBe(0)
  })

  it('treats an exercise she once rated hardest as hard', () => {
    const steps = ['side-toe-touch', 'lunge-twist', 'side-toe-touch', 'squat-reach-twist', 'lunge-twist'].map(workStep)
    const base = { steps, completed: Object.fromEntries(steps.map((_, index) => [index, 30])), performed: {}, plan: { dayNumber: 1 } as Session['plan'] }
    expect([...planCheers(base, new Set()).entries()]).toEqual([[4, { text: 'عاش يا كتكوتة', emoji: '❤️' }]])
    const hardest = hardestExerciseIds([{ feedback: feedback({ hardestExerciseId: 'squat-reach-twist' }) }, { feedback: null }])
    expect([...planCheers(base, hardest).entries()]).toEqual([[3, HARD_CHEERS[0]]])
  })

  it('rotates the nicknames, the special line and the finish animation day by day', () => {
    expect(regularCheers(1).map((cheer) => cheer.text).slice(0, 3)).toEqual(['عاش يا كتكوتة', 'أشطر حد بيتمرن', 'عاش يا منونة'])
    expect(regularCheers(2)[0].text).toBe('عاش يا منونة')
    expect(regularCheers(2)[1]).toMatchObject({ text: 'أحلى جسم', loading: true })
    expect(regularCheers(3)[1].text).toBe('جسمك فاجر')
    expect([1, 2, 3, 4].map(finishStyle)).toEqual(['hearts', 'rockets', 'claps', 'hearts'])
  })

  it('shows a cheer only for the first seconds of the step after the exercise', () => {
    const steps = ['side-toe-touch', 'lunge-twist'].map(workStep)
    const map = new Map([[0, { text: 'عاش' }]])
    const at = { steps, stepIndex: 1, finished: false }
    expect(currentCheer(at, map, 30_000)).toEqual({ key: 0, cheer: { text: 'عاش' } })
    expect(currentCheer(at, map, 30_000 - CHEER_MS)).toBeNull()
    expect(currentCheer({ ...at, stepIndex: 0 }, map, 30_000)).toBeNull()
    expect(currentCheer({ ...at, finished: true }, map, 30_000)).toBeNull()
  })
})
