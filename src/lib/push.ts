import type { Backend } from './backend'

/**
 * Push notifications on her phone. On an iPhone they only work once the app
 * is on the home screen and opened from there, and the permission prompt has
 * to come straight from a tap.
 */
export type PushStatus = 'unsupported' | 'install' | 'off' | 'denied' | 'on'

type PushApi = Pick<Backend, 'pushKey' | 'savePushSubscription' | 'testPush'>

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const registration = () => navigator.serviceWorker.register('/sw.js')

function keyBytes(base64url: string) {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64url.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

/**
 * Where things stand on this phone. An existing subscription is re-sent so the
 * API always has it; if that fails, the button shows again so she can redo it.
 */
export async function pushStatus(api: PushApi): Promise<PushStatus> {
  if (!supported()) return isIos() && !isStandalone() ? 'install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'off'
  try {
    const subscription = await (await registration()).pushManager.getSubscription()
    if (!subscription) return 'off'
    await api.savePushSubscription(subscription.toJSON())
    return 'on'
  } catch {
    return 'off'
  }
}

/**
 * Asks for permission (call it straight from a tap), makes a fresh subscription
 * and sends a test notification. An old subscription is dropped first: once the
 * push service has expired it, the phone can still hand it back, and every
 * reminder sent to it is lost.
 */
export async function enablePush(api: PushApi): Promise<PushStatus> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'
  const reg = await registration()
  const old = await reg.pushManager.getSubscription()
  if (old) await old.unsubscribe().catch(() => false)
  const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(await api.pushKey()) })
  const json = subscription.toJSON()
  await api.savePushSubscription(json)
  await api.testPush(json)
  return 'on'
}
