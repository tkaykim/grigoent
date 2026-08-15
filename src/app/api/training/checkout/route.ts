import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { foreignQuote } from '@/lib/paypal-fx'
import { verifyVisaPaymentRef } from '@/lib/visa-payment-ref'
import { evaluateDiscount } from '@/lib/discount'
import {
  TRAINING_PRODUCT_SLUG,
  buildDueDates,
  buildOrderNo,
  type TrainingPlan,
} from '@/lib/training-package'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

type Body = {
  planCode?: string
  // 어떤 상품을 결제할지. 생략하면 기존 트레이닝 패키지(하위호환).
  // 허용 목록에 있는 slug 만 받는다 — 임의 slug 로 비활성 상품을 팔 수 없게.
  productSlug?: string
  // deetz 비자 케이스에서 발급한 결제 링크 토큰. 있으면 주문을 그 케이스에 연결한다.
  ref?: string
  // 할인코드. 금액은 서버가 다시 계산하며 클라이언트가 보낸 할인액은 쓰지 않는다.
  discountCode?: string
  name?: string
  email?: string
  phone?: string
  nationality?: string
  preferredLang?: string
  memo?: string
  agreed?: boolean
}

const ALLOWED_PRODUCT_SLUGS = new Set([TRAINING_PRODUCT_SLUG, 'audition-fee'])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 결제 시작 전 주문과 회차별 청구 레코드를 만든다.
// 금액은 요청값을 신뢰하지 않고 DB의 요금제에서만 가져온다.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body

    const name = (body.name ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    const phone = (body.phone ?? '').trim()
    const nationality = (body.nationality ?? '').trim()
    const preferredLang = ['ko', 'en', 'ja'].includes(body.preferredLang ?? '') ? body.preferredLang! : 'ko'
    const planCode = (body.planCode ?? '').trim()

    if (!name || name.length > 80) {
      return NextResponse.json({ success: false, error: '이름을 입력해 주세요.' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email) || email.length > 160) {
      return NextResponse.json({ success: false, error: '이메일 형식을 확인해 주세요.' }, { status: 400 })
    }
    if (!body.agreed) {
      return NextResponse.json({ success: false, error: '결제 진행에 동의해 주세요.' }, { status: 400 })
    }

    const requestedSlug = (body.productSlug ?? '').trim() || TRAINING_PRODUCT_SLUG
    if (!ALLOWED_PRODUCT_SLUGS.has(requestedSlug)) {
      return NextResponse.json({ success: false, error: '판매 중인 상품을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 토큰이 있어도 결제는 막지 않는다. 검증에 실패하면 케이스 연결만 포기한다.
    // (링크 만료 때문에 결제를 못 하게 만들면 매출을 잃는다 — 연결은 나중에 수기로도 붙일 수 있다.)
    const ref = verifyVisaPaymentRef(body.ref)
    const visaApplicationId = ref && ref.productSlug === requestedSlug ? ref.applicationId : null

    const supabase = getSupabase()

    const { data: product, error: productError } = await supabase
      .from('training_products')
      .select('id, title, currency, is_active')
      .eq('slug', requestedSlug)
      .maybeSingle()

    if (productError || !product || !product.is_active) {
      return NextResponse.json({ success: false, error: '판매 중인 상품을 찾을 수 없습니다.' }, { status: 404 })
    }

    const { data: planRow, error: planError } = await supabase
      .from('training_price_plans')
      .select('*')
      .eq('product_id', product.id)
      .eq('code', planCode)
      .eq('is_active', true)
      .maybeSingle()

    if (planError || !planRow) {
      return NextResponse.json({ success: false, error: '결제 방식을 다시 선택해 주세요.' }, { status: 400 })
    }
    const plan = planRow as unknown as TrainingPlan

    // 할인 적용. 코드가 유효하지 않으면 결제를 막고 이유를 알린다
    // (조용히 정가로 진행하면 사용자는 할인이 먹은 줄 알고 결제한다).
    let discountAmount = 0
    let discountCode: string | null = null
    if ((body.discountCode ?? '').trim()) {
      const evaluated = await evaluateDiscount(supabase, {
        code: body.discountCode!,
        productSlug: requestedSlug,
        amount: plan.total_amount,
        email,
      })
      if (!evaluated.ok) {
        return NextResponse.json({ success: false, error: evaluated.error }, { status: 400 })
      }
      discountAmount = evaluated.discountAmount
      discountCode = evaluated.code.code
    }

    const totalAmount = plan.total_amount - discountAmount
    if (totalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: '할인 후 결제 금액이 0원이라 결제를 진행할 수 없습니다.' },
        { status: 400 },
      )
    }
    // 회차별 금액은 할인 후 총액을 나눠 담고, 나머지 원은 1회차에 붙인다.
    const perCharge = Math.floor(totalAmount / plan.installment_months)
    const firstCharge = totalAmount - perCharge * (plan.installment_months - 1)

    const now = new Date()
    const orderNo = buildOrderNo(now, randomBytes(3).toString('hex'))
    const dueDates = buildDueDates(now, plan.installment_months)

    const { data: order, error: orderError } = await supabase
      .from('training_orders')
      .insert({
        order_no: orderNo,
        product_id: product.id,
        plan_id: plan.id,
        customer_name: name,
        customer_email: email,
        customer_phone: phone || null,
        customer_nationality: nationality || null,
        preferred_lang: preferredLang,
        visa_application_id: visaApplicationId,
        pg_provider: 'toss',
        currency: plan.currency,
        total_amount: totalAmount,
        original_amount: plan.total_amount,
        discount_code: discountCode,
        discount_amount: discountAmount,
        installment_months: plan.installment_months,
        status: 'pending',
        memo: (body.memo ?? '').trim() || null,
        billing_customer_key: randomUUID(),
        next_billing_at: plan.installment_months > 1 ? `${dueDates[1]}T00:00:00+09:00` : null,
      })
      .select('id, order_no, billing_customer_key')
      .single()

    if (orderError || !order) {
      console.error('[training/checkout] order insert failed:', orderError)
      return NextResponse.json({ success: false, error: '주문 생성에 실패했습니다.' }, { status: 500 })
    }

    // 회차별 청구 레코드. 1회차만 지금 결제하고 나머지는 예정 상태로 둔다.
    const payments = dueDates.map((due, index) => ({
      order_id: order.id,
      sequence: index + 1,
      due_date: due,
      amount: index === 0 ? firstCharge : perCharge,
      currency: plan.currency,
      status: 'pending',
      pg_provider: index === 0 ? 'toss' : null,
      pg_order_id: index === 0 ? `${order.order_no}-1` : null,
    }))

    const { error: paymentsError } = await supabase.from('training_order_payments').insert(payments)
    if (paymentsError) {
      console.error('[training/checkout] payments insert failed:', paymentsError)
      await supabase.from('training_orders').delete().eq('id', order.id)
      return NextResponse.json({ success: false, error: '결제 정보 생성에 실패했습니다.' }, { status: 500 })
    }

    // 할인 슬롯 확보. 동시 요청이 한도를 넘기지 못하도록 DB 함수 안에서 원자적으로 처리한다.
    // 같은 이메일이 이미 슬롯을 갖고 있으면 그 슬롯을 재사용한다(결제 중단 후 재시도 허용).
    if (discountCode) {
      const { error: reserveError } = await supabase.rpc('reserve_training_discount', {
        p_code: discountCode,
        p_email: email,
        p_order_id: order.id,
        p_discount_amount: discountAmount,
      })
      if (reserveError) {
        await supabase.from('training_order_payments').delete().eq('order_id', order.id)
        await supabase.from('training_orders').delete().eq('id', order.id)
        const exhausted = String(reserveError.message ?? '').includes('DISCOUNT_EXHAUSTED')
        return NextResponse.json(
          {
            success: false,
            error: exhausted ? '이미 모두 사용된 할인코드입니다.' : '할인코드를 적용하지 못했습니다.',
          },
          { status: 400 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      orderNo: order.order_no,
      pgOrderId: `${order.order_no}-1`,
      amount: firstCharge,
      totalAmount,
      originalAmount: plan.total_amount,
      discountCode,
      discountAmount,
      installmentMonths: plan.installment_months,
      orderName:
        plan.installment_months > 1
          ? `${product.title} (${plan.label} 1/${plan.installment_months}회차)`
          : `${product.title} (${plan.label})`,
      customerKey: order.billing_customer_key,
      // PayPal은 원화를 지원하지 않아 외화로 청구된다. 사용자에게 미리 보여줄 견적.
      paypalQuote: foreignQuote(firstCharge),
    })
  } catch (error) {
    console.error('[training/checkout] unexpected error:', error)
    return NextResponse.json({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
