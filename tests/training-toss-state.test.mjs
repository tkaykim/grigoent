import assert from 'node:assert/strict'
import test from 'node:test'
import { missingPaymentExpired, tossRecoveryAction } from '../src/lib/training-toss-state.ts'
import { parsePendingTossRecovery } from '../src/lib/training-payment-recovery-client.ts'
import { trainingPaymentFailureCopy } from '../src/lib/training-payment-failure.ts'

test('maps Toss states to recovery actions', () => {
  assert.equal(tossRecoveryAction('IN_PROGRESS'), 'confirm')
  assert.equal(tossRecoveryAction('DONE'), 'finalize')
  assert.equal(tossRecoveryAction('EXPIRED'), 'fail')
  assert.equal(tossRecoveryAction('ABORTED'), 'fail')
  assert.equal(tossRecoveryAction('CANCELED'), 'fail')
  assert.equal(tossRecoveryAction('READY'), 'wait')
  assert.equal(tossRecoveryAction(null), 'wait')
})

test('only expires a missing PG payment after two minutes', () => {
  const now = Date.parse('2026-08-24T07:00:00.000Z')
  assert.equal(missingPaymentExpired('2026-08-24T06:58:01.000Z', now), false)
  assert.equal(missingPaymentExpired('2026-08-24T06:57:59.000Z', now), true)
  assert.equal(missingPaymentExpired(null, now), false)
  assert.equal(missingPaymentExpired('invalid', now), false)
})

test('restores only complete browser recovery records', () => {
  const valid = {
    orderId: 'GRT-260824-TEST-1',
    orderNo: 'GRT-260824-TEST',
    customerKey: 'customer-key',
    amount: 100,
    totalAmount: 100,
    installmentMonths: 1,
    createdAt: '2026-08-24T07:00:00.000Z',
  }
  assert.deepEqual(parsePendingTossRecovery(JSON.stringify(valid)), valid)
  assert.equal(parsePendingTossRecovery('{broken'), null)
  assert.equal(parsePendingTossRecovery(JSON.stringify({ ...valid, customerKey: null })), null)
})

test('unsupported installment error explains the retry path and no charge', () => {
  const ko = trainingPaymentFailureCopy('NOT_SUPPORTED_INSTALLMENT_PLAN_CARD_OR_MERCHANT', 'ko')
  const en = trainingPaymentFailureCopy('NOT_SUPPORTED_INSTALLMENT_PLAN_CARD_OR_MERCHANT', 'en')

  assert.match(ko.message, /체크카드는 일시불/)
  assert.match(ko.message, /청구되지 않았습니다/)
  assert.match(en.message, /one-time payment/)
  assert.match(en.message, /not charged/)
})
