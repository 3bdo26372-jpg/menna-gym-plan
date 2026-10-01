-- Day passes: a day she didn't train, marked as trained (100 points, counts as
-- an active day). The first is free; later ones cost calorie points, which
-- are derived from the food log and not stored.
CREATE TABLE IF NOT EXISTS day_passes (
  log_date TEXT PRIMARY KEY REFERENCES daily_logs (log_date),
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

ALTER TABLE daily_scores ADD COLUMN pass_points INTEGER NOT NULL DEFAULT 0;
