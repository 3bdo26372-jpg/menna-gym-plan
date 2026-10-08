import { EXERCISE_BY_ID } from '../../shared/exercises'
import type { DayRecord } from '../../shared/types'
import type { Session } from './session'

/**
 * Little messages during the workout. They are kept sparse so they stay sweet
 * instead of annoying:
 * - one after every few exercises she actually finished (skipped ones don't count),
 * - one after a hard exercise (a jump, or one she once rated hardest), at most once a workout,
 * - never two close together, and none during the cool-down stretches,
 * - each shows for about 3 seconds and never blocks the workout.
 * Finishing the whole workout gets a bigger celebration instead.
 */
export interface Cheer {
  text: string
  emoji?: string
  /** Shows a little loading bar next to the text. */
  loading?: boolean
}

export { NICKNAMES } from '../../shared/nicknames'
import { NICKNAMES } from '../../shared/nicknames'
export const SPECIAL_CHEERS: Cheer[] = [
  { text: 'أشطر حد بيتمرن', emoji: '💪' },
  { text: 'أحلى جسم', loading: true },
  { text: 'جسمك فاجر', emoji: '🔥🔥' },
]
export const HARD_CHEERS: Cheer[] = [
  { text: 'إنتي أقوى أميرة بينك', emoji: '👑💗' },
  { text: 'مفيش أقوى من أميرتي البينك', emoji: '💪💗' },
]

/** Finished exercises between two regular cheers. */
export const CHEER_EVERY = 5
/** A hard exercise gets its cheer only if this many exercises passed since the last one. */
export const HARD_CHEER_GAP = 3
export const MAX_HARD_CHEERS = 1
export const CHEER_MS = 3200
/** An exercise counts as finished once 80% of its time was done. */
const FINISHED_RATIO = 0.8

const pick = <T>(list: T[], index: number) => list[((index % list.length) + list.length) % list.length]

/** The day's regular cheers: nicknames with one special line in between, rotating day by day. */
export function regularCheers(dayNumber: number): Cheer[] {
  const nickname = (offset: number): Cheer => ({ text: `عاش يا ${pick(NICKNAMES, dayNumber - 1 + offset)}`, emoji: '❤️' })
  return [nickname(0), pick(SPECIAL_CHEERS, dayNumber - 1), nickname(1), nickname(2), nickname(3)]
}

export function hardestExerciseIds(days: Pick<DayRecord, 'feedback'>[]) {
  return new Set(days.flatMap((day) => (day.feedback?.hardestExerciseId ? [day.feedback.hardestExerciseId] : [])))
}

const isHard = (exerciseId: string, hardest: Set<string>) => EXERCISE_BY_ID[exerciseId]?.impact === 'high' || hardest.has(exerciseId)

/** Which finished exercise (by step index) gets which cheer. */
export function planCheers(session: Pick<Session, 'steps' | 'completed' | 'performed' | 'plan'>, hardest: Set<string>) {
  const regular = regularCheers(session.plan.dayNumber)
  const cheers = new Map<number, Cheer>()
  let sinceLast = 0
  let hardCount = 0
  let regularCount = 0
  session.steps.forEach((step, index) => {
    if (step.kind !== 'work' || step.blockId === 'cooldown') return
    if ((session.completed[index] ?? 0) < step.seconds * FINISHED_RATIO) return
    sinceLast += 1
    const hard = isHard(step.plannedExerciseId, hardest) || isHard(session.performed[index] ?? step.plannedExerciseId, hardest)
    if (hard && hardCount < MAX_HARD_CHEERS && sinceLast >= HARD_CHEER_GAP) {
      cheers.set(index, pick(HARD_CHEERS, session.plan.dayNumber - 1 + hardCount++))
      sinceLast = 0
    } else if (sinceLast >= CHEER_EVERY) {
      cheers.set(index, pick(regular, regularCount++))
      sinceLast = 0
    }
  })
  return cheers
}

/** The cheer to show now: during the first few seconds of the step right after a cheered exercise. */
export function currentCheer(session: Pick<Session, 'steps' | 'stepIndex' | 'finished'>, cheers: Map<number, Cheer>, remainingMs: number) {
  if (session.finished || session.stepIndex === 0) return null
  const cheer = cheers.get(session.stepIndex - 1)
  const step = session.steps[session.stepIndex]
  if (!cheer || step.seconds * 1000 - remainingMs >= CHEER_MS) return null
  return { key: session.stepIndex - 1, cheer }
}

export type FinishStyle = 'hearts' | 'rockets' | 'claps'
export const FINISH_STYLES: FinishStyle[] = ['hearts', 'rockets', 'claps']

/** The end-of-workout animation rotates day by day. */
export const finishStyle = (dayNumber: number) => pick(FINISH_STYLES, dayNumber - 1)
