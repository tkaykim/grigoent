/**
 * Web Push subscription helper (skeleton).
 *
 * Backend pieces still required for end-to-end push:
 *   1. Generate VAPID keypair (e.g. `npx web-push generate-vapid-keys`)
 *      - NEXT_PUBLIC_VAPID_PUBLIC_KEY  (exposed to client)
 *      - VAPID_PRIVATE_KEY             (server only)
 *   2. Persist `PushSubscription` JSON per user in DB
 *   3. Server endpoint that sends pushes via `web-push` lib
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
  return out
}

export async function ensurePushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'default') return Notification.requestPermission()
  return Notification.permission
}

export async function subscribeToPush(
  vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
): Promise<PushSubscription | null> {
  if (!vapidPublicKey) {
    console.warn('[pwa] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set')
    return null
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  const perm = await ensurePushPermission()
  if (perm !== 'granted') return null

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing

  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return sub ? sub.unsubscribe() : false
}
