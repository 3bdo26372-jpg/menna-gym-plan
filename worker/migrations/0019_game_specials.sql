-- Extra card-game rounds he gives her (shared/game.ts). Each one is open until
-- she plays it, and its three cards come from SPECIAL_DECKS for its kind.
-- Give another with:
--   INSERT INTO game_specials (kind) VALUES ('roses');
CREATE TABLE IF NOT EXISTS game_specials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('roses')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Three roses, three colours: she picks one.
INSERT INTO game_specials (kind) VALUES ('roses');
