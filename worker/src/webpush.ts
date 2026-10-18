/**
 * Web Push from the Worker with WebCrypto only: VAPID (RFC 8292) to sign each
 * request, and aes128gcm payload encryption (RFC 8188 + RFC 8291) so the
 * notification text travels inside the push.
 */

export interface PushSubscriptionInput {
  endpoint: string
  /** Base64url keys from PushSubscription.toJSON(). */
  keys: { p256dh: string; auth: string }
}

export interface VapidKeys {
  /** Base64url uncompressed P-256 point, handed to pushManager.subscribe(). */
  publicKey: string
  /** The private key as a JWK. */
  privateJwk: JsonWebKey
}

const encoder = new TextEncoder()

export function base64url(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let text = ''
  for (const byte of view) text += String.fromCharCode(byte)
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64url(text: string) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

async function hmac(key: Uint8Array, data: Uint8Array) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data))
}

/** A new VAPID key pair; the Worker makes one the first time and keeps it. */
export async function generateVapidKeys(): Promise<VapidKeys> {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
  const publicRaw = (await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer
  const privateJwk = (await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey
  return { publicKey: base64url(publicRaw), privateJwk }
}

/** The VAPID Authorization header for one push service (its origin is the audience). */
export async function vapidHeader(endpoint: string, keys: VapidKeys, subject: string, now = Date.now()) {
  const header = base64url(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = base64url(encoder.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 60 * 60, sub: subject })))
  const key = await crypto.subtle.importKey('jwk', keys.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  // WebCrypto returns the raw r||s signature that JWS ES256 expects.
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(`${header}.${claims}`))
  return `vapid t=${header}.${claims}.${base64url(signature)}, k=${keys.publicKey}`
}

const RECORD_SIZE = 4096

/** Encrypts a payload for one subscription (aes128gcm, a single record). */
export async function encryptPayload(subscription: PushSubscriptionInput, payload: string, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const uaPublic = fromBase64url(subscription.keys.p256dh)
  const authSecret = fromBase64url(subscription.keys.auth)
  const local = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
  const asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', local.publicKey)) as ArrayBuffer)
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  // The standard field is `public`; the Workers types spell it `$public`, the runtime reads `public`.
  const ecdh = { name: 'ECDH', public: uaKey } as unknown as Parameters<typeof crypto.subtle.deriveBits>[0]
  const shared = new Uint8Array(await crypto.subtle.deriveBits(ecdh, local.privateKey, 256))

  // RFC 8291: mix the auth secret and both public keys into the input keying material.
  const prkKey = await hmac(authSecret, shared)
  const ikm = await hmac(prkKey, concat(encoder.encode('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1])))
  // RFC 8188: the content key and nonce come from the salt and that keying material.
  const prk = await hmac(salt, ikm)
  const cek = (await hmac(prk, concat(encoder.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16)
  const nonce = (await hmac(prk, concat(encoder.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12)

  // One record: the payload, then the 0x02 delimiter that marks the last record.
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(encoder.encode(payload), new Uint8Array([2]))))
  const header = new Uint8Array(16 + 4 + 1 + asPublic.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, RECORD_SIZE)
  header[20] = asPublic.length
  header.set(asPublic, 21)
  return concat(header, ciphertext)
}

/** Sends one push. The status tells the caller whether the subscription is gone (404/410). */
export async function sendPush(subscription: PushSubscriptionInput, payload: string, keys: VapidKeys, subject: string) {
  const body = await encryptPayload(subscription, payload)
  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      authorization: await vapidHeader(subscription.endpoint, keys, subject),
      'content-encoding': 'aes128gcm',
      'content-type': 'application/octet-stream',
      ttl: String(4 * 60 * 60),
      urgency: 'normal',
    },
    body,
  })
}

/** Checks what the app sends to POST /api/push/subscribe. */
export function validateSubscription(input: unknown): PushSubscriptionInput | string {
  const fields = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const keys = fields.keys && typeof fields.keys === 'object' ? (fields.keys as Record<string, unknown>) : {}
  if (typeof fields.endpoint !== 'string' || !/^https:\/\/[^\s]+$/.test(fields.endpoint) || fields.endpoint.length > 1000) return 'endpoint must be an https URL'
  if (typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string' || !/^[\w-]+$/.test(keys.p256dh) || !/^[\w-]+$/.test(keys.auth)) return 'keys must be base64url'
  if (fromBase64url(keys.p256dh).length !== 65 || fromBase64url(keys.auth).length !== 16) return 'keys have the wrong length'
  return { endpoint: fields.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }
}
