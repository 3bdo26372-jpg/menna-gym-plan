-- Her five prayers: one row per prayer she ticked (prayer is 0–4: Fajr, Dhuhr,
-- Asr, Maghrib, Isha) with when she prayed it, and the weekly gifts she opened.
CREATE TABLE IF NOT EXISTS prayers (
  log_date TEXT NOT NULL,
  prayer INTEGER NOT NULL CHECK (prayer BETWEEN 0 AND 4),
  prayed_at TEXT NOT NULL,
  PRIMARY KEY (log_date, prayer)
);

CREATE TABLE IF NOT EXISTS prayer_gifts (
  week_start TEXT PRIMARY KEY,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  done_at TEXT
);
