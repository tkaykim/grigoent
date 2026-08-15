import type { SupabaseClient } from '@supabase/supabase-js'

// 할인코드 검증·계산.
//
// 금액은 언제나 서버가 DB 값으로 계산한다. 클라이언트가 보낸 할인액은 절대 쓰지 않는다.
// 검증 API 와 결제 생성(checkout)이 같은 함수를 쓰게 해서, 미리보기 금액과 실제 청구액이
// 갈라지지 않도록 한다.

export type DiscountCode = {
  id: string
  code: string
  display_name: string
  description: string | null
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  max_discount_amount: number | null
  min_order_amount: number
  max_uses: number | null
  product_slugs: string[] | null
  is_active: boolean
  starts_at: string | null
  expires_at: string | null
}

export type DiscountResult =
  | { ok: true; code: DiscountCode; discountAmount: number; finalAmount: number }
  | { ok: false; error: string }

const MESSAGES = {
  notFound: '사용할 수 없는 할인코드입니다.',
  inactive: '사용할 수 없는 할인코드입니다.',
  notStarted: '아직 사용할 수 없는 할인코드입니다.',
  expired: '유효기간이 지난 할인코드입니다.',
  productMismatch: '이 상품에는 사용할 수 없는 할인코드입니다.',
  minOrder: (min: number) => `${min.toLocaleString('ko-KR')}원 이상 결제 시 사용할 수 있습니다.`,
  exhausted: '이미 모두 사용된 할인코드입니다.',
}

// 존재하지 않는 코드와 비활성 코드의 메시지를 같게 둔다.
// 다르면 유효한 코드를 추측해 찾아낼 수 있다.
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase()
}

export function computeDiscount(code: DiscountCode, amount: number): number {
  if (code.discount_type === 'percentage') {
    const raw = Math.floor((amount * code.discount_value) / 100)
    const capped = code.max_discount_amount ? Math.min(raw, code.max_discount_amount) : raw
    return Math.min(capped, amount)
  }
  // 정액 할인이 결제 금액보다 크면 0원 결제가 되는데, PG 가 0원을 받지 못한다.
  // 결제 금액 전체를 넘지 않도록 자른다.
  return Math.min(code.discount_value, amount)
}

/**
 * 코드를 조회해 적용 가능 여부와 할인 금액을 계산한다.
 * 사용 슬롯 확보(예약)는 하지 않는다 — 그건 결제 생성 시점의 reserve_training_discount 가 한다.
 */
export async function evaluateDiscount(
  supabase: SupabaseClient,
  input: { code: string; productSlug: string; amount: number; email?: string },
): Promise<DiscountResult> {
  const normalized = normalizeCode(input.code)
  if (!normalized) return { ok: false, error: MESSAGES.notFound }

  const { data, error } = await supabase
    .from('training_discount_codes')
    .select('*')
    .eq('code', normalized)
    .maybeSingle()

  if (error || !data) return { ok: false, error: MESSAGES.notFound }
  const code = data as DiscountCode

  if (!code.is_active) return { ok: false, error: MESSAGES.inactive }

  const now = Date.now()
  if (code.starts_at && new Date(code.starts_at).getTime() > now) {
    return { ok: false, error: MESSAGES.notStarted }
  }
  if (code.expires_at && new Date(code.expires_at).getTime() < now) {
    return { ok: false, error: MESSAGES.expired }
  }
  if (code.product_slugs && code.product_slugs.length > 0 && !code.product_slugs.includes(input.productSlug)) {
    return { ok: false, error: MESSAGES.productMismatch }
  }
  if (input.amount < code.min_order_amount) {
    return { ok: false, error: MESSAGES.minOrder(code.min_order_amount) }
  }

  // 남은 사용 가능 횟수. 이미 슬롯을 가진 이메일이면 재사용이므로 한도를 보지 않는다.
  if (code.max_uses !== null) {
    const email = (input.email ?? '').trim().toLowerCase()
    let mine = false
    if (email) {
      const { data: existing } = await supabase
        .from('training_discount_redemptions')
        .select('id')
        .eq('code_id', code.id)
        .eq('customer_email', email)
        .maybeSingle()
      mine = Boolean(existing)
    }
    if (!mine) {
      const { count } = await supabase
        .from('training_discount_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('code_id', code.id)
      if ((count ?? 0) >= code.max_uses) {
        return { ok: false, error: MESSAGES.exhausted }
      }
    }
  }

  const discountAmount = computeDiscount(code, input.amount)
  return { ok: true, code, discountAmount, finalAmount: input.amount - discountAmount }
}

export function describeDiscount(code: DiscountCode): string {
  if (code.discount_type === 'percentage') {
    return code.max_discount_amount
      ? `${code.discount_value}% 할인 (최대 ${code.max_discount_amount.toLocaleString('ko-KR')}원)`
      : `${code.discount_value}% 할인`
  }
  return `${code.discount_value.toLocaleString('ko-KR')}원 할인`
}
