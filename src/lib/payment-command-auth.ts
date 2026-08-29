import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000

function secret(): string | null {
  const value = process.env.PAYMENT_COMMAND_SECRET?.trim()
  return value && value.length >= 32 ? value : null
}

export function signPaymentCommand(rawBody: string, timestamp: string): string {
  const value = secret()
  if (!value) throw new Error('PAYMENT_COMMAND_SECRET must contain at least 32 characters.')
  return createHmac('sha256', value).update(`${timestamp}.${rawBody}`).digest('hex')
}

export function verifyPaymentCommand(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  now = Date.now(),
): boolean {
  const value = secret()
  if (!value || !timestamp || !signature || !/^\d{13}$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(signature)) {
    return false
  }
  if (Math.abs(now - Number(timestamp)) > MAX_CLOCK_SKEW_MS) return false
  const expected = createHmac('sha256', value).update(`${timestamp}.${rawBody}`).digest('hex')
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
}
