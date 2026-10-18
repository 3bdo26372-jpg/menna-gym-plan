-- Messages to push to her phone once, on the next cron run (every 15 minutes).
-- Send one with:
--   INSERT INTO push_messages (title, body) VALUES ('…', '…');
CREATE TABLE IF NOT EXISTS push_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  sent_at TEXT
);
