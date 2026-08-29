import assert from 'node:assert/strict'
import test from 'node:test'

// Regression: ISSUE-001 — completed Toss refunds tried to write a missing refunded_at column.
// Found by /qa on 2026-08-30.
// Report: .gstack/qa-reports/qa-report-www-deetz-kr-2026-08-30.md
// Node's native TypeScript runner requires the extension at runtime.
// @ts-expect-error The project intentionally keeps allowImportingTsExtensions disabled.
import { buildTrainingPaymentRefundProjection } from './payment-refund-projection.ts'

test('전액환불 투영은 실제 결제 스키마의 상태·잠금·수정시각만 갱신한다', () => {
  const completedAt = '2026-08-30T00:00:00.000Z'
  const patch = buildTrainingPaymentRefundProjection({ fullPaymentRefund: true, completedAt })

  assert.deepEqual(patch, {
    status: 'refunded',
    updated_at: completedAt,
    refund_lock_at: null,
  })
  assert.equal('refunded_at' in patch, false)
})

test('부분환불 투영은 결제 상태를 paid로 유지한다', () => {
  const completedAt = '2026-08-30T00:00:00.000Z'
  assert.deepEqual(buildTrainingPaymentRefundProjection({ fullPaymentRefund: false, completedAt }), {
    status: 'paid',
    updated_at: completedAt,
    refund_lock_at: null,
  })
})
