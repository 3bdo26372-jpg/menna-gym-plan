-- Her pills: when to remind her of each (times is a JSON array of "HH:MM",
-- one per slot: after breakfast, after lunch), until which day, and the ones
-- she ticked off.
CREATE TABLE IF NOT EXISTS pill_plan (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  times TEXT NOT NULL,
  until_date TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS pill_doses (
  log_date TEXT NOT NULL,
  slot INTEGER NOT NULL,
  taken_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (log_date, slot)
);
