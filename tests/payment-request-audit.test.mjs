import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPaymentRequestAudit } from '../src/lib/payment-request-audit.ts'

function headers(values) {
  return new Headers(values)
}

test('stores stable pseudonymous identifiers without retaining the raw IP', () => {
  const input = headers({
    'x-forwarded-for': '203.0.113.42, 10.0.0.1',
    'user-agent': 'Example Browser/1.0',
  })
  const capturedAt = new Date('2026-09-01T10:00:00.000Z')
  const first = buildPaymentRequestAudit(input, capturedAt, 'test-secret')
  const second = buildPaymentRequestAudit(input, capturedAt, 'test-secret')

  assert.equal(first.ip_hash, second.ip_hash)
  assert.equal(first.request_fingerprint, second.request_fingerprint)
  assert.equal(JSON.stringify(first).includes('203.0.113.42'), false)
})

test('removes personal query parameters from the stored referrer', () => {
  const audit = buildPaymentRequestAudit(
    headers({ referer: 'https://www.grigoent.co.kr/audition-fee?ref=signed-personal-token&utm_source=email' }),
    new Date('2026-09-01T10:00:00.000Z'),
    'test-secret',
  )

  assert.equal(audit.referrer_path, 'https://www.grigoent.co.kr/audition-fee')
  assert.equal(JSON.stringify(audit).includes('signed-personal-token'), false)
})

test('returns null hashes when no server secret is available', () => {
  const audit = buildPaymentRequestAudit(
    headers({ 'x-forwarded-for': '203.0.113.42', 'user-agent': 'Example Browser/1.0' }),
    new Date('2026-09-01T10:00:00.000Z'),
    null,
  )

  assert.equal(audit.ip_hash, null)
  assert.equal(audit.request_fingerprint, null)
})
