import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyInstallmentToken } from '@/lib/training-installment-token'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// 분납 2회차 이후 결제 준비.
// 링크 토큰으로 회차를 특정하고, 결제 금액은 항상 DB 회차 레코드에서만 읽는다(클라이언트 값 신뢰 금지).
// pg_order_id 는 이 시점에 발급하며 이미 있으면 재사용해 멱등을 유지한다.
export async function POST(request: NextRequest) {
  try {
    const { token } = (await request.json()) as { token?: string }
    const paymentId = verifyInstallmentToken(token)
    if (!paymentId) {
      return NextResponse.json({ success: false, error: '유효하지 않은 결제 링크입니다.' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data: payment, error } = await supabase
      .from('training_order_payments')
      .select('id, order_id, sequence, amount, currency, status, due_date, pg_order_id')
      .eq('id', paymentId)
      .maybeSingle()

    if (error || !payment) {
      return NextResponse.json({ success: false, error: '결제 회차를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (payment.status === 'paid') {
      return NextResponse.json({ success: false, error: 'already_paid' }, { status: 409 })
    }

    const { data: order } = await supabase
      .from('training_orders')
      .select(
        'id, order_no, customer_name, customer_email, customer_phone, preferred_lang, installment_months, total_amount, paid_amount, billing_customer_key',
      )
      .eq('id', payment.order_id)
      .maybeSingle()

    if (!order) {
      return NextResponse.json({ success: false, error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    let pgOrderId = payment.pg_order_id as string | null
    if (!pgOrderId) {
      pgOrderId = `${order.order_no}-${payment.sequence}`
      const { error: updateError } = await supabase
        .from('training_order_payments')
        .update({ pg_order_id: pgOrderId, pg_provider: 'toss', updated_at: new Date().toISOString() })
        .eq('id', payment.id)
      if (updateError) {
        console.error('[training/installment/prepare] pg_order_id 발급 실패:', updateError)
        return NextResponse.json({ success: false, error: '결제 준비에 실패했습니다.' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      pgOrderId,
      orderNo: order.order_no,
      sequence: payment.sequence,
      installmentMonths: order.installment_months,
      amount: payment.amount,
      currency: payment.currency,
      dueDate: payment.due_date,
      totalAmount: order.total_amount,
      paidAmount: order.paid_amount ?? 0,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      customerKey: order.billing_customer_key,
      preferredLang: order.preferred_lang ?? 'ko',
    })
  } catch (err) {
    console.error('[training/installment/prepare] unexpected error:', err)
    return NextResponse.json({ success: false, error: '결제 준비 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
