export type TossRecoveryAction = 'confirm' | 'finalize' | 'fail' | 'abandon' | 'wait'

export function tossRecoveryAction(status: string | null | undefined): TossRecoveryAction {
  if (status === 'IN_PROGRESS') return 'confirm'
  if (status === 'DONE') return 'finalize'
  if (status === 'ABORTED') return 'abandon'
  if (status === 'EXPIRED' || status === 'CANCELED') return 'fail'
  return 'wait'
}

export function missingPaymentExpired(createdAt: string | null | undefined, now = Date.now()): boolean {
  if (!createdAt) return false
  const timestamp = new Date(createdAt).getTime()
  return Number.isFinite(timestamp) && now - timestamp > 2 * 60 * 1000
}
