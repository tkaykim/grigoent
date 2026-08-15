import { createHmac } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { foreignQuote } from '@/lib/paypal-fx'

// 결제 완료 메일 발송 요청.
//
// 메일 발신은 contact@deetz.kr 로 통일한다(대표 지시). 그래서 여기서 직접 보내지 않고
// deetz 의 /api/payments/receipt 로 넘긴다 — SMTP 자격증명을 이 프로젝트에 복제하지 않기 위함.
// 서명은 비자 케이스 콜백과 같은 VISA_PAYMENT_LINK_SECRET 을 쓴다.
//
// 결제는 이미 끝난 뒤에 호출되므로 절대 throw 하지 않는다.
// 메일이 안 나갔다고 결제를 실패시키면 안 된다.

type Provider = 'toss' | 'paypal'

export async function sendPaymentReceipt(
  supabase: SupabaseClient,
  input: {
    paymentId: string
    orderId: string
    provider: Provider
    paidAmount: number
    paidAt: string
    receiptUrl?: string | null
  },
): Promise<boolean> {
  try {
    const secret = process.env.VISA_PAYMENT_LINK_SECRET
    if (!secret) {
      console.error('[payment-receipt] VISA_PAYMENT_LINK_SECRET 미설정 — 발송 생략')
      return false
    }

    // 멱등: 이미 보냈으면 다시 보내지 않는다.
    // 조건부 UPDATE 로 발송 권한을 선점해, 동시 요청에도 한 번만 나가게 한다.
    const { data: claimed } = await supabase
      .from('training_order_payments')
      .update({ receipt_sent_at: input.paidAt })
      .eq('id', input.paymentId)
      .is('receipt_sent_at', null)
      .select('id')
      .maybeSingle()

    if (!claimed) return false

    const { data: order } = await supabase
      .from('training_orders')
      .select(
        'order_no, customer_name, customer_email, preferred_lang, total_amount, original_amount, discount_code, discount_amount, visa_application_id, product_id',
      )
      .eq('id', input.orderId)
      .maybeSingle()

    if (!order?.customer_email || !order.order_no) {
      console.error('[payment-receipt] 주문 정보를 찾지 못해 발송 생략:', input.orderId)
      return false
    }

    const { data: product } = await supabase
      .from('training_products')
      .select('title')
      .eq('id', order.product_id)
      .maybeSingle()

    // PayPal 은 외화로 청구된다. 구매자가 카드 명세와 대조할 수 있게 실제 청구액을 함께 보낸다.
    const quote = input.provider === 'paypal' ? foreignQuote(input.paidAmount) : null

    const body = JSON.stringify({
      to: order.customer_email,
      customerName: order.customer_name || order.customer_email,
      lang: order.preferred_lang ?? 'ko',
      orderNo: order.order_no,
      productTitle: product?.title ?? '그리고 엔터테인먼트 상품',
      paidAmount: input.paidAmount,
      originalAmount: (order.original_amount as number | null) ?? order.total_amount,
      discountCode: order.discount_code ?? null,
      discountAmount: (order.discount_amount as number | null) ?? 0,
      provider: input.provider,
      foreignCharge: quote ? { currency: quote.currency, amount: quote.amount } : null,
      paidAt: input.paidAt,
      receiptUrl: input.receiptUrl ?? null,
      visaCaseUrl: order.visa_application_id ? 'https://deetz.kr/admin/visa' : null,
    })

    const base = (process.env.DEETZ_SITE_URL || 'https://deetz.kr').replace(/\/$/, '')
    const response = await fetch(`${base}/api/payments/receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-visa-signature': createHmac('sha256', secret).update(body).digest('base64url'),
      },
      body,
      signal: AbortSignal.timeout(12000),
    })

    if (!response.ok) {
      console.error('[payment-receipt] 발송 실패', order.order_no, response.status, await response.text())
      // 선점을 되돌려 다음 기회에 다시 보낼 수 있게 한다.
      await supabase
        .from('training_order_payments')
        .update({ receipt_sent_at: null })
        .eq('id', input.paymentId)
      return false
    }

    return true
  } catch (error) {
    console.error('[payment-receipt] 오류', input.paymentId, error)
    await supabase
      .from('training_order_payments')
      .update({ receipt_sent_at: null })
      .eq('id', input.paymentId)
      .then(() => undefined)
    return false
  }
}
