import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tossSecretKey } from '@/lib/toss-keys'
import { notifyVisaCasePayment } from '@/lib/visa-payment-ref'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

type Body = {
  paymentKey?: string
  orderId?: string
  amount?: number
}

// 토스 결제 승인 → 회차 결제 레코드 확정.
// 금액은 DB의 청구 레코드와 대조해 위변조를 막고, paymentKey 기준으로 멱등 처리한다.
export async function POST(request: NextRequest) {
  try {
    const { paymentKey, orderId, amount } = (await request.json()) as Body
    if (!paymentKey || !orderId || typeof amount !== 'number') {
      return NextResponse.json({ success: false, error: '결제 정보가 누락되었습니다.' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data: paymentRow, error: paymentError } = await supabase
      .from('training_order_payments')
      .select('id, order_id, sequence, amount, status, payment_key')
      .eq('pg_order_id', orderId)
      .maybeSingle()

    if (paymentError || !paymentRow) {
      return NextResponse.json({ success: false, error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 멱등: 이미 승인된 회차면 그대로 성공 응답.
    if (paymentRow.status === 'paid') {
      const { data: paidOrder } = await supabase
        .from('training_orders')
        .select('order_no')
        .eq('id', paymentRow.order_id)
        .maybeSingle()
      return NextResponse.json({ success: true, idempotent: true, orderNo: paidOrder?.order_no ?? null })
    }

    if (paymentRow.amount !== amount) {
      console.error('[training/confirm] amount mismatch', { expected: paymentRow.amount, received: amount })
      return NextResponse.json({ success: false, error: '결제 금액이 일치하지 않습니다.' }, { status: 400 })
    }

    const secretKey = tossSecretKey()
    if (!secretKey) {
      return NextResponse.json({ success: false, error: '결제 설정이 완료되지 않았습니다.' }, { status: 500 })
    }

    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId, amount, paymentKey }),
    })
    const tossData = await tossResponse.json()

    if (!tossResponse.ok) {
      console.error('[training/confirm] toss confirm failed:', tossData)
      await supabase
        .from('training_order_payments')
        .update({
          status: 'failed',
          failure_reason: tossData?.message ?? 'toss confirm failed',
          raw: tossData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRow.id)
      return NextResponse.json(
        { success: false, error: tossData?.message || '결제 승인에 실패했습니다.', code: tossData?.code },
        { status: tossResponse.status },
      )
    }

    const paidAt = new Date().toISOString()
    await supabase
      .from('training_order_payments')
      .update({
        status: 'paid',
        pg_provider: 'toss',
        payment_key: paymentKey,
        paid_at: paidAt,
        receipt_url: tossData?.receipt?.url ?? null,
        raw: tossData,
        updated_at: paidAt,
      })
      .eq('id', paymentRow.id)

    const { data: order } = await supabase
      .from('training_orders')
      .select(
        'id, order_no, total_amount, installment_months, customer_name, customer_email, visa_application_id, discount_code',
      )
      .eq('id', paymentRow.order_id)
      .maybeSingle()

    const { data: paidRows } = await supabase
      .from('training_order_payments')
      .select('amount')
      .eq('order_id', paymentRow.order_id)
      .eq('status', 'paid')

    const paidAmount = (paidRows ?? []).reduce((sum, row) => sum + (row.amount as number), 0)
    const isComplete = order ? paidAmount >= order.total_amount : false

    await supabase
      .from('training_orders')
      .update({
        paid_amount: paidAmount,
        status: isComplete ? 'completed' : 'active',
        updated_at: paidAt,
      })
      .eq('id', paymentRow.order_id)

    // 할인코드를 쓴 주문이면 사용 이력을 확정 처리한다(예약 → 확정).
    if (order?.discount_code) {
      await supabase
        .from('training_discount_redemptions')
        .update({ confirmed_at: paidAt, updated_at: paidAt })
        .eq('order_id', paymentRow.order_id)
    }

    // deetz 케이스에서 발급한 링크로 결제한 건이면 그쪽 케이스에도 결제 완료를 반영한다.
    // 실패해도 결제는 이미 승인됐으므로 응답을 막지 않는다.
    if (order?.visa_application_id && order.order_no) {
      await notifyVisaCasePayment({
        applicationId: order.visa_application_id as string,
        event: 'paid',
        orderNo: order.order_no,
        provider: 'toss',
        amountKrw: paidAmount,
        occurredAt: paidAt,
        meta: { paymentKey, sequence: paymentRow.sequence, receiptUrl: tossData?.receipt?.url ?? null },
      })
    }

    return NextResponse.json({
      success: true,
      orderNo: order?.order_no ?? null,
      sequence: paymentRow.sequence,
      installmentMonths: order?.installment_months ?? 1,
      paidAmount,
      totalAmount: order?.total_amount ?? amount,
      receiptUrl: tossData?.receipt?.url ?? null,
    })
  } catch (error) {
    console.error('[training/confirm] unexpected error:', error)
    return NextResponse.json({ success: false, error: '결제 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
