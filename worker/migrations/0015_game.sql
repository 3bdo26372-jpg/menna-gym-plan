-- The card game: one play per 5-day round (shared/game.ts). `cards` is a JSON
-- array of what was under each card; `prize` is the one she picked, in
-- Egyptian pounds (real money, not app points).
CREATE TABLE IF NOT EXISTS game_plays (
  round INTEGER PRIMARY KEY,
  log_date TEXT NOT NULL,
  pick INTEGER NOT NULL CHECK (pick BETWEEN 0 AND 2),
  cards TEXT NOT NULL,
  prize INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
