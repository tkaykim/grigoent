// PayPal 외화 환산 정책.
//
// 원칙은 원화(KRW) 결제지만 PayPal은 KRW를 지원하지 않는다(CURRENCY_NOT_SUPPORTED).
// 그래서 외화로 청구하되, 환율은 항상 시장가보다 보수적으로(1단위당 원화를 적게) 잡아
// 실제 수취 원화가 정가보다 적어지지 않게 한다.
//
// 예) 시장 1USD = 1,449원인데 1,350으로 잡으면
//     400만원 → $2,963 → 시장 환산 약 4,293,000원 (정가 대비 +7%)
//
// 시장 환율이 PAYPAL_KRW_PER_USD 아래로 내려가면 손실이 발생하므로 주기적으로 점검한다.

// This checkout's rate is KRW per USD. A currency environment override must
// never relabel that USD amount as JPY/EUR/KRW.
export const PAYPAL_FOREIGN_CURRENCY = 'USD' as const
export const PAYPAL_KRW_PER_UNIT = Number(process.env.PAYPAL_KRW_PER_USD || '1350')

export type ForeignQuote = {
  currency: string
  amount: number
  krwPerUnit: number
  krwAmount: number
}

export function foreignQuote(krwAmount: number, krwPerUsd = PAYPAL_KRW_PER_UNIT): ForeignQuote | null {
  if (!Number.isSafeInteger(krwAmount) || krwAmount <= 0) return null
  if (!Number.isFinite(krwPerUsd) || krwPerUsd <= 0) return null
  // 절상해서 원 단위 손실까지 제거한다.
  const amount = Math.ceil(krwAmount / krwPerUsd)
  if (!Number.isSafeInteger(amount)) return null
  return { currency: PAYPAL_FOREIGN_CURRENCY, amount, krwPerUnit: krwPerUsd, krwAmount }
}

export function formatForeign(quote: ForeignQuote): string {
  return `${quote.currency} ${quote.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function storedPaypalQuote(metadata: unknown, sequence: number, krwAmount: number): ForeignQuote | null {
  const quote = (metadata as { paypal_quotes?: Record<string, ForeignQuote> } | null)?.paypal_quotes?.[String(sequence)]
  if (!quote || quote.currency !== 'USD' || quote.krwAmount !== krwAmount ||
      !Number.isFinite(quote.amount) || quote.amount <= 0 ||
      !Number.isFinite(quote.krwPerUnit) || quote.krwPerUnit <= 0) return null
  return quote
}

export function matchesPaypalAmount(amount: unknown, quote: Pick<ForeignQuote, 'currency' | 'amount'>): boolean {
  const value = amount as { currency_code?: string; value?: string } | null
  return value?.currency_code === quote.currency && typeof value.value === 'string' &&
    /^\d+(\.\d{1,2})?$/.test(value.value) && Number(value.value) === quote.amount
}

export function paypalCapturedCharge(raw: unknown): { currency: string; amount: number } | null {
  const capture = (raw as { purchase_units?: { payments?: { captures?: { status?: string; amount?: { currency_code?: string; value?: string } }[] } }[] } | null)
    ?.purchase_units?.[0]?.payments?.captures?.[0]
  const amount = Number(capture?.amount?.value)
  if (capture?.status !== 'COMPLETED' || capture.amount?.currency_code !== 'USD' || !Number.isFinite(amount) || amount <= 0) return null
  return { currency: 'USD', amount }
}
