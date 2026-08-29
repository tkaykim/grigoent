import assert from 'node:assert/strict'
import test from 'node:test'

// Node 24's native TypeScript runner requires the extension at runtime.
// @ts-expect-error The project intentionally keeps allowImportingTsExtensions disabled.
import { calculateRefundQuote, extractPayPalCapture, matchTossCancel } from './refund-calculation.ts'

test('Toss KRW payment supports repeated partial refunds and an exact final refund', () => {
  const first = calculateRefundQuote({
    originalLedgerAmount: 1_000_000,
    originalProviderAmount: 1_000_000,
    ledgerCurrency: 'KRW',
    providerCurrency: 'KRW',
    refundedLedgerAmount: 0,
    refundedProviderAmount: 0,
    requestedLedgerAmount: 300_000,
  })
  assert.equal(first.providerAmount, 300_000)
  assert.equal(first.full, false)

  const last = calculateRefundQuote({
    originalLedgerAmount: 1_000_000,
    originalProviderAmount: 1_000_000,
    ledgerCurrency: 'KRW',
    providerCurrency: 'KRW',
    refundedLedgerAmount: 300_000,
    refundedProviderAmount: 300_000,
    requestedLedgerAmount: 700_000,
  })
  assert.equal(last.providerAmount, 700_000)
  assert.equal(last.full, true)
  assert.equal(last.remainingProviderAfter, 0)
})

test('PayPal converts a KRW partial refund to the original capture currency', () => {
  const partial = calculateRefundQuote({
    originalLedgerAmount: 100_000,
    originalProviderAmount: 75,
    ledgerCurrency: 'KRW',
    providerCurrency: 'USD',
    refundedLedgerAmount: 0,
    refundedProviderAmount: 0,
    requestedLedgerAmount: 40_000,
  })
  assert.equal(partial.providerAmount, 30)
  assert.equal(partial.remainingProviderAfter, 45)

  const final = calculateRefundQuote({
    originalLedgerAmount: 100_000,
    originalProviderAmount: 75,
    ledgerCurrency: 'KRW',
    providerCurrency: 'USD',
    refundedLedgerAmount: 40_000,
    refundedProviderAmount: 30,
    requestedLedgerAmount: 60_000,
  })
  assert.equal(final.providerAmount, 45)
  assert.equal(final.full, true)
})

test('PayPal capture evidence is parsed without mutating the original payload', () => {
  const raw = { purchase_units: [{ payments: { captures: [{ id: 'CAPTURE-1', amount: { value: '75.00', currency_code: 'USD' } }] } }] }
  assert.deepEqual(extractPayPalCapture(raw), { id: 'CAPTURE-1', amount: 75, currency: 'USD' })
  assert.equal(raw.purchase_units[0].payments.captures[0].amount.value, '75.00')
})

test('Toss cancellation resolves the current refund by lastTransactionKey instead of array order', () => {
  const result = matchTossCancel({
    lastTransactionKey: 'new-refund',
    cancels: [
      { transactionKey: 'new-refund', cancelAmount: 200_000, cancelReason: 'customer request', cancelStatus: 'DONE' },
      { transactionKey: 'old-refund', cancelAmount: 100_000, cancelReason: 'customer request', cancelStatus: 'DONE' },
    ],
  }, { amount: 200_000, reason: 'customer request', useLastTransactionKey: true })
  assert.deepEqual(result, { match: { transactionKey: 'new-refund', status: 'DONE' }, ambiguous: false })
})

test('Toss reconciliation refuses an ambiguous amount and reason match', () => {
  const result = matchTossCancel({
    cancels: [
      { transactionKey: 'refund-1', cancelAmount: 100_000, cancelReason: 'customer request', cancelStatus: 'DONE' },
      { transactionKey: 'refund-2', cancelAmount: 100_000, cancelReason: 'customer request', cancelStatus: 'DONE' },
    ],
  }, { amount: 100_000, reason: 'customer request' })
  assert.deepEqual(result, { match: null, ambiguous: true })
})
