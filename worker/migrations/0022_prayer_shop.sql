-- The big prayer gift (every 4 kept weeks in a row, keyed by the week that
-- completed the run), the prayer shop's items and what she bought there.
CREATE TABLE IF NOT EXISTS prayer_big_gifts (
  week_start TEXT PRIMARY KEY,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  done_at TEXT
);

-- Edit these to change the shop; active = 0 hides an item.
CREATE TABLE IF NOT EXISTS prayer_shop_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎁',
  price INTEGER NOT NULL CHECK (price > 0),
  note_required INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO prayer_shop_items (id, title, emoji, price, note_required, sort_order) VALUES
  ('treat', 'حاجة حلوة تختاريها', '🍫', 150, 0, 1),
  ('request', 'طلب تكتبيه بنفسك', '✍️', 300, 1, 2),
  ('mat', 'سجادة صلاة جديدة', '🕌', 600, 0, 3),
  ('outing', 'خروجة تختاريها', '🎡', 1000, 0, 4);

CREATE TABLE IF NOT EXISTS prayer_shop_buys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  points INTEGER NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  done_at TEXT
);
