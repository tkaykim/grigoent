import assert from 'node:assert/strict'
import test from 'node:test'
import { paypalSdkLocale, trainingRetryPath } from '../src/lib/training-checkout-client.ts'
import { createVisaPaymentRef, verifyVisaPaymentRef } from '../src/lib/visa-payment-ref.ts'

test('PayPal v5 uses underscore locale codes in every supported language', () => {
  assert.deepEqual(['en','ja','ko'].map(paypalSdkLocale), ['en_US','ja_JP','ko_KR'])
})

test('retry keeps the original product, personal reference and language', () => {
  const url = new URL(trainingRetryPath('audition-fee', 'token.with-signature', 'en'), 'https://www.grigoent.co.kr')
  assert.equal(url.pathname, '/audition-fee')
  assert.equal(url.searchParams.get('ref'), 'token.with-signature')
  assert.equal(url.searchParams.get('lang'), 'en')
  assert.equal(trainingRetryPath('monthly-training'), '/monthly-training')
  assert.equal(trainingRetryPath('monthly-training-100'), '/monthly-training-100')
  assert.equal(trainingRetryPath('https://evil.example'), '/training')
})

test('failure email references round-trip without disclosing customer details', () => {
  const previous = process.env.VISA_PAYMENT_LINK_SECRET
  process.env.VISA_PAYMENT_LINK_SECRET = 'test-only-visa-reference-key-not-production'
  try {
    const applicationId = '11111111-1111-4111-8111-111111111111'
    const token = createVisaPaymentRef(applicationId, 'audition-fee')
    assert.deepEqual(verifyVisaPaymentRef(token), { applicationId, productSlug: 'audition-fee' })
    assert.equal(verifyVisaPaymentRef(`${token}x`), null)
    assert.throws(() => createVisaPaymentRef('invalid', 'audition-fee'))
  } finally {
    if (previous === undefined) delete process.env.VISA_PAYMENT_LINK_SECRET
    else process.env.VISA_PAYMENT_LINK_SECRET = previous
  }
})
