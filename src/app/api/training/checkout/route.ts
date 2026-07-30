import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { foreignQuote } from '@/lib/paypal-fx'
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
  name?: string
  email?: string
  phone?: string
  nationality?: string
  preferredLang?: string
  memo?: string
  agreed?: boolean
}

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

    const supabase = getSupabase()

    const { data: product, error: productError } = await supabase
      .from('training_products')
      .select('id, title, currency, is_active')
      .eq('slug', TRAINING_PRODUCT_SLUG)
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
        pg_provider: 'toss',
        currency: plan.currency,
        total_amount: plan.total_amount,
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
      amount: plan.amount_per_charge,
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

    return NextResponse.json({
      success: true,
      orderNo: order.order_no,
      pgOrderId: `${order.order_no}-1`,
      amount: plan.amount_per_charge,
      totalAmount: plan.total_amount,
      installmentMonths: plan.installment_months,
      orderName:
        plan.installment_months > 1
          ? `${product.title} (${plan.label} 1/${plan.installment_months}회차)`
          : `${product.title} (${plan.label})`,
      customerKey: order.billing_customer_key,
      // PayPal은 원화를 지원하지 않아 외화로 청구된다. 사용자에게 미리 보여줄 견적.
      paypalQuote: foreignQuote(plan.amount_per_charge),
    })
  } catch (error) {
    console.error('[training/checkout] unexpected error:', error)
    return NextResponse.json({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
