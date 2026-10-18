import { cairoDate, cairoTime } from '../../shared/date'
import { dueReminders, type Reminder } from '../../shared/reminders'
import { loadState } from './db'
import { generateVapidKeys, sendPush, type PushSubscriptionInput, type VapidKeys } from './webpush'

/** Push services want a contact for the sender; the app's own address works. */
const SUBJECT = 'https://menna-gym-plan.vercel.app'

type Row = Record<string, unknown>

/** The VAPID keys, made and stored the first time they are needed. */
export async function vapidKeys(db: D1Database): Promise<VapidKeys> {
  const row = await db.prepare('SELECT public_key, private_jwk FROM push_config WHERE id = 1').first<Row>()
  if (row) return { publicKey: String(row.public_key), privateJwk: JSON.parse(String(row.private_jwk)) as JsonWebKey }
  const keys = await generateVapidKeys()
  await db.prepare('INSERT OR IGNORE INTO push_config (id, public_key, private_jwk) VALUES (1, ?, ?)').bind(keys.publicKey, JSON.stringify(keys.privateJwk)).run()
  // Another request may have stored its keys first; use whatever is stored.
  return vapidKeys(db)
}

export async function saveSubscription(db: D1Database, subscription: PushSubscriptionInput) {
  await db.prepare('INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?) ON CONFLICT (endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth')
    .bind(subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth).run()
}

export async function deleteSubscription(db: D1Database, endpoint: string) {
  await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run()
}

async function subscriptions(db: D1Database) {
  const { results } = await db.prepare('SELECT endpoint, p256dh, auth, created_at FROM push_subscriptions ORDER BY created_at').all<Row>()
  return results.map((row) => ({ endpoint: String(row.endpoint), keys: { p256dh: String(row.p256dh), auth: String(row.auth) }, createdAt: String(row.created_at) }))
}

/** Sends one notification to every phone; drops subscriptions the push service says are gone. */
export async function notifyAll(db: D1Database, reminder: Pick<Reminder, 'title' | 'body' | 'url'> & { tag?: string }, list?: PushSubscriptionInput[]) {
  const targets = list ?? await subscriptions(db)
  if (!targets.length) return 0
  const keys = await vapidKeys(db)
  const payload = JSON.stringify({ title: reminder.title, body: reminder.body, url: reminder.url, tag: reminder.tag })
  let delivered = 0
  for (const target of targets) {
    try {
      const response = await sendPush(target, payload, keys, SUBJECT)
      if (response.ok) delivered += 1
      else if (response.status === 404 || response.status === 410) await deleteSubscription(db, target.endpoint)
      else console.error('push failed', response.status, await response.text())
    } catch (error) {
      // One unreachable push service shouldn't stop the others.
      console.error('push failed', error)
    }
  }
  return delivered
}

/** Runs from the cron trigger: sends the reminders that are due right now. */
export async function sendDueReminders(db: D1Database, now = new Date()) {
  const targets = await subscriptions(db)
  if (!targets.length) return
  const today = cairoDate(now)
  const { results } = await db.prepare("SELECT key FROM push_sent WHERE sent_date = ? OR key LIKE 'gift-%'").bind(today).all<Row>()
  const sent = new Set(results.map((row) => String(row.key)))
  const state = await loadState(db, today)
  const due = dueReminders(state, cairoTime(now), sent, targets[0].createdAt)
  for (const reminder of due) {
    // Record it first, so a slow push service never leads to a second copy.
    await db.prepare('INSERT OR IGNORE INTO push_sent (sent_date, key) VALUES (?, ?)').bind(today, reminder.key).run()
    await notifyAll(db, { ...reminder, tag: reminder.key }, targets)
  }
}
