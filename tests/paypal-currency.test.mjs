import assert from 'node:assert/strict'
import test from 'node:test'
import { foreignQuote, formatForeign, storedPaypalQuote, matchesPaypalAmount, paypalCapturedCharge } from '../src/lib/paypal-fx.ts'

test('USD quote covers each product and discount without fractional KRW', () => {
  for (const krw of [100, 1000, 100000, 99000, 1000000, 1400000, 4000000]) {
    const q = foreignQuote(krw, 1350)
    assert.equal(q.currency, 'USD')
    assert.equal(q.amount, Math.ceil(krw / 1350))
    assert.match(formatForeign(q), /^USD [\d,.]+\.00$/)
  }
  for (const amount of [0, -1, NaN, Infinity, 100.1]) assert.equal(foreignQuote(amount), null)
  for (const rate of [0, -1, NaN, Infinity]) assert.equal(foreignQuote(100000, rate), null)
})

test('stored checkout quote survives a later rate change', () => {
  const q = foreignQuote(100000, 1350)
  assert.equal(q.amount, 75)
  assert.notEqual(foreignQuote(100000, 1400).amount, 75)
  assert.deepEqual(storedPaypalQuote({ paypal_quotes: { 1: q } }, 1, 100000), q)
  assert.equal(storedPaypalQuote({ paypal_quotes: { 1: q } }, 2, 100000), null)
  assert.equal(storedPaypalQuote({ paypal_quotes: { 1: q } }, 1, 99000), null)
  assert.equal(storedPaypalQuote({ paypal_quotes: { 1: { ...q, currency: 'KRW' } } }, 1, 100000), null)
})

test('approval requires an exact currency and valid decimal amount', () => {
  const expected = { currency: 'USD', amount: 75 }
  for (const value of ['75', '75.0', '75.00']) assert(matchesPaypalAmount({ currency_code: 'USD', value }, expected))
  for (const currency_code of ['KRW', 'EUR', 'JPY', undefined]) assert(!matchesPaypalAmount({ currency_code, value: '75.00' }, expected))
  for (const value of ['74.99', '75.01', '75.001', '7.5e1', '', 'NaN', 75]) assert(!matchesPaypalAmount({ currency_code: 'USD', value }, expected))
})

test('receipt uses actual completed capture rather than current conversion rate', () => {
  const raw = { purchase_units: [{ payments: { captures: [{ status: 'COMPLETED', amount: { currency_code: 'USD', value: '75.00' } }] } }] }
  assert.deepEqual(paypalCapturedCharge(raw), { currency: 'USD', amount: 75 })
  raw.purchase_units[0].payments.captures[0].status = 'PENDING'
  assert.equal(paypalCapturedCharge(raw), null)
  assert.equal(paypalCapturedCharge({}), null)
})
