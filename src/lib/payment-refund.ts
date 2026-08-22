import { createClient } from '@supabase/supabase-js'
import { tossSecretKey } from '@/lib/toss-keys'
import { notifyVisaCasePayment } from '@/lib/visa-payment-ref'

// 결제 취소·환불 코어.
//
// 관리자 화면(/api/admin/training-orders/refund)과 결제 점검 화면(/api/payment-test/refund)이
// 같은 로직을 쓴다. 취소 절차가 두 벌로 갈라지면 한쪽만 고쳐져
// "돈은 나갔는데 DB 는 결제완료" 같은 사고가 한쪽에서만 재발한다.
//
// 회차(training_order_payments) 단위로 취소한다. PG 취소가 성공한 뒤에만 DB를 바꾼다.
// 순서를 뒤집으면 "우리 DB는 환불됨인데 실제로는 돈이 안 나간" 상태가 생긴다.
//
// 부분환불은 토스만 지원한다. PayPal 은 원화가 아니라 외화로 청구돼서
// 원화 기준 부분환불 금액을 외화로 환산하면 환율 때문에 금액이 어긋난다 — 전액만 허용한다.

export type RefundResult =
  | { ok: true; refundedAmount: number; remainingPaidAmount: number; partial: boolean }
  | { ok: false; status: number; error: string }

function getServiceRole() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
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

export async function refundPayment(params: {
  paymentId: string
  reason: string
  /** 부분환불 금액(원). 생략하면 전액. 토스만 지원. */
  amount?: number
}): Promise<RefundResult> {
  const { paymentId, reason } = params
  const svc = getServiceRole()

  const { data: payment, error: paymentError } = await svc
    .from('training_order_payments')
    .select('id, order_id, sequence, amount, status, pg_provider, payment_key, raw')
    .eq('id', paymentId)
    .maybeSingle()

  if (paymentError || !payment) {
    return { ok: false, status: 404, error: '결제 건을 찾을 수 없습니다.' }
  }
  if (payment.status !== 'paid') {
    return { ok: false, status: 400, error: '결제 완료 상태가 아닙니다.' }
  }

  const paidAmount = payment.amount as number
  const requested = Number.isFinite(params.amount) ? Math.floor(params.amount as number) : paidAmount
  if (requested <= 0 || requested > paidAmount) {
    return { ok: false, status: 400, error: '환불 금액을 확인해 주세요.' }
  }
  const isPartial = requested < paidAmount

  // 같은 결제건에 환불 요청이 두 번 들어오면 PG 에 두 번 취소가 걸린다.
  // PG 를 부르기 전에 전용 잠금 컬럼으로 선점한다. 이미 처리 중이면 여기서 멈춘다.
  // (표시용 필드로 선점하면 부분환불 메모와 충돌해 2차 부분환불이 막힌다.)
  const { data: claimed } = await svc
    .from('training_order_payments')
    .update({ refund_lock_at: new Date().toISOString() })
    .eq('id', payment.id)
    .eq('status', 'paid')
    .is('refund_lock_at', null)
    .select('id')
    .maybeSingle()

  if (!claimed) {
    return {
      ok: false,
      status: 409,
      error: '이미 환불이 진행 중이거나 처리된 건입니다. 잠시 후 목록을 새로고침해 주세요.',
    }
  }

  // PG 호출이 실패하거나 환불이 끝나면 잠금을 푼다.
  const releaseClaim = async () => {
    await svc.from('training_order_payments').update({ refund_lock_at: null }).eq('id', payment.id)
  }
  let pgResult: unknown = null

  // --- PG 취소 (실패하면 여기서 끝. DB는 건드리지 않는다) ---
  if (payment.pg_provider === 'toss') {
    if (!payment.payment_key) {
      await releaseClaim()
      return { ok: false, status: 400, error: '토스 결제키가 없어 취소할 수 없습니다.' }
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
      const message = (pgResult as { message?: string })?.message ?? '토스 결제 취소에 실패했습니다.'
      console.error('[payment/refund] toss cancel failed:', pgResult)
      await releaseClaim()
      return { ok: false, status: 502, error: message }
    }
  } else if (payment.pg_provider === 'paypal') {
    if (isPartial) {
      await releaseClaim()
      return {
        ok: false,
        status: 400,
        error: 'PayPal 은 외화 결제라 부분환불을 지원하지 않습니다. 전액 환불만 가능합니다.',
      }
    }
    // 승인 시 payment_key 에 캡처 ID를 저장한다. 없으면 원본 응답에서 찾는다.
    const raw = payment.raw as
      | { purchase_units?: { payments?: { captures?: { id?: string }[] } }[] }
      | null
    const captureId =
      (payment.payment_key as string | null) ?? raw?.purchase_units?.[0]?.payments?.captures?.[0]?.id
    if (!captureId) {
      await releaseClaim()
      return {
        ok: false,
        status: 400,
        error: 'PayPal 캡처 ID를 찾을 수 없습니다. PayPal 콘솔에서 직접 환불해 주세요.',
      }
    }
    const token = await paypalAccessToken()
    const response = await fetch(`${PAYPAL_API_URL}/v2/payments/captures/${captureId}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        // 같은 캡처에 대한 재요청이 두 번 환불되지 않게 한다.
        'PayPal-Request-Id': `refund-${captureId}`,
      },
      body: JSON.stringify({ note_to_payer: reason.slice(0, 255) }),
    })
    pgResult = await response.json()
    if (!response.ok) {
      const message = (pgResult as { message?: string })?.message ?? 'PayPal 환불에 실패했습니다.'
      console.error('[payment/refund] paypal refund failed:', pgResult)
      await releaseClaim()
      return { ok: false, status: 502, error: message }
    }
  } else {
    await releaseClaim()
    return {
      ok: false,
      status: 400,
      error: `자동 환불을 지원하지 않는 결제수단입니다: ${payment.pg_provider ?? '미상'}`,
    }
  }

  // --- 여기부터는 실제로 돈이 나간 상태. ---
  const refundedAt = new Date().toISOString()
  const remaining = paidAmount - requested

  // 전액 환불이면 amount 를 건드리지 않는다.
  // training_order_payments 에 CHECK (amount > 0) 이 있어서 0 으로 내리면 갱신이 통째로 실패하고,
  // 그러면 "돈은 나갔는데 DB 는 결제완료" 상태가 되어 운영자가 PG 에서 한 번 더 환불하게 된다.
  // 얼마가 환불됐는지는 status='refunded' 와 raw.refund 로 알 수 있다.
  const paymentPatch = isPartial
    ? {
        status: 'paid',
        amount: remaining,
        failure_reason: `부분환불 ${requested.toLocaleString('ko-KR')}원: ${reason}`,
      }
    : { status: 'refunded', failure_reason: reason }

  const { error: paymentUpdateError } = await svc
    .from('training_order_payments')
    .update({
      ...paymentPatch,
      // 승인 원본을 덮어쓰지 않는다 — PayPal 캡처 ID 등 근거가 사라진다.
      raw: { ...(payment.raw as Record<string, unknown> | null), refund: pgResult },
      updated_at: refundedAt,
    })
    .eq('id', payment.id)

  if (paymentUpdateError) {
    // 환불은 이미 성공했다. 운영자가 다시 누르지 않도록 그 사실을 분명히 알린다.
    console.error('[payment/refund] payment row update failed AFTER pg refund:', paymentUpdateError)
    await releaseClaim()
    return {
      ok: false,
      status: 500,
      error:
        `PG 환불은 완료되었으나 기록 갱신에 실패했습니다. 다시 환불하지 마세요. ` +
        `결제건 ${payment.id} / 환불 ${requested.toLocaleString('ko-KR')}원 — 개발자에게 알려주세요.`,
    }
  }

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
      status:
        newPaidAmount <= 0
          ? 'refunded'
          : newPaidAmount >= (order?.total_amount ?? 0)
            ? 'completed'
            : 'active',
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

  await releaseClaim()

  return {
    ok: true,
    refundedAmount: requested,
    remainingPaidAmount: newPaidAmount,
    partial: isPartial,
  }
}
