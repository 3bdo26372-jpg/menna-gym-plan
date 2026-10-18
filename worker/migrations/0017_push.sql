-- Push notifications. The Worker makes its VAPID key pair the first time the
-- app asks for it (push_config), keeps each phone's subscription, and records
-- which reminders went out each day so none is sent twice.
CREATE TABLE IF NOT EXISTS push_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  public_key TEXT NOT NULL,
  private_jwk TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- sent_date is the Cairo day; key is a reminder kind or gift-<id>.
CREATE TABLE IF NOT EXISTS push_sent (
  sent_date TEXT NOT NULL,
  key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (sent_date, key)
);
