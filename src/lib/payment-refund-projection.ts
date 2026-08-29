export function buildTrainingPaymentRefundProjection(params: {
  fullPaymentRefund: boolean
  completedAt: string
}) {
  return {
    status: params.fullPaymentRefund ? ('refunded' as const) : ('paid' as const),
    updated_at: params.completedAt,
    refund_lock_at: null,
  }
}
