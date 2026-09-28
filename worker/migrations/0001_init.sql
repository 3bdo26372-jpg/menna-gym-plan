-- Menna Flow schema (Cloudflare D1 / SQLite). One user, so no user_id columns.
-- Dates are Cairo calendar dates stored as 'YYYY-MM-DD'.

CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Cairo',
  program_start_date TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Original values, recorded once. Triggers make them read-only.
CREATE TABLE IF NOT EXISTS baseline_measurements (
  metric TEXT PRIMARY KEY,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TRIGGER IF NOT EXISTS baseline_is_read_only_update BEFORE UPDATE ON baseline_measurements
BEGIN SELECT RAISE(ABORT, 'baseline measurements are immutable'); END;
CREATE TRIGGER IF NOT EXISTS baseline_is_read_only_delete BEFORE DELETE ON baseline_measurements
BEGIN SELECT RAISE(ABORT, 'baseline measurements are immutable'); END;

-- Every new measurement is a new row; history is never overwritten.
CREATE TABLE IF NOT EXISTS measurement_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  measured_on TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS measurement_entries_by_date ON measurement_entries (measured_on);
CREATE TABLE IF NOT EXISTS measurement_values (
  entry_id INTEGER NOT NULL REFERENCES measurement_entries (id),
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  PRIMARY KEY (entry_id, metric)
);
CREATE TRIGGER IF NOT EXISTS measurement_entries_are_append_only BEFORE UPDATE ON measurement_entries
BEGIN SELECT RAISE(ABORT, 'measurement history is append-only'); END;
CREATE TRIGGER IF NOT EXISTS measurement_values_are_append_only BEFORE UPDATE ON measurement_values
BEGIN SELECT RAISE(ABORT, 'measurement history is append-only'); END;

-- One row per calendar day from the program start (created automatically).
CREATE TABLE IF NOT EXISTS daily_logs (
  log_date TEXT PRIMARY KEY,
  day_number INTEGER NOT NULL,
  checkin_json TEXT,
  checkin_at TEXT,
  feedback_json TEXT,
  feedback_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_date TEXT NOT NULL UNIQUE REFERENCES daily_logs (log_date),
  day_type TEXT NOT NULL,
  intensity TEXT NOT NULL,
  level INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'partial')),
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  planned_seconds INTEGER NOT NULL,
  active_seconds INTEGER NOT NULL,
  main_completion REAL NOT NULL,
  warmup_done INTEGER NOT NULL,
  cooldown_done INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  workout_id INTEGER NOT NULL REFERENCES workouts (id),
  position INTEGER NOT NULL,
  block TEXT NOT NULL,
  slot INTEGER NOT NULL,
  planned_exercise_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  planned_seconds INTEGER NOT NULL,
  completed_seconds INTEGER NOT NULL,
  switched INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (workout_id, position)
);
CREATE INDEX IF NOT EXISTS workout_exercises_by_exercise ON workout_exercises (exercise_id);

-- Favourite / hardest exercise picked in post-workout feedback.
CREATE TABLE IF NOT EXISTS exercise_feedback (
  log_date TEXT NOT NULL REFERENCES daily_logs (log_date),
  kind TEXT NOT NULL CHECK (kind IN ('favorite', 'hardest')),
  exercise_id TEXT NOT NULL,
  PRIMARY KEY (log_date, kind)
);

CREATE TABLE IF NOT EXISTS daily_scores (
  log_date TEXT PRIMARY KEY REFERENCES daily_logs (log_date),
  checkin_points INTEGER NOT NULL,
  workout_points INTEGER NOT NULL,
  warmup_cooldown_points INTEGER NOT NULL,
  feedback_points INTEGER NOT NULL,
  total INTEGER NOT NULL,
  computed_at TEXT NOT NULL
);

-- Reward titles/descriptions are editable placeholders.
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL,
  threshold_days INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reward_unlocks (
  reward_id TEXT PRIMARY KEY REFERENCES rewards (id),
  unlocked_on TEXT NOT NULL,
  celebrated_at TEXT
);

-- Saved report snapshots so old monthly PDFs can be re-created exactly.
CREATE TABLE IF NOT EXISTS monthly_reports (
  period_index INTEGER PRIMARY KEY,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  pdf_key TEXT
);
