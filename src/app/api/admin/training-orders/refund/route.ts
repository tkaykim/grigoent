import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdminFromRequest } from '@/lib/admin-auth'
import { tossSecretKey } from '@/lib/toss-keys'
import { notifyVisaCasePayment } from '@/lib/visa-payment-ref'

// 결제 취소·환불.
//
// 회차(training_order_payments) 단위로 취소한다. PG 취소가 성공한 뒤에만 DB를 바꾼다.
// 순서를 뒤집으면 "우리 DB는 환불됨인데 실제로는 돈이 안 나간" 상태가 생긴다.
//
// 부분환불은 토스만 지원한다. PayPal 은 원화가 아니라 외화로 청구돼서
// 원화 기준 부분환불 금액을 외화로 환산하면 환율 때문에 금액이 어긋난다 — 전액만 허용한다.

function getServiceRole() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

type Body = {
  paymentId?: string
  reason?: string
  /** 부분환불 금액(원). 생략하면 전액. 토스만 지원. */
  amount?: number
}

const PAYPAL_API_URL =
  process.env.NEXT_PUBLIC_PAYPAL_SANDBOX === 'true'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'

async function paypalAccessToken(): Promise<string> {
  const id = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!id || !secret) throw new Error('PayPal 키가 설정되지 않았습니다.')
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.error_description || 'PayPal 인증 실패')
  return data.access_token as string
}

export async function POST(request: NextRequest) {
  const auth = await assertAdminFromRequest(request, 'training-orders')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status })
  }

  try {
    const body = (await request.json()) as Body
    const paymentId = (body.paymentId ?? '').trim()
    const reason = (body.reason ?? '').trim() || '관리자 취소'
    if (!paymentId) {
      return NextResponse.json({ error: '결제 건을 선택해 주세요.' }, { status: 400 })
    }

    const svc = getServiceRole()
    const { data: payment, error: paymentError } = await svc
      .from('training_order_payments')
      .select('id, order_id, sequence, amount, status, pg_provider, payment_key, raw')
      .eq('id', paymentId)
      .maybeSingle()

    if (paymentError || !payment) {
      return NextResponse.json({ error: '결제 건을 찾을 수 없습니다.' }, { status: 404 })
    }
    if (payment.status !== 'paid') {
      return NextResponse.json({ error: '결제 완료 상태가 아닙니다.' }, { status: 400 })
    }

    const paidAmount = payment.amount as number
    const requested = Number.isFinite(body.amount) ? Math.floor(body.amount as number) : paidAmount
    if (requested <= 0 || requested > paidAmount) {
      return NextResponse.json({ error: '환불 금액을 확인해 주세요.' }, { status: 400 })
    }
    const isPartial = requested < paidAmount

    let pgResult: unknown = null

    // --- PG 취소 (실패하면 여기서 끝. DB는 건드리지 않는다) ---
    if (payment.pg_provider === 'toss') {
      if (!payment.payment_key) {
        return NextResponse.json({ error: '토스 결제키가 없어 취소할 수 없습니다.' }, { status: 400 })
      }
      const response = await fetch(
        `https://api.tosspayments.com/v1/payments/${payment.payment_key}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${tossSecretKey()}:`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            isPartial ? { cancelReason: reason, cancelAmount: requested } : { cancelReason: reason },
          ),
        },
      )
      pgResult = await response.json()
      if (!response.ok) {
        const message =
          (pgResult as { message?: string })?.message ?? '토스 결제 취소에 실패했습니다.'
        console.error('[training/refund] toss cancel failed:', pgResult)
        return NextResponse.json({ error: message }, { status: 502 })
      }
    } else if (payment.pg_provider === 'paypal') {
      if (isPartial) {
        return NextResponse.json(
          { error: 'PayPal 은 외화 결제라 부분환불을 지원하지 않습니다. 전액 환불만 가능합니다.' },
          { status: 400 },
        )
      }
      // 승인 시 payment_key 에 캡처 ID를 저장한다. 없으면 원본 응답에서 찾는다.
      const raw = payment.raw as
        | { purchase_units?: { payments?: { captures?: { id?: string }[] } }[] }
        | null
      const captureId =
        (payment.payment_key as string | null) ?? raw?.purchase_units?.[0]?.payments?.captures?.[0]?.id
      if (!captureId) {
        return NextResponse.json(
          { error: 'PayPal 캡처 ID를 찾을 수 없습니다. PayPal 콘솔에서 직접 환불해 주세요.' },
          { status: 400 },
        )
      }
      const token = await paypalAccessToken()
      const response = await fetch(`${PAYPAL_API_URL}/v2/payments/captures/${captureId}/refund`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_to_payer: reason.slice(0, 255) }),
      })
      pgResult = await response.json()
      if (!response.ok) {
        const message =
          (pgResult as { message?: string })?.message ?? 'PayPal 환불에 실패했습니다.'
        console.error('[training/refund] paypal refund failed:', pgResult)
        return NextResponse.json({ error: message }, { status: 502 })
      }
    } else {
      return NextResponse.json(
        { error: `자동 환불을 지원하지 않는 결제수단입니다: ${payment.pg_provider ?? '미상'}` },
        { status: 400 },
      )
    }

    // --- 여기부터는 실제로 돈이 나간 상태. DB 갱신 실패해도 환불은 유효하다. ---
    const refundedAt = new Date().toISOString()
    const remaining = paidAmount - requested

    await svc
      .from('training_order_payments')
      .update({
        // 부분환불이면 남은 금액이 있으므로 paid 를 유지하고 금액만 줄인다.
        status: isPartial ? 'paid' : 'refunded',
        amount: remaining,
        failure_reason: isPartial ? `부분환불 ${requested.toLocaleString('ko-KR')}원: ${reason}` : reason,
        raw: pgResult,
        updated_at: refundedAt,
      })
      .eq('id', payment.id)

    const { data: order } = await svc
      .from('training_orders')
      .select('id, order_no, total_amount, visa_application_id, discount_code')
      .eq('id', payment.order_id)
      .maybeSingle()

    const { data: paidRows } = await svc
      .from('training_order_payments')
      .select('amount')
      .eq('order_id', payment.order_id)
      .eq('status', 'paid')

    const newPaidAmount = (paidRows ?? []).reduce((sum, row) => sum + (row.amount as number), 0)

    await svc
      .from('training_orders')
      .update({
        paid_amount: newPaidAmount,
        status: newPaidAmount <= 0 ? 'refunded' : newPaidAmount >= (order?.total_amount ?? 0) ? 'completed' : 'active',
        updated_at: refundedAt,
      })
      .eq('id', payment.order_id)

    // 전액 환불이면 할인 슬롯을 돌려준다. 안 그러면 1회용 코드가 환불 후에도 소진된 채 남는다.
    if (order?.discount_code && newPaidAmount <= 0) {
      await svc.from('training_discount_redemptions').delete().eq('order_id', order.id)
    }

    // 전액 환불로 주문에 남은 결제가 없어졌을 때만 케이스에 알린다.
    // 부분환불은 여전히 "결제된 상태"라 케이스를 환불로 뒤집으면 오히려 틀린다.
    if (order?.visa_application_id && order.order_no && newPaidAmount <= 0) {
      await notifyVisaCasePayment({
        applicationId: order.visa_application_id as string,
        event: 'refunded',
        orderNo: order.order_no,
        provider: payment.pg_provider as 'toss' | 'paypal',
        amountKrw: requested,
        occurredAt: refundedAt,
        meta: { reason, sequence: payment.sequence },
      })
    }

    return NextResponse.json({
      success: true,
      refundedAmount: requested,
      remainingPaidAmount: newPaidAmount,
      partial: isPartial,
    })
  } catch (error) {
    console.error('[training/refund] unexpected error:', error)
    const message = error instanceof Error ? error.message : '환불 처리 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
