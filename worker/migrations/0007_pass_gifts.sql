-- Gifted day passes: each one is an extra free pass, with a note shown to Menna
-- until she uses it. Give another with:
--   INSERT INTO pass_gifts (note) VALUES ('…');
CREATE TABLE IF NOT EXISTS pass_gifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO pass_gifts (note) VALUES ('عشان انتي قلب بابا وعجبته البوسه 💋');
