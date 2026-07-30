import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// munchpeek_goods / theinashop 의 PayPal 연동과 동일한 방식(Client Credentials → Orders v2).
// 다만 금액은 클라이언트 값을 쓰지 않고 우리 DB의 회차 청구 레코드에서만 가져온다.

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const IS_SANDBOX = process.env.NEXT_PUBLIC_PAYPAL_SANDBOX === 'true'
const PAYPAL_API_URL = IS_SANDBOX ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'

// 결제 통화는 원화(KRW)가 원칙이다.
// PayPal 계정이 KRW를 지원하지 않는 경우에만 USD 환산으로 자동 폴백한다.
const KRW_TO_USD = Number(process.env.PAYPAL_KRW_TO_USD || '0.00075')
// KRW는 소수점을 쓰지 않는 통화라 정수로 보내야 한다.
const FORCE_USD = process.env.PAYPAL_FORCE_USD === 'true'

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

export async function POST(request: NextRequest) {
  try {
    const { pgOrderId, description } = (await request.json()) as { pgOrderId?: string; description?: string }
    if (!pgOrderId) {
      return NextResponse.json({ success: false, error: '주문 정보가 누락되었습니다.' }, { status: 400 })
    }
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      return NextResponse.json({ success: false, error: 'PayPal 설정이 완료되지 않았습니다.' }, { status: 500 })
    }

    const supabase = getSupabase()
    const { data: paymentRow } = await supabase
      .from('training_order_payments')
      .select('id, amount, status')
      .eq('pg_order_id', pgOrderId)
      .maybeSingle()

    if (!paymentRow) {
      return NextResponse.json({ success: false, error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }
    if (paymentRow.status === 'paid') {
      return NextResponse.json({ success: false, error: '이미 결제가 완료된 건입니다.' }, { status: 409 })
    }

    const krwAmount = paymentRow.amount as number
    const usdAmount = Math.round(krwAmount * KRW_TO_USD * 100) / 100
    if (!Number.isFinite(krwAmount) || krwAmount <= 0) {
      return NextResponse.json({ success: false, error: '결제 금액을 계산하지 못했습니다.' }, { status: 500 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://grigoent.co.kr'
    const accessToken = await getAccessToken()

    const createWith = async (currency: 'KRW' | 'USD') => {
      const value = currency === 'KRW' ? String(Math.round(krwAmount)) : usdAmount.toFixed(2)
      const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'PayPal-Request-Id': `${pgOrderId}-${currency}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: pgOrderId,
              description: (description || 'GRIGO training package').slice(0, 127),
              amount: { currency_code: currency, value },
            },
          ],
          application_context: {
            brand_name: 'GRIGO entertainment',
            landing_page: 'NO_PREFERENCE',
            user_action: 'PAY_NOW',
            return_url: `${siteUrl}/training/success`,
            cancel_url: `${siteUrl}/training/fail`,
          },
        }),
      })
      return { response, body: await response.json() }
    }

    let currency: 'KRW' | 'USD' = FORCE_USD ? 'USD' : 'KRW'
    let attempt = await createWith(currency)

    // 계정이 원화를 지원하지 않으면 USD 환산으로 한 번만 재시도한다.
    if (!attempt.response.ok && currency === 'KRW') {
      console.warn('[training/paypal] KRW rejected, retrying in USD:', attempt.body)
      currency = 'USD'
      attempt = await createWith(currency)
    }

    if (!attempt.response.ok) {
      console.error('[training/paypal] create order failed:', attempt.body)
      return NextResponse.json(
        { success: false, error: 'PayPal 주문 생성에 실패했습니다.' },
        { status: attempt.response.status },
      )
    }

    await supabase
      .from('training_order_payments')
      .update({ pg_provider: 'paypal', updated_at: new Date().toISOString() })
      .eq('id', paymentRow.id)

    return NextResponse.json({
      success: true,
      id: attempt.body.id,
      status: attempt.body.status,
      currency,
      chargedAmount: currency === 'KRW' ? Math.round(krwAmount) : usdAmount,
    })
  } catch (error) {
    console.error('[training/paypal] create order error:', error)
    return NextResponse.json({ success: false, error: '요청 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
