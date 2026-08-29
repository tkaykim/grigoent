import assert from 'node:assert/strict'
import test from 'node:test'

// Node 24's native TypeScript runner requires the extension at runtime.
// @ts-expect-error The project intentionally keeps allowImportingTsExtensions disabled.
import { signPaymentCommand, verifyPaymentCommand } from './payment-command-auth.ts'

test('payment command HMAC accepts an intact body inside the replay window', () => {
  const previous = process.env.PAYMENT_COMMAND_SECRET
  process.env.PAYMENT_COMMAND_SECRET = 'refund-test-secret-that-is-longer-than-thirty-two-characters'
  try {
    const now = Date.now()
    const timestamp = String(now)
    const body = JSON.stringify({ operationId: 'op-1', action: 'refund' })
    const signature = signPaymentCommand(body, timestamp)
    assert.equal(verifyPaymentCommand(body, timestamp, signature, now), true)
    assert.equal(verifyPaymentCommand(`${body} `, timestamp, signature, now), false)
    assert.equal(verifyPaymentCommand(body, timestamp, signature, now + 5 * 60 * 1000 + 1), false)
  } finally {
    if (previous === undefined) delete process.env.PAYMENT_COMMAND_SECRET
    else process.env.PAYMENT_COMMAND_SECRET = previous
  }
})
