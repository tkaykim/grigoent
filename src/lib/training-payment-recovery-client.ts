export const PAYMENT_RECOVERY_STORAGE_KEY = 'grigo:pending-toss-payment:v1'

export type PendingTossRecovery = {
  orderId: string
  orderNo: string
  customerKey: string
  amount: number
  totalAmount: number
  installmentMonths: number
  createdAt: string
}

export function parsePendingTossRecovery(value: string | null): PendingTossRecovery | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<PendingTossRecovery>
    if (
      typeof parsed.orderId !== 'string' ||
      typeof parsed.orderNo !== 'string' ||
      typeof parsed.customerKey !== 'string' ||
      typeof parsed.amount !== 'number' ||
      typeof parsed.totalAmount !== 'number' ||
      typeof parsed.installmentMonths !== 'number' ||
      typeof parsed.createdAt !== 'string'
    ) {
      return null
    }
    return parsed as PendingTossRecovery
  } catch {
    return null
  }
}
