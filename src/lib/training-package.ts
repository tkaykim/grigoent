// 트레이닝 + 실무투입 패키지 판매 공용 타입/헬퍼.
// 상품·요금제 정본은 grigoent Supabase `training_products` / `training_price_plans` 이며,
// 금액은 서버가 항상 DB 값으로 재계산한다 (클라이언트 값 신뢰 금지).

export const TRAINING_PRODUCT_SLUG = 'training-and-placement'

export type TrainingPlan = {
  id: string
  code: string
  label: string
  plan_type: 'onetime' | 'installment'
  installment_months: number
  amount_per_charge: number
  total_amount: number
  currency: string
  note: string | null
  sort_order: number
}

export type TrainingProduct = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  highlights: string[]
  currency: string
}

export function formatKrw(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`
}

// 분납 회차 안내 문구 (예: "매월 1,400,000원 × 3회")
export function describePlan(plan: TrainingPlan): string {
  if (plan.plan_type === 'onetime') return `${formatKrw(plan.amount_per_charge)} 일시 결제`
  return `매월 ${formatKrw(plan.amount_per_charge)} × ${plan.installment_months}회`
}

// 첫 회차 결제 금액 (일시불이면 전액).
export function firstChargeAmount(plan: TrainingPlan): number {
  return plan.amount_per_charge
}

// 주문번호: GRT-YYMMDD-XXXXXX (사람이 읽기 쉬운 형태)
export function buildOrderNo(now: Date, random: string): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const yy = String(kst.getUTCFullYear()).slice(2)
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(kst.getUTCDate()).padStart(2, '0')
  return `GRT-${yy}${mm}${dd}-${random.toUpperCase()}`
}

// 회차별 청구 예정일: 1회차는 결제일, 이후 매월 같은 날.
export function buildDueDates(start: Date, months: number): string[] {
  const dates: string[] = []
  for (let i = 0; i < months; i += 1) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, start.getUTCDate()))
    // 말일 보정 (예: 1/31 + 1개월 → 2/28)
    if (d.getUTCDate() !== start.getUTCDate()) d.setUTCDate(0)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}
