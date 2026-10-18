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

/** Where things stand on this phone; an existing subscription is re-sent so the API always has it. */
export async function pushStatus(api: PushApi): Promise<PushStatus> {
  if (!supported()) return isIos() && !isStandalone() ? 'install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'off'
  const subscription = await (await registration()).pushManager.getSubscription()
  if (!subscription) return 'off'
  await api.savePushSubscription(subscription.toJSON()).catch(() => undefined)
  return 'on'
}

/** Asks for permission (call it straight from a tap), subscribes, and sends a test notification. */
export async function enablePush(api: PushApi): Promise<PushStatus> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'
  const reg = await registration()
  const subscription = await reg.pushManager.getSubscription()
    ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(await api.pushKey()) })
  const json = subscription.toJSON()
  await api.savePushSubscription(json)
  await api.testPush(json)
  return 'on'
}
