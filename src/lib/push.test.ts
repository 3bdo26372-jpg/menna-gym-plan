import { afterEach, describe, expect, it, vi } from 'vitest'
import { enablePush, pushStatus } from './push'

type Sub = { endpoint: string; toJSON: () => PushSubscriptionJSON; unsubscribe: () => Promise<boolean> }

function sub(endpoint: string): Sub {
  return { endpoint, toJSON: () => ({ endpoint, keys: { p256dh: 'p', auth: 'a' } }), unsubscribe: vi.fn(async () => true) }
}

/** A phone that supports push, with `existing` as the subscription it still holds. */
function phone(existing: Sub | null, permission: NotificationPermission = 'granted') {
  const fresh = sub('https://push.example/fresh')
  const pushManager = { getSubscription: vi.fn(async () => existing), subscribe: vi.fn(async () => fresh) }
  vi.stubGlobal('navigator', { userAgent: 'iPhone', standalone: true, serviceWorker: { register: async () => ({ pushManager }) } })
  vi.stubGlobal('window', { PushManager: class {}, Notification: class {}, matchMedia: () => ({ matches: true }) })
  vi.stubGlobal('Notification', { permission, requestPermission: async () => permission })
  return { pushManager, fresh }
}

function api(save: () => Promise<void> = async () => undefined) {
  return { pushKey: vi.fn(async () => 'AQAB'), savePushSubscription: vi.fn(save), testPush: vi.fn(async () => true) }
}

afterEach(() => vi.unstubAllGlobals())

describe('enablePush', () => {
  it('drops an old subscription and saves a fresh one', async () => {
    const old = sub('https://push.example/expired')
    const { fresh } = phone(old)
    const backend = api()
    expect(await enablePush(backend)).toBe('on')
    expect(old.unsubscribe).toHaveBeenCalled()
    expect(backend.savePushSubscription).toHaveBeenCalledWith(fresh.toJSON())
    expect(backend.testPush).toHaveBeenCalledWith(fresh.toJSON())
  })

  it('reports a refused permission without subscribing', async () => {
    const { pushManager } = phone(null, 'denied')
    expect(await enablePush(api())).toBe('denied')
    expect(pushManager.subscribe).not.toHaveBeenCalled()
  })
})

describe('pushStatus', () => {
  it('is on when the phone has a subscription the API accepts', async () => {
    phone(sub('https://push.example/ok'))
    expect(await pushStatus(api())).toBe('on')
  })

  it('shows the button again when the subscription cannot be saved', async () => {
    phone(sub('https://push.example/ok'))
    expect(await pushStatus(api(async () => { throw new Error('offline') }))).toBe('off')
  })

  it('is off when the phone has no subscription', async () => {
    phone(null)
    expect(await pushStatus(api())).toBe('off')
  })
})
