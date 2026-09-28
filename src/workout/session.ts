import { TRANSITION_SECONDS, type WorkoutPlan } from '../../shared/program'
import { addDays } from '../../shared/date'
import type { BlockId, DayRecord, ExerciseLog } from '../../shared/types'
import type { WorkoutInput } from '../lib/backend'
import { storage } from '../lib/storage'

export interface PlayerStep {
  kind: 'work' | 'rest'
  blockId: BlockId
  blockTitle: string
  slot: number
  round: number
  rounds: number
  plannedExerciseId: string
  seconds: number
}

/** A workout in progress. Persisted so a reload or a locked phone never loses it. */
export interface Session {
  version: 1
  date: string
  plan: WorkoutPlan
  steps: PlayerStep[]
  stepIndex: number
  /** Timestamp the current step ends at while running; null while paused. */
  endsAt: number | null
  /** Milliseconds left in the current step while paused. */
  remainingMs: number
  /** Alternative chosen per exercise slot (`block:slot` → exercise id). */
  switched: Record<string, string>
  /** Seconds done and exercise performed, per work step index. */
  completed: Record<number, number>
  performed: Record<number, string>
  startedAt: string | null
  finished: boolean
}

const KEY = 'menna-flow:active-workout:v1'

export const slotKey = (step: Pick<PlayerStep, 'blockId' | 'slot'>) => `${step.blockId}:${step.slot}`

export function flattenPlan(plan: WorkoutPlan): PlayerStep[] {
  const steps: PlayerStep[] = []
  plan.blocks.forEach((block, blockIndex) => {
    for (let round = 1; round <= block.rounds; round++) {
      block.exerciseIds.forEach((exerciseId, slot) => {
        const base = { blockId: block.id, blockTitle: block.title, slot, round, rounds: block.rounds, plannedExerciseId: exerciseId }
        steps.push({ ...base, kind: 'work', seconds: block.workSeconds })
        const next = block.exerciseIds[slot + 1] ?? (round < block.rounds ? block.exerciseIds[0] : undefined)
        if (next && block.restSeconds > 0) {
          steps.push({ ...base, kind: 'rest', seconds: block.restSeconds, slot: slot + 1 < block.exerciseIds.length ? slot + 1 : 0, plannedExerciseId: next, round: slot + 1 < block.exerciseIds.length ? round : round + 1 })
        }
      })
    }
    const nextBlock = plan.blocks[blockIndex + 1]
    if (nextBlock) {
      steps.push({
        kind: 'rest', blockId: nextBlock.id, blockTitle: nextBlock.title, slot: 0, round: 1, rounds: nextBlock.rounds,
        plannedExerciseId: nextBlock.exerciseIds[0], seconds: TRANSITION_SECONDS,
      })
    }
  })
  return steps
}

export function createSession(date: string, plan: WorkoutPlan): Session {
  const steps = flattenPlan(plan)
  return {
    version: 1, date, plan, steps, stepIndex: 0, endsAt: null, remainingMs: steps[0].seconds * 1000,
    switched: {}, completed: {}, performed: {}, startedAt: null, finished: false,
  }
}

export const exerciseForStep = (session: Session, step: PlayerStep) => session.switched[slotKey(step)] ?? step.plannedExerciseId

export type SessionAction =
  | { type: 'play'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'skip'; now: number }
  | { type: 'switch'; exerciseId: string | null }
  | { type: 'finish'; now: number }

function recordStep(session: Session, index: number, doneSeconds: number): Session {
  const step = session.steps[index]
  if (!step || step.kind !== 'work') return session
  return {
    ...session,
    completed: { ...session.completed, [index]: Math.max(session.completed[index] ?? 0, Math.min(step.seconds, Math.round(doneSeconds))) },
    performed: { ...session.performed, [index]: exerciseForStep(session, step) },
  }
}

function moveTo(session: Session, index: number, endsAtBase: number | null): Session {
  if (index >= session.steps.length) return { ...session, stepIndex: session.steps.length - 1, endsAt: null, remainingMs: 0, finished: true }
  const ms = session.steps[index].seconds * 1000
  return { ...session, stepIndex: index, endsAt: endsAtBase === null ? null : endsAtBase + ms, remainingMs: ms }
}

export function sessionReducer(session: Session, action: SessionAction): Session {
  if (session.finished && action.type !== 'switch') return session
  const step = session.steps[session.stepIndex]
  switch (action.type) {
    case 'play':
      if (session.endsAt !== null) return session
      return { ...session, endsAt: action.now + session.remainingMs, startedAt: session.startedAt ?? new Date(action.now).toISOString() }
    case 'pause':
      if (session.endsAt === null) return session
      return { ...session, endsAt: null, remainingMs: Math.max(0, session.endsAt - action.now) }
    case 'tick': {
      let next = session
      // Catch up on every step that ended (e.g. the phone was locked), keeping time continuous.
      while (next.endsAt !== null && !next.finished && next.endsAt <= action.now) {
        const current = next.steps[next.stepIndex]
        next = moveTo(recordStep(next, next.stepIndex, current.seconds), next.stepIndex + 1, next.endsAt)
      }
      return next
    }
    case 'skip': {
      const left = session.endsAt !== null ? Math.max(0, session.endsAt - action.now) : session.remainingMs
      const recorded = recordStep(session, session.stepIndex, step.seconds - left / 1000)
      return moveTo(recorded, session.stepIndex + 1, session.endsAt !== null ? action.now : null)
    }
    case 'switch': {
      const key = slotKey(step)
      const switched = { ...session.switched }
      if (action.exerciseId && action.exerciseId !== step.plannedExerciseId) switched[key] = action.exerciseId
      else delete switched[key]
      return { ...session, switched }
    }
    case 'finish': {
      const left = session.endsAt !== null ? Math.max(0, session.endsAt - action.now) : session.remainingMs
      const recorded = recordStep(session, session.stepIndex, step.seconds - left / 1000)
      return { ...recorded, endsAt: null, remainingMs: 0, finished: true }
    }
  }
}

export function remainingMs(session: Session, now: number) {
  return session.endsAt === null ? session.remainingMs : Math.max(0, session.endsAt - now)
}

export function workSummary(session: Session) {
  const work = session.steps.map((step, index) => ({ step, index })).filter((item) => item.step.kind === 'work')
  const done = work.reduce((sum, item) => sum + (session.completed[item.index] ?? 0), 0)
  const planned = work.reduce((sum, item) => sum + item.step.seconds, 0)
  return { done, planned, ratio: planned ? done / planned : 0 }
}

export function toWorkoutInput(session: Session): WorkoutInput {
  const exercises: ExerciseLog[] = session.steps.flatMap((step, index) =>
    step.kind === 'work'
      ? [{
          blockId: step.blockId,
          slot: step.slot,
          plannedExerciseId: step.plannedExerciseId,
          exerciseId: session.performed[index] ?? exerciseForStep(session, step),
          plannedSeconds: step.seconds,
          completedSeconds: session.completed[index] ?? 0,
          switched: (session.performed[index] ?? exerciseForStep(session, step)) !== step.plannedExerciseId,
        }]
      : [])
  return {
    dayType: session.plan.dayType,
    intensity: session.plan.intensity,
    level: session.plan.level,
    startedAt: session.startedAt ?? new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    exercises,
  }
}

export const sessionStore = {
  load: () => {
    const session = storage.getJson<Session>(KEY)
    return session?.version === 1 ? session : null
  },
  save: (session: Session) => storage.setJson(KEY, session),
  clear: () => storage.remove(KEY),
}

const LATE_NIGHT_GRACE_MS = 4 * 60 * 60 * 1000

/**
 * The stored session if it can still be continued: anything from today, or a
 * late-night session from yesterday (started within the last 4 hours, or
 * finished but not yet rated). Its date stays the day it started on.
 */
export function resumableSession(today: string, days: DayRecord[], now = Date.now()): Session | null {
  const stored = sessionStore.load()
  if (!stored) return null
  const day = days.find((item) => item.date === stored.date)
  if (stored.finished && day?.feedback) return null
  if (stored.date === today) return stored
  if (stored.date !== addDays(today, -1)) return null
  const started = stored.startedAt ? Date.parse(stored.startedAt) : 0
  return stored.finished || now - started < LATE_NIGHT_GRACE_MS ? stored : null
}
