-- Period tracking: the day each period started and, once Menna marks it, its
-- last day. The next start is predicted from these (shared/period.ts).
CREATE TABLE IF NOT EXISTS periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date TEXT NOT NULL UNIQUE,
  end_date TEXT CHECK (end_date IS NULL OR end_date >= start_date),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
