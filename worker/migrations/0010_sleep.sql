-- Sleep for the night before each day: when Menna went to sleep and woke up
-- ("HH:MM", Cairo). Read by the daily tips (shared/tips.ts); not scored.
ALTER TABLE daily_logs ADD COLUMN slept_at TEXT;
ALTER TABLE daily_logs ADD COLUMN woke_at TEXT;
