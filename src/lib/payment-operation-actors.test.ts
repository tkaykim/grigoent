import assert from 'node:assert/strict'
import test from 'node:test'

// Node's native TypeScript runner requires the extension at runtime.
// @ts-expect-error The project intentionally keeps allowImportingTsExtensions disabled.
import { validatePaymentOperationActors } from './payment-operation-actors.ts'

const requester = '11111111-1111-4111-8111-111111111111'
const approver = '22222222-2222-4222-8222-222222222222'

test('2인 승인 모드는 서로 다른 요청자와 승인자를 허용한다', () => {
  assert.equal(validatePaymentOperationActors({ executionMode: 'two_person', requestedBy: requester, approvedBy: approver }), null)
})

test('2인 승인 모드는 자기 승인을 거부한다', () => {
  assert.match(
    validatePaymentOperationActors({ executionMode: 'two_person', requestedBy: requester, approvedBy: requester }) ?? '',
    /달라야/,
  )
})

test('직접 실행 모드는 동일한 요청자와 승인자를 허용한다', () => {
  assert.equal(validatePaymentOperationActors({ executionMode: 'direct', requestedBy: requester, approvedBy: requester }), null)
})

test('직접 실행 모드는 누락되거나 서로 다른 실행자를 거부한다', () => {
  assert.match(validatePaymentOperationActors({ executionMode: 'direct', requestedBy: requester, approvedBy: approver }) ?? '', /동일한/)
  assert.match(validatePaymentOperationActors({ executionMode: 'direct', requestedBy: requester }) ?? '', /동일한/)
})
