import { cairoDate, dateRange, dayNumberFor, diffDays, isIsoDate } from '../../shared/date'
import { checkFoodDate, validateFood, type FoodEntry } from '../../shared/food'
import { checkWritableDate, newRewardUnlocks, preferWorkout, validateCheckin, validateFeedback, validateWorkout } from '../../shared/engine'
import { BASELINE_METRICS, validateMeasurementValues } from '../../shared/measurements'
import { buildReport, type ReportData } from '../../shared/report'
import { DEFAULT_REWARDS, hideIfLocked } from '../../shared/rewards'
import { computeDailyScore } from '../../shared/scoring'
import type { AppState, CheckIn, Feedback, MeasurementEntry, RewardState, WorkoutResult } from '../../shared/types'
import { ApiError, type Backend } from './backend'
import { storage } from './storage'

/**
 * Development fallback used only when VITE_API_URL is not configured. It
 * mirrors the Worker API (same validation and scoring) but keeps data in this
 * browser's localStorage, so it is not the production data store.
 */
const KEY = 'menna-flow:local-db:v1'
const reportKey = (kind: string, periodIndex: number) => `${kind}:${periodIndex}`

interface LocalDb {
  programStartDate: string | null
  measurements: MeasurementEntry[]
  logs: Record<string, { checkin: CheckIn | null; workout: WorkoutResult | null; feedback: Feedback | null }>
  rewards: RewardState[]
  reports: Record<string, ReportData>
  foodEntries?: FoodEntry[]
}

function freshDb(): LocalDb {
  return {
    programStartDate: null,
    measurements: [],
    logs: {},
    rewards: DEFAULT_REWARDS.map((reward) => ({ ...reward, unlockedOn: null, celebratedAt: null })),
    reports: {},
  }
}

const load = (): LocalDb => storage.getJson<LocalDb>(KEY) ?? freshDb()
const save = (db: LocalDb) => storage.setJson(KEY, db)
const fail = (status: number, message: string): never => {
  throw new ApiError(status, message)
}

function toState(db: LocalDb): AppState {
  const today = cairoDate()
  const start = db.programStartDate
  const days = start
    ? dateRange(start, today).map((date) => {
        const parts = db.logs[date] ?? { checkin: null, workout: null, feedback: null }
        return { date, dayNumber: dayNumberFor(start, date), ...parts, score: computeDailyScore(parts) }
      })
    : []
  const unlocks = newRewardUnlocks(days, db.rewards)
  if (unlocks.length) {
    db.rewards = db.rewards.map((reward) => ({ ...reward, unlockedOn: unlocks.find((item) => item.id === reward.id)?.unlockedOn ?? reward.unlockedOn }))
    save(db)
  }
  return {
    today,
    profile: { name: 'Menna', timezone: 'Africa/Cairo', programStartDate: start },
    baseline: BASELINE_METRICS.map(({ key, value, unit }) => ({ key, value, unit })),
    measurements: db.measurements,
    days,
    rewards: [...db.rewards].sort((a, b) => a.sortOrder - b.sortOrder).map(hideIfLocked),
    reports: Object.values(db.reports).map((report) => ({
      kind: report.kind ?? 'month', periodIndex: report.periodIndex, startDate: report.startDate, endDate: report.endDate, generatedAt: report.generatedAt,
    })),
    foodEntries: [...(db.foodEntries ?? [])].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id - b.id),
  }
}

function writeDay(date: string, update: (db: LocalDb, log: LocalDb['logs'][string]) => void) {
  const db = load()
  const problem = checkWritableDate(date, cairoDate(), db.programStartDate)
  if (problem) fail(400, problem)
  const log = db.logs[date] ?? { checkin: null, workout: null, feedback: null }
  update(db, log)
  db.logs[date] = log
  save(db)
  return toState(db)
}

export function createLocalBackend(): Backend {
  const result = <T>(value: T) => Promise.resolve(value)
  const attempt = <T>(fn: () => T) => {
    try {
      return result(fn())
    } catch (error) {
      return Promise.reject(error)
    }
  }
  return {
    mode: 'local',
    getState: () => attempt(() => toState(load())),
    startProgram: () => attempt(() => {
      const db = load()
      db.programStartDate ??= cairoDate()
      save(db)
      return toState(db)
    }),
    saveCheckin: (date, input) => attempt(() => writeDay(date, (_db, log) => {
      const checkin = validateCheckin(input)
      if (typeof checkin === 'string') fail(400, checkin)
      log.checkin = checkin as CheckIn
    })),
    saveWorkout: (date, input) => attempt(() => writeDay(date, (_db, log) => {
      const workout = validateWorkout(input)
      if (typeof workout === 'string') return fail(400, workout)
      if (preferWorkout(log.workout, workout)) log.workout = workout
    })),
    saveFeedback: (date, input) => attempt(() => writeDay(date, (_db, log) => {
      if (!log.workout) fail(409, 'finish the workout before sending feedback')
      const feedback = validateFeedback(input)
      if (typeof feedback === 'string') fail(400, feedback)
      log.feedback = feedback as Feedback
    })),
    addMeasurement: (input) => attempt(() => {
      if (!isIsoDate(input.measuredOn) || input.measuredOn > cairoDate()) fail(400, 'measuredOn must be a date up to today')
      const values = validateMeasurementValues(input.values)
      if (typeof values === 'string') return fail(400, values)
      const db = load()
      const id = db.measurements.reduce((max, entry) => Math.max(max, entry.id), 0) + 1
      db.measurements.push({ id, measuredOn: input.measuredOn, values, note: input.note?.trim() || null, createdAt: new Date().toISOString() })
      save(db)
      return toState(db)
    }),
    markRewardCelebrated: (id) => attempt(() => {
      const db = load()
      const reward = db.rewards.find((item) => item.id === id)
      if (reward && reward.unlockedOn && !reward.celebratedAt) reward.celebratedAt = new Date().toISOString()
      save(db)
      return toState(db)
    }),
    addFood: (date, input) => attempt(() => {
      const db = load()
      const problem = checkFoodDate(date, cairoDate(), db.programStartDate, diffDays)
      if (problem) fail(400, problem)
      const entry = validateFood(input)
      if (typeof entry === 'string') return fail(400, entry)
      const list = db.foodEntries ?? []
      const id = list.reduce((max, item) => Math.max(max, item.id), 0) + 1
      db.foodEntries = [...list, { id, date, ...entry, createdAt: new Date().toISOString() }]
      save(db)
      return toState(db)
    }),
    deleteFood: (id) => attempt(() => {
      const db = load()
      const entry = (db.foodEntries ?? []).find((item) => item.id === id) ?? fail(404, 'food entry not found')
      const problem = checkFoodDate(entry.date, cairoDate(), db.programStartDate, diffDays)
      if (problem) fail(400, problem)
      db.foodEntries = (db.foodEntries ?? []).filter((item) => item.id !== id)
      save(db)
      return toState(db)
    }),
    generateReport: (kind, periodIndex) => attempt(() => {
      const db = load()
      const state = toState(db)
      const report = buildReport(state, kind, periodIndex)
      db.reports[reportKey(kind, periodIndex)] = report
      save(db)
      return { report, state: toState(db) }
    }),
    getReport: (kind, periodIndex) => attempt(() => load().reports[reportKey(kind, periodIndex)] ?? fail(404, 'report not found')),
  }
}
