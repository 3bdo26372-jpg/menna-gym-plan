-- A pill can repeat every few hours (4, 6, 8 or 12), so she takes it more
-- than once a day; null is once a day, as every pill so far.
ALTER TABLE pills ADD COLUMN every_hours INTEGER;

-- Each of the day's doses is ticked on its own: slot 0 is the pill's own
-- time, then one every few hours after it. Every tick so far is slot 0.
CREATE TABLE pill_taken_slots (
  log_date TEXT NOT NULL,
  pill_id INTEGER NOT NULL REFERENCES pills (id),
  slot INTEGER NOT NULL DEFAULT 0,
  taken_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (log_date, pill_id, slot)
);
INSERT INTO pill_taken_slots (log_date, pill_id, slot, taken_at) SELECT log_date, pill_id, 0, taken_at FROM pill_taken;
DROP TABLE pill_taken;
ALTER TABLE pill_taken_slots RENAME TO pill_taken;
