import { computeDailyScore } from '../../shared/scoring'
import { dayNumberFor } from '../../shared/date'
import { newRewardUnlocks } from '../../shared/engine'
import { BASELINE_METRICS } from '../../shared/measurements'
import { DEFAULT_REWARDS, hideIfLocked } from '../../shared/rewards'
import type {
  AppState,
  CheckIn,
  DayRecord,
  ExerciseLog,
  Feedback,
  MeasurementEntry,
  MeasurementInput,
  WorkoutResult,
} from '../../shared/types'
import type { ReportData } from '../../shared/report'
import type { FoodCategory, FoodEntry, FoodInput } from '../../shared/food'
import type { ReportKind } from '../../shared/types'

type Row = Record<string, unknown>
const parse = <T>(value: unknown): T | null => (typeof value === 'string' && value ? (JSON.parse(value) as T) : null)
const now = () => new Date().toISOString()

/**
 * Seed the profile, baseline and reward placeholders the first time the API
 * runs. Every statement is INSERT OR IGNORE, so it never resets existing data.
 */
export async function ensureSeed(db: D1Database) {
  const profile = await db.prepare('SELECT id FROM profile WHERE id = 1').first()
  if (profile) return
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO profile (id, name, timezone) VALUES (1, 'Menna', 'Africa/Cairo')"),
    ...BASELINE_METRICS.map((metric) =>
      db.prepare('INSERT OR IGNORE INTO baseline_measurements (metric, value, unit) VALUES (?, ?, ?)').bind(metric.key, metric.value, metric.unit)),
    ...DEFAULT_REWARDS.map((reward) =>
      db.prepare('INSERT OR IGNORE INTO rewards (id, sort_order, threshold_days, title, description, emoji) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(reward.id, reward.sortOrder, reward.thresholdDays, reward.title, reward.description, reward.emoji)),
  ])
}

/** Make sure every calendar day from the start to today has a daily_logs row. */
async function ensureDays(db: D1Database, startDate: string, today: string) {
  const count = dayNumberFor(startDate, today)
  if (count < 1) return
  await db.prepare(`
    WITH RECURSIVE days(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM days WHERE n + 1 < ?2)
    INSERT OR IGNORE INTO daily_logs (log_date, day_number)
    SELECT date(?1, '+' || n || ' days'), n + 1 FROM days
  `).bind(startDate, count).run()
}

export async function loadState(db: D1Database, today: string): Promise<AppState> {
  await ensureSeed(db)
  const profile = await db.prepare('SELECT name, timezone, program_start_date FROM profile WHERE id = 1').first<Row>()
  const startDate = (profile?.program_start_date as string | null) ?? null
  if (startDate) await ensureDays(db, startDate, today)

  const [baseline, entries, values, logs, workouts, exercises, rewards, unlocks, reports, food] = await db.batch<Row>([
    db.prepare('SELECT metric, value, unit FROM baseline_measurements'),
    db.prepare('SELECT id, measured_on, note, created_at FROM measurement_entries ORDER BY measured_on, id'),
    db.prepare('SELECT entry_id, metric, value FROM measurement_values'),
    db.prepare('SELECT log_date, day_number, checkin_json, feedback_json FROM daily_logs WHERE log_date <= ? AND log_date >= ? ORDER BY log_date').bind(today, startDate ?? today),
    db.prepare('SELECT * FROM workouts'),
    db.prepare('SELECT * FROM workout_exercises ORDER BY workout_id, position'),
    db.prepare('SELECT * FROM rewards ORDER BY sort_order'),
    db.prepare('SELECT * FROM reward_unlocks'),
    db.prepare('SELECT kind, period_index, start_date, end_date, generated_at FROM reports ORDER BY kind, period_index'),
    db.prepare('SELECT id, log_date, eaten_at, category, item, quantity, ml, created_at FROM food_entries ORDER BY log_date, eaten_at, id'),
  ])

  const valuesByEntry = new Map<number, Record<string, number>>()
  for (const row of values.results) {
    const id = Number(row.entry_id)
    valuesByEntry.set(id, { ...valuesByEntry.get(id), [String(row.metric)]: Number(row.value) })
  }
  const measurements: MeasurementEntry[] = entries.results.map((row) => ({
    id: Number(row.id),
    measuredOn: String(row.measured_on),
    values: valuesByEntry.get(Number(row.id)) ?? {},
    note: (row.note as string | null) ?? null,
    createdAt: String(row.created_at),
  }))

  const exercisesByWorkout = new Map<number, ExerciseLog[]>()
  for (const row of exercises.results) {
    const id = Number(row.workout_id)
    const list = exercisesByWorkout.get(id) ?? []
    list.push({
      blockId: row.block as ExerciseLog['blockId'],
      slot: Number(row.slot),
      plannedExerciseId: String(row.planned_exercise_id),
      exerciseId: String(row.exercise_id),
      plannedSeconds: Number(row.planned_seconds),
      completedSeconds: Number(row.completed_seconds),
      switched: Boolean(row.switched),
    })
    exercisesByWorkout.set(id, list)
  }
  const workoutByDate = new Map<string, WorkoutResult>()
  for (const row of workouts.results) {
    workoutByDate.set(String(row.log_date), {
      dayType: row.day_type as WorkoutResult['dayType'],
      intensity: row.intensity as WorkoutResult['intensity'],
      level: Number(row.level),
      status: row.status as WorkoutResult['status'],
      startedAt: String(row.started_at),
      finishedAt: String(row.finished_at),
      plannedSeconds: Number(row.planned_seconds),
      activeSeconds: Number(row.active_seconds),
      mainCompletion: Number(row.main_completion),
      warmupDone: Boolean(row.warmup_done),
      cooldownDone: Boolean(row.cooldown_done),
      exercises: exercisesByWorkout.get(Number(row.id)) ?? [],
    })
  }

  const days: DayRecord[] = logs.results.map((row) => {
    const date = String(row.log_date)
    const parts = {
      checkin: parse<CheckIn>(row.checkin_json),
      workout: workoutByDate.get(date) ?? null,
      feedback: parse<Feedback>(row.feedback_json),
    }
    // Derived from the start date so it stays right even if the start date is corrected by hand.
    const dayNumber = startDate ? dayNumberFor(startDate, date) : Number(row.day_number)
    return { date, dayNumber, ...parts, score: computeDailyScore(parts) }
  })

  const unlockById = new Map(unlocks.results.map((row) => [String(row.reward_id), row]))
  return {
    today,
    profile: { name: String(profile?.name ?? 'Menna'), timezone: String(profile?.timezone ?? 'Africa/Cairo'), programStartDate: startDate },
    baseline: baseline.results.map((row) => ({ key: String(row.metric), value: Number(row.value), unit: String(row.unit) })),
    measurements,
    days,
    rewards: rewards.results.map((row) => hideIfLocked({
      id: String(row.id),
      thresholdDays: Number(row.threshold_days),
      title: String(row.title),
      description: String(row.description),
      emoji: String(row.emoji),
      sortOrder: Number(row.sort_order),
      unlockedOn: (unlockById.get(String(row.id))?.unlocked_on as string | undefined) ?? null,
      celebratedAt: (unlockById.get(String(row.id))?.celebrated_at as string | undefined) ?? null,
    })),
    reports: reports.results.map((row) => ({
      kind: row.kind as ReportKind,
      periodIndex: Number(row.period_index),
      startDate: String(row.start_date),
      endDate: String(row.end_date),
      generatedAt: String(row.generated_at),
    })),
    foodEntries: food.results.map((row): FoodEntry => ({
      id: Number(row.id),
      date: String(row.log_date),
      time: String(row.eaten_at),
      category: row.category as FoodCategory,
      item: String(row.item),
      quantity: (row.quantity as string | null) ?? null,
      ml: row.ml === null || row.ml === undefined ? null : Number(row.ml),
      createdAt: String(row.created_at),
    })),
  }
}

/** Store the day's score and unlock any rewards it earned. */
export async function refreshDerived(db: D1Database, state: AppState, date: string) {
  const day = state.days.find((item) => item.date === date)
  const statements: D1PreparedStatement[] = []
  if (day) {
    statements.push(db.prepare(`
      INSERT INTO daily_scores (log_date, checkin_points, workout_points, warmup_cooldown_points, feedback_points, total, computed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (log_date) DO UPDATE SET checkin_points = excluded.checkin_points, workout_points = excluded.workout_points,
        warmup_cooldown_points = excluded.warmup_cooldown_points, feedback_points = excluded.feedback_points,
        total = excluded.total, computed_at = excluded.computed_at
    `).bind(date, day.score.checkin, day.score.workout, day.score.warmupCooldown, day.score.feedback, day.score.total, now()))
  }
  for (const unlock of newRewardUnlocks(state.days, state.rewards)) {
    statements.push(db.prepare('INSERT OR IGNORE INTO reward_unlocks (reward_id, unlocked_on) VALUES (?, ?)').bind(unlock.id, unlock.unlockedOn))
  }
  if (statements.length) await db.batch(statements)
}

export async function startProgram(db: D1Database, date: string) {
  await ensureSeed(db)
  await db.prepare('UPDATE profile SET program_start_date = ? WHERE id = 1 AND program_start_date IS NULL').bind(date).run()
}

export async function saveCheckin(db: D1Database, date: string, checkin: CheckIn) {
  await db.prepare('UPDATE daily_logs SET checkin_json = ?, checkin_at = ?, updated_at = ? WHERE log_date = ?')
    .bind(JSON.stringify(checkin), checkin.at, now(), date).run()
}

export async function saveWorkout(db: D1Database, date: string, workout: WorkoutResult) {
  const existing = await db.prepare('SELECT id FROM workouts WHERE log_date = ?').bind(date).first<{ id: number }>()
  const statements: D1PreparedStatement[] = []
  if (existing) {
    statements.push(db.prepare('DELETE FROM workout_exercises WHERE workout_id = ?').bind(existing.id))
    statements.push(db.prepare('DELETE FROM workouts WHERE id = ?').bind(existing.id))
  }
  statements.push(db.prepare(`
    INSERT INTO workouts (log_date, day_type, intensity, level, status, started_at, finished_at, planned_seconds, active_seconds, main_completion, warmup_done, cooldown_done)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(date, workout.dayType, workout.intensity, workout.level, workout.status, workout.startedAt, workout.finishedAt,
    workout.plannedSeconds, workout.activeSeconds, workout.mainCompletion, workout.warmupDone ? 1 : 0, workout.cooldownDone ? 1 : 0))
  workout.exercises.forEach((item, position) => {
    statements.push(db.prepare(`
      INSERT INTO workout_exercises (workout_id, position, block, slot, planned_exercise_id, exercise_id, planned_seconds, completed_seconds, switched)
      VALUES ((SELECT id FROM workouts WHERE log_date = ?), ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(date, position, item.blockId, item.slot, item.plannedExerciseId, item.exerciseId, item.plannedSeconds, item.completedSeconds, item.switched ? 1 : 0))
  })
  await db.batch(statements)
}

export async function saveFeedback(db: D1Database, date: string, feedback: Feedback) {
  const statements = [
    db.prepare('UPDATE daily_logs SET feedback_json = ?, feedback_at = ?, updated_at = ? WHERE log_date = ?').bind(JSON.stringify(feedback), feedback.at, now(), date),
    db.prepare('DELETE FROM exercise_feedback WHERE log_date = ?').bind(date),
  ]
  if (feedback.favoriteExerciseId) {
    statements.push(db.prepare("INSERT INTO exercise_feedback (log_date, kind, exercise_id) VALUES (?, 'favorite', ?)").bind(date, feedback.favoriteExerciseId))
  }
  if (feedback.hardestExerciseId) {
    statements.push(db.prepare("INSERT INTO exercise_feedback (log_date, kind, exercise_id) VALUES (?, 'hardest', ?)").bind(date, feedback.hardestExerciseId))
  }
  await db.batch(statements)
}

export async function addMeasurement(db: D1Database, input: MeasurementInput) {
  const entry = await db.prepare('INSERT INTO measurement_entries (measured_on, note) VALUES (?, ?) RETURNING id')
    .bind(input.measuredOn, input.note ?? null).first<{ id: number }>()
  if (!entry) throw new Error('could not save measurement')
  await db.batch(Object.entries(input.values).map(([metric, value]) =>
    db.prepare('INSERT INTO measurement_values (entry_id, metric, value) VALUES (?, ?, ?)').bind(entry.id, metric, value)))
}

export async function markCelebrated(db: D1Database, id: string) {
  await db.prepare('UPDATE reward_unlocks SET celebrated_at = ? WHERE reward_id = ? AND celebrated_at IS NULL').bind(now(), id).run()
}

export async function saveReport(db: D1Database, report: ReportData) {
  await db.prepare(`
    INSERT INTO reports (kind, period_index, start_date, end_date, generated_at, summary_json) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (kind, period_index) DO UPDATE SET start_date = excluded.start_date, end_date = excluded.end_date,
      generated_at = excluded.generated_at, summary_json = excluded.summary_json
  `).bind(report.kind, report.periodIndex, report.startDate, report.endDate, report.generatedAt, JSON.stringify(report)).run()
}

export async function addFood(db: D1Database, date: string, food: Required<Pick<FoodInput, 'time' | 'category' | 'item'>> & { quantity: string | null; ml: number | null }) {
  await db.prepare('INSERT INTO food_entries (log_date, eaten_at, category, item, quantity, ml) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(date, food.time, food.category, food.item, food.quantity, food.ml).run()
}

export async function deleteFood(db: D1Database, id: number) {
  return (await db.prepare('DELETE FROM food_entries WHERE id = ?').bind(id).run()).meta.changes > 0
}

export async function foodDate(db: D1Database, id: number) {
  return (await db.prepare('SELECT log_date FROM food_entries WHERE id = ?').bind(id).first<{ log_date: string }>())?.log_date ?? null
}

export async function loadReport(db: D1Database, kind: ReportKind, periodIndex: number) {
  const row = await db.prepare('SELECT summary_json FROM reports WHERE kind = ? AND period_index = ?').bind(kind, periodIndex).first<{ summary_json: string }>()
  return row ? (JSON.parse(row.summary_json) as ReportData) : null
}
