-- Her own list of pills: she adds each one with its name and time, and
-- removes it when she stops (removed_on is the first day she no longer
-- takes it). Ticked pills are kept per pill.
CREATE TABLE IF NOT EXISTS pills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  time TEXT NOT NULL,
  added_on TEXT NOT NULL,
  removed_on TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS pill_taken (
  log_date TEXT NOT NULL,
  pill_id INTEGER NOT NULL REFERENCES pills (id),
  taken_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (log_date, pill_id)
);

-- The two fixed pills of the old plan, up to the day after its last day:
-- slot 0 (after breakfast) is pill 1 and slot 1 (after lunch) is pill 2.
INSERT OR IGNORE INTO pills (id, name, time, added_on, removed_on)
  SELECT 1, 'برشامة بعد الفطار', json_extract(times, '$[0]'), date(updated_at), COALESCE(date(until_date, '+1 day'), date('now', '+2 hours'))
  FROM pill_plan WHERE id = 1;
INSERT OR IGNORE INTO pills (id, name, time, added_on, removed_on)
  SELECT 2, 'برشامة بعد الغدا', json_extract(times, '$[1]'), date(updated_at), COALESCE(date(until_date, '+1 day'), date('now', '+2 hours'))
  FROM pill_plan WHERE id = 1;
INSERT OR IGNORE INTO pill_taken (log_date, pill_id, taken_at)
  SELECT log_date, slot + 1, taken_at FROM pill_doses WHERE slot IN (0, 1) AND EXISTS (SELECT 1 FROM pills WHERE id = slot + 1);

-- The breakfast pill has stopped; she goes on with the one after lunch, at
-- the same time, from today (Cairo). She can rename it or remove it.
INSERT OR IGNORE INTO pills (id, name, time, added_on)
  SELECT 3, 'برشامة بعد الغدا', json_extract(times, '$[1]'), date('now', '+2 hours')
  FROM pill_plan WHERE id = 1;
