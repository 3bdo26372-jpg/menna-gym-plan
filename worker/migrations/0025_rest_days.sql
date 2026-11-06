-- Rest days she chose herself (the weekly plan gives her 2 or 3 a week; see
-- shared/week.ts). Past days without a workout become rest days by
-- themselves, so only the ones she picks are stored.
CREATE TABLE IF NOT EXISTS rest_days (
  log_date TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
