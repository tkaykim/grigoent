import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyVisaCasePayment } from '@/lib/visa-payment-ref'
import { foreignQuote } from '@/lib/paypal-fx'

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const IS_SANDBOX = process.env.NEXT_PUBLIC_PAYPAL_SANDBOX === 'true'
const PAYPAL_API_URL = IS_SANDBOX ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function getAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) throw new Error('PayPal credentials not configured')
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${auth}` },
    body: 'grant_type=client_credentials',
  })
  if (!response.ok) {
    console.error('[training/paypal] auth failed:', await response.text())
    throw new Error('Failed to authenticate with PayPal')
  }
  const data = await response.json()
  return data.access_token as string
}

// PG 승인 이후의 DB 갱신은 실패해도 결제를 되돌릴 수 없다.
// 조용히 넘어가면 "돈은 들어왔는데 미결제로 보이는" 주문이 생기므로,
// 실패를 반드시 눈에 띄게 남긴다. 응답은 성공으로 준다 — 결제는 실제로 됐다.
function logPostPaymentFailure(step: string, orderNo: string | null, error: unknown) {
  if (!error) return
  console.error('[POST-PAYMENT-DB-FAILURE]', JSON.stringify({ step, orderNo, error }))
}

export async function POST(request: NextRequest) {
  try {
    const { paypalOrderId, pgOrderId } = (await request.json()) as {
      paypalOrderId?: string
      pgOrderId?: string
    }
    if (!paypalOrderId || !pgOrderId) {
      return NextResponse.json({ success: false, error: '결제 정보가 누락되었습니다.' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data: paymentRow } = await supabase
      .from('training_order_payments')
      .select('id, order_id, sequence, amount, status')
      .eq('pg_order_id', pgOrderId)
      .maybeSingle()

    if (!paymentRow) {
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

    const accessToken = await getAccessToken()

    // 캡처하기 전에 이 PayPal 주문이 정말 이 결제건(pgOrderId)의 것인지 확인한다.
    // 확인하지 않으면 싼 주문을 결제한 뒤 그 승인을 비싼 주문에 갖다 붙일 수 있다.
    // reference_id 는 create-order 에서 pgOrderId 로 심어둔 값이다.
    const lookupResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${paypalOrderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const lookupData = await lookupResponse.json()
    if (!lookupResponse.ok) {
      console.error('[training/paypal] order lookup failed:', lookupData)
      return NextResponse.json({ success: false, error: '결제 정보를 확인하지 못했습니다.' }, { status: 400 })
    }
    const referenceId = lookupData?.purchase_units?.[0]?.reference_id
    if (referenceId !== pgOrderId) {
      console.error('[training/paypal] reference_id mismatch — capture refused', {
        paypalOrderId,
        pgOrderId,
        referenceId,
      })
      return NextResponse.json({ success: false, error: '결제 정보가 일치하지 않습니다.' }, { status: 400 })
    }

    const captureResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    })
    const captureData = await captureResponse.json()

    if (!captureResponse.ok || captureData.status !== 'COMPLETED') {
      console.error('[training/paypal] capture failed:', captureData)
      await supabase
        .from('training_order_payments')
        .update({
          status: 'failed',
          failure_reason: captureData?.message ?? `paypal status ${captureData?.status ?? 'unknown'}`,
          raw: captureData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRow.id)
        .eq('status', 'pending')
      return NextResponse.json(
        { success: false, error: 'PayPal 결제 승인에 실패했습니다.' },
        { status: captureResponse.ok ? 400 : captureResponse.status },
      )
    }

    const captureDetails = captureData.purchase_units?.[0]?.payments?.captures?.[0]
    const paidAt = new Date().toISOString()

    // 실제로 승인된 금액이 우리가 청구하려던 금액과 같은지 확인한다.
    // 토스는 confirm 에서 대조하는데 PayPal 만 빠져 있었다.
    // 다르면 결제는 이미 승인된 상태이므로 막지 않고, 기록에 남겨 대사할 수 있게 한다.
    const capturedValue = Number(captureDetails?.amount?.value)
    const capturedCurrency = captureDetails?.amount?.currency_code as string | undefined
    const expected = foreignQuote(paymentRow.amount as number)
    const amountMismatch =
      Number.isFinite(capturedValue) &&
      expected != null &&
      capturedCurrency === expected.currency &&
      Math.abs(capturedValue - expected.amount) > 0.01

    if (amountMismatch) {
      console.error('[training/paypal] captured amount differs from expected', {
        pgOrderId,
        expected: `${expected!.amount} ${expected!.currency}`,
        captured: `${capturedValue} ${capturedCurrency}`,
      })
    }

    const { error: paidUpdateError } = await supabase
      .from('training_order_payments')
      .update({
        status: 'paid',
        pg_provider: 'paypal',
        payment_key: captureDetails?.id ?? captureData.id ?? null,
        paid_at: paidAt,
        failure_reason: amountMismatch
          ? `금액 불일치: 예상 ${expected!.amount} ${expected!.currency} / 실제 ${capturedValue} ${capturedCurrency}`
          : null,
        raw: captureData,
        updated_at: paidAt,
      })
      .eq('id', paymentRow.id)
    logPostPaymentFailure('payment_row_paid', pgOrderId ?? null, paidUpdateError)

    const { data: order } = await supabase
      .from('training_orders')
      .select('id, order_no, total_amount, installment_months, visa_application_id, discount_code')
      .eq('id', paymentRow.order_id)
      .maybeSingle()

    const { data: paidRows } = await supabase
      .from('training_order_payments')
      .select('amount')
      .eq('order_id', paymentRow.order_id)
      .eq('status', 'paid')

    const paidAmount = (paidRows ?? []).reduce((sum, row) => sum + (row.amount as number), 0)
    // 실제 승인액이 모자라면 완료로 올리지 않는다. 운영자가 대사하도록 남긴다.
    const shortPaid = amountMismatch && Number.isFinite(capturedValue) && expected != null && capturedValue < expected.amount
    const isComplete = order ? paidAmount >= order.total_amount && !shortPaid : false

    const { error: orderUpdateError } = await supabase
      .from('training_orders')
      .update({
        pg_provider: 'paypal',
        paid_amount: paidAmount,
        status: isComplete ? 'completed' : 'active',
        updated_at: paidAt,
      })
      .eq('id', paymentRow.order_id)
    logPostPaymentFailure('order_totals', order?.order_no ?? null, orderUpdateError)

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
        provider: 'paypal',
        amountKrw: paidAmount,
        occurredAt: paidAt,
        meta: { paypalTransactionId: captureDetails?.id ?? null, sequence: paymentRow.sequence },
      })
    }

    return NextResponse.json({
      success: true,
      orderNo: order?.order_no ?? null,
      sequence: paymentRow.sequence,
      installmentMonths: order?.installment_months ?? 1,
      paidAmount,
      totalAmount: order?.total_amount ?? paymentRow.amount,
      paypalTransactionId: captureDetails?.id ?? null,
    })
  } catch (error) {
    console.error('[training/paypal] capture error:', error)
    return NextResponse.json({ success: false, error: '결제 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
