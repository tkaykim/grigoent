export type PaymentOperationExecutionMode = 'two_person' | 'direct'

export function validatePaymentOperationActors(input: {
  executionMode: PaymentOperationExecutionMode
  requestedBy?: string | null
  approvedBy?: string | null
}): string | null {
  if (input.executionMode === 'direct') {
    if (!input.requestedBy || !input.approvedBy || input.requestedBy !== input.approvedBy) {
      return '직접 실행은 동일한 요청자와 승인자가 필요합니다.'
    }
    return null
  }

  if (input.requestedBy && input.approvedBy && input.requestedBy === input.approvedBy) {
    return '요청자와 승인자는 달라야 합니다.'
  }

  return null
}
