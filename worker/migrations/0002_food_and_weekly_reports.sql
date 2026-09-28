-- Food & drink log, and weekly + monthly reports.

CREATE TABLE IF NOT EXISTS food_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_date TEXT NOT NULL,
  eaten_at TEXT NOT NULL,              -- 'HH:MM' Cairo time
  category TEXT NOT NULL CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snack', 'drink')),
  item TEXT NOT NULL,
  quantity TEXT,
  ml INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS food_entries_by_date ON food_entries (log_date, eaten_at);

-- Reports are now keyed by kind ('week' | 'month') and period number.
CREATE TABLE IF NOT EXISTS reports (
  kind TEXT NOT NULL CHECK (kind IN ('week', 'month')),
  period_index INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  PRIMARY KEY (kind, period_index)
);
INSERT OR IGNORE INTO reports (kind, period_index, start_date, end_date, generated_at, summary_json)
SELECT 'month', period_index, start_date, end_date, generated_at, summary_json FROM monthly_reports;
DROP TABLE monthly_reports;
