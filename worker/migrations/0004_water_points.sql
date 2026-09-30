-- Water points: earned from the water log (derived, not stored) and spent here
-- on a request, a surprise gift, or making up a finished day's score.
-- Requests and gifts start 'pending'; set status = 'done' (and done_at) once
-- fulfilled, or 'cancelled' to give the points back.
CREATE TABLE IF NOT EXISTS water_point_spends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('request', 'gift', 'makeup')),
  points INTEGER NOT NULL CHECK (points > 0),
  note TEXT,
  log_date TEXT REFERENCES daily_logs (log_date),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  done_at TEXT
);

-- Score points a day got from water points, included in `total`.
ALTER TABLE daily_scores ADD COLUMN makeup_points INTEGER NOT NULL DEFAULT 0;
