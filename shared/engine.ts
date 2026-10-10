import { addDays, diffDays, isIsoDate } from './date'
import { EXERCISE_BY_ID } from './exercises'
import { isPainRest } from './period'
import { ACTIVE_DAY_MIN_COMPLETION } from './rewards'
import type {
  AppState,
  BlockId,
  CheckIn,
  DayRecord,
  DayType,
  ExerciseLog,
  Feedback,
  RewardState,
  WorkoutResult,
} from './types'

/**
 * Validation and derived values shared by the Worker API and the local
 * development backend, so both store exactly the same shapes.
 */
const ENERGY = ['low', 'normal', 'high'] as const
const MOOD = ['bad', 'okay', 'good'] as const
const BODY = ['fresh', 'normal', 'tired'] as const
const SWEAT = ['low', 'medium', 'high'] as const
const OVERALL = ['easy', 'perfect', 'hard'] as const
const BLOCKS: BlockId[] = ['warmup', 'cardio', 'core', 'light', 'cooldown']
const DAY_TYPES: DayType[] = ['cardio-burn', 'box-kick', 'sculpt-sweat', 'light']
const MAIN_BLOCKS: BlockId[] = ['cardio', 'core', 'light']

type Json = Record<string, unknown>
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)
const oneOf = <T extends string>(values: readonly T[], value: unknown): value is T => values.includes(value as T)
const nowIso = () => new Date().toISOString()

/** Writes are allowed for today and, as a late-night grace period, yesterday. */
export function checkWritableDate(date: string, today: string, programStartDate: string | null): string | null {
  if (!isIsoDate(date)) return 'invalid date'
  if (!programStartDate) return 'the program has not started yet'
  if (date < programStartDate) return 'date is before the program start'
  if (date > today) return 'date is in the future'
  if (diffDays(date, today) > 1) return 'only today and yesterday can be updated'
  return null
}

export function validateCheckin(input: unknown): CheckIn | string {
  if (!isObject(input)) return 'check-in must be an object'
  if (!oneOf(ENERGY, input.energy)) return 'energy must be low, normal or high'
  if (!oneOf(MOOD, input.mood)) return 'mood must be bad, okay or good'
  if (!oneOf(BODY, input.body)) return 'body must be fresh, normal or tired'
  return { energy: input.energy, mood: input.mood, body: input.body, at: nowIso() }
}

export function validateFeedback(input: unknown): Feedback | string {
  if (!isObject(input)) return 'feedback must be an object'
  const difficulty = Number(input.difficulty)
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 10) return 'difficulty must be 1–10'
  if (!oneOf(ENERGY, input.energyAfter)) return 'energyAfter must be low, normal or high'
  if (!oneOf(SWEAT, input.sweating)) return 'sweating must be low, medium or high'
  if (!oneOf(OVERALL, input.overall)) return 'overall must be easy, perfect or hard'
  if (typeof input.pain !== 'boolean') return 'pain must be true or false'
  const exerciseId = (value: unknown) => (typeof value === 'string' && EXERCISE_BY_ID[value] ? value : undefined)
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 1000) : ''
  return {
    difficulty,
    energyAfter: input.energyAfter,
    sweating: input.sweating,
    overall: input.overall,
    pain: input.pain,
    favoriteExerciseId: exerciseId(input.favoriteExerciseId),
    hardestExerciseId: exerciseId(input.hardestExerciseId),
    note: note || undefined,
    at: nowIso(),
  }
}

function clampSeconds(value: unknown, max = 3600) {
  const number = Math.round(Number(value))
  return Number.isFinite(number) ? Math.max(0, Math.min(max, number)) : 0
}

/** Completion ratios are always derived from the exercise log, never trusted from the client. */
export function summarizeExercises(exercises: ExerciseLog[]) {
  const sum = (blocks: BlockId[], key: 'plannedSeconds' | 'completedSeconds') =>
    exercises.filter((item) => blocks.includes(item.blockId)).reduce((total, item) => total + item[key], 0)
  const ratio = (blocks: BlockId[]) => {
    const planned = sum(blocks, 'plannedSeconds')
    return planned > 0 ? Math.min(1, sum(blocks, 'completedSeconds') / planned) : 0
  }
  return {
    mainCompletion: Math.round(ratio(MAIN_BLOCKS) * 1000) / 1000,
    warmupDone: ratio(['warmup']) >= 0.8,
    cooldownDone: ratio(['cooldown']) >= 0.8,
    activeSeconds: exercises.reduce((total, item) => total + item.completedSeconds, 0),
  }
}

export function validateWorkout(input: unknown): WorkoutResult | string {
  if (!isObject(input)) return 'workout must be an object'
  if (!oneOf(DAY_TYPES, input.dayType)) return 'invalid dayType'
  if (input.intensity !== 'gentle' && input.intensity !== 'normal') return 'invalid intensity'
  if (!Array.isArray(input.exercises) || input.exercises.length === 0 || input.exercises.length > 200) return 'exercises are required'
  const exercises: ExerciseLog[] = []
  for (const raw of input.exercises) {
    if (!isObject(raw)) return 'invalid exercise log'
    if (!oneOf(BLOCKS, raw.blockId)) return 'invalid block'
    if (typeof raw.exerciseId !== 'string' || !EXERCISE_BY_ID[raw.exerciseId]) return `unknown exercise ${String(raw.exerciseId)}`
    if (typeof raw.plannedExerciseId !== 'string' || !EXERCISE_BY_ID[raw.plannedExerciseId]) return 'unknown planned exercise'
    const plannedSeconds = clampSeconds(raw.plannedSeconds, 900)
    exercises.push({
      blockId: raw.blockId,
      slot: clampSeconds(raw.slot, 1000),
      plannedExerciseId: raw.plannedExerciseId,
      exerciseId: raw.exerciseId,
      plannedSeconds,
      completedSeconds: Math.min(plannedSeconds, clampSeconds(raw.completedSeconds, 900)),
      switched: Boolean(raw.switched),
    })
  }
  const summary = summarizeExercises(exercises)
  const startedAt = typeof input.startedAt === 'string' && !Number.isNaN(Date.parse(input.startedAt)) ? input.startedAt : nowIso()
  const finishedAt = typeof input.finishedAt === 'string' && !Number.isNaN(Date.parse(input.finishedAt)) ? input.finishedAt : nowIso()
  return {
    dayType: input.dayType,
    intensity: input.intensity,
    level: Math.max(0, Math.min(20, Math.round(Number(input.level) || 0))),
    status: summary.mainCompletion >= 0.999 ? 'completed' : 'partial',
    startedAt,
    finishedAt,
    plannedSeconds: exercises.reduce((total, item) => total + item.plannedSeconds, 0),
    ...summary,
    exercises,
  }
}

/** Keep the better of two workouts logged for the same day. */
export function preferWorkout(existing: WorkoutResult | null, incoming: WorkoutResult): boolean {
  return !existing || incoming.mainCompletion >= existing.mainCompletion
}

/** Trained (half the workout or more), a day pass, or a period-pain rest day. */
export function isActiveDay(day: Pick<DayRecord, 'workout' | 'excused'> & Partial<Pick<DayRecord, 'periodPain'>>) {
  return Boolean(day.excused || isPainRest(day.periodPain) || (day.workout && day.workout.mainCompletion >= ACTIVE_DAY_MIN_COMPLETION))
}

/** Rewards that should now be unlocked, with the date their threshold was reached. */
export function newRewardUnlocks(days: DayRecord[], rewards: Pick<RewardState, 'id' | 'thresholdDays' | 'unlockedOn'>[]) {
  const activeDates = days.filter(isActiveDay).map((day) => day.date).sort()
  return rewards
    .filter((reward) => !reward.unlockedOn && activeDates.length >= reward.thresholdDays)
    .map((reward) => ({ id: reward.id, unlockedOn: activeDates[reward.thresholdDays - 1] }))
}

export function latestMeasurement(state: Pick<AppState, 'measurements' | 'baseline'>, key: string, onOrBefore?: string) {
  const entries = state.measurements
    .filter((entry) => entry.values[key] !== undefined && (!onOrBefore || entry.measuredOn <= onOrBefore))
    .sort((a, b) => a.measuredOn.localeCompare(b.measuredOn) || a.id - b.id)
  const last = entries.at(-1)
  if (last) return { value: last.values[key], date: last.measuredOn as string | null, fromBaseline: false }
  const baseline = state.baseline.find((metric) => metric.key === key)
  return baseline ? { value: baseline.value, date: null, fromBaseline: true } : null
}

/** Baseline, previous and current value for a measurement. */
export function measurementComparison(state: Pick<AppState, 'measurements' | 'baseline'>, key: string) {
  const baseline = state.baseline.find((metric) => metric.key === key)?.value ?? null
  const history = state.measurements
    .filter((entry) => entry.values[key] !== undefined)
    .sort((a, b) => a.measuredOn.localeCompare(b.measuredOn) || a.id - b.id)
  const current = history.at(-1)?.values[key] ?? baseline
  const previous = history.length >= 2 ? history.at(-2)!.values[key] : baseline
  return {
    baseline,
    previous,
    current,
    changeFromBaseline: baseline !== null && current !== null ? round1(current - baseline) : null,
    changeFromPrevious: previous !== null && current !== null && history.length > 0 ? round1(current - previous) : null,
    entries: history.length,
  }
}

export const round1 = (value: number) => Math.round(value * 10) / 10

export function summaryStats(state: AppState) {
  const recorded = state.days.filter((day) => day.date <= state.today)
  const activeDays = recorded.filter(isActiveDay)
  const scored = recorded.filter((day) => day.date < state.today || day.score.total > 0)
  const averageScore = scored.length ? Math.round(scored.reduce((sum, day) => sum + day.score.total, 0) / scored.length) : 0
  const totalMinutes = Math.round(recorded.reduce((sum, day) => sum + (day.workout?.activeSeconds ?? 0), 0) / 60)
  return { activeDays: activeDays.length, averageScore, totalMinutes, recordedDays: recorded.length }
}

export function nextReward(state: AppState) {
  const active = summaryStats(state).activeDays
  const sorted = [...state.rewards].sort((a, b) => a.sortOrder - b.sortOrder)
  const next = sorted.find((reward) => !reward.unlockedOn)
  return { active, next, unlocked: sorted.filter((reward) => reward.unlockedOn) }
}

export function dayRecordsFor(startDate: string, today: string) {
  const days: string[] = []
  for (let date = startDate; date <= today; date = addDays(date, 1)) days.push(date)
  return days
}
