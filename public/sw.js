/*
 * Service worker: shows the push reminders the API sends (worker/src/push.ts)
 * and opens the app on the right page when she taps one. It doesn't cache
 * anything, so the app always loads fresh.
 */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(self.registration.showNotification(data.title || 'Menna Flow', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag,
    lang: 'ar',
    dir: 'rtl',
    data: { url: data.url || '/#/today' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/#/today', self.location.origin).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
    if (open) {
      await open.focus()
      return open.navigate(url)
    }
    return self.clients.openWindow(url)
  })())
})
