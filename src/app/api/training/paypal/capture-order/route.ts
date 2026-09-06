import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyVisaCasePayment } from '@/lib/visa-payment-ref'
import { loadVisaDocumentProductSlug, syncPaidProgramOrderToDeetz } from '@/lib/visa-program-sync'
import { sendPaymentReceipt } from '@/lib/payment-receipt'
import { foreignQuote, matchesPaypalAmount, storedPaypalQuote } from '@/lib/paypal-fx'

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
      .select('id, order_id, sequence, amount, status, paid_at, provider_order_id')
      .eq('pg_order_id', pgOrderId)
      .maybeSingle()

    if (!paymentRow) {
      return NextResponse.json({ success: false, error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 멱등: 이미 승인된 회차라도 PG 승인 직후 서버가 중단됐을 수 있다.
    // 누적 결제 완료 여부를 다시 계산하고 deetz 동기화와 영수증 발송을 복구한다.
    if (paymentRow.status === 'paid') {
      const { data: paidOrder } = await supabase
        .from('training_orders')
        .select('id, product_id, order_no, total_amount, installment_months, visa_application_id, customer_name, customer_email, customer_phone, customer_nationality, preferred_lang')
        .eq('id', paymentRow.order_id)
        .maybeSingle()

      const { data: paidRows } = await supabase
        .from('training_order_payments')
        .select('amount')
        .eq('order_id', paymentRow.order_id)
        .eq('status', 'paid')

      const paidAmount = (paidRows ?? []).reduce((sum, row) => sum + (row.amount as number), 0)
      const isComplete = paidOrder ? paidAmount >= paidOrder.total_amount : false
      const productSlug = paidOrder && isComplete
        ? await loadVisaDocumentProductSlug(supabase, paidOrder.product_id as string)
        : null
      const recoveredAt = (paymentRow.paid_at as string | null) ?? new Date().toISOString()
      let documentIntakeReady = false

      if (paidOrder?.visa_application_id && paidOrder.order_no && isComplete) {
        const callbackSynced = await notifyVisaCasePayment({
          applicationId: paidOrder.visa_application_id as string,
          event: 'paid',
          orderNo: paidOrder.order_no,
          provider: 'paypal',
          amountKrw: paidAmount,
          occurredAt: recoveredAt,
          meta: { sequence: paymentRow.sequence, customerEmail: paidOrder.customer_email ?? null, recovered: true },
        })
        documentIntakeReady = Boolean(productSlug && callbackSynced)
      } else if (productSlug && paidOrder) {
        documentIntakeReady = Boolean(await syncPaidProgramOrderToDeetz(supabase, {
          id: paidOrder.id as string,
          orderNo: paidOrder.order_no as string,
          productId: paidOrder.product_id as string,
          visaApplicationId: null,
          customerName: paidOrder.customer_name as string | null,
          customerEmail: paidOrder.customer_email as string | null,
          customerPhone: paidOrder.customer_phone as string | null,
          customerNationality: paidOrder.customer_nationality as string | null,
          preferredLang: paidOrder.preferred_lang as string | null,
          provider: 'paypal',
          amountKrw: paidAmount,
          occurredAt: recoveredAt,
          meta: { sequence: paymentRow.sequence, recovered: true },
        }))
      }

      await sendPaymentReceipt(supabase, {
        paymentId: paymentRow.id as string,
        orderId: paymentRow.order_id as string,
        provider: 'paypal',
        paidAmount,
        paidAt: recoveredAt,
        receiptUrl: null,
      })

      return NextResponse.json({
        success: true,
        idempotent: true,
        orderNo: paidOrder?.order_no ?? null,
        sequence: paymentRow.sequence,
        installmentMonths: paidOrder?.installment_months ?? 1,
        paidAmount,
        totalAmount: paidOrder?.total_amount ?? paymentRow.amount,
        documentIntakeReady,
      })
    }
    if (['cancelled', 'refunded'].includes(paymentRow.status as string)) {
      return NextResponse.json(
        { success: false, error: '취소 또는 환불된 결제 요청입니다. 새 주문으로 진행해 주세요.' },
        { status: 409 },
      )
    }
    if (paymentRow.provider_order_id !== paypalOrderId) {
      return NextResponse.json({ success: false, error: '결제 정보가 일치하지 않습니다.' }, { status: 400 })
    }

    // 프로덕션에서 sandbox 승인 금지 — 돈이 안 움직이는데 '결제 완료'가 되는 것을 막는다.
    if (
      process.env.VERCEL_ENV === 'production' &&
      IS_SANDBOX &&
      process.env.PAYPAL_ALLOW_SANDBOX_IN_PROD !== 'true'
    ) {
      console.error('[training/paypal] BLOCKED: sandbox capture attempted in production', { pgOrderId })
      return NextResponse.json(
        { success: false, error: '결제 환경 설정 오류로 결제를 완료할 수 없습니다. 청구되지 않았습니다.' },
        { status: 503 },
      )
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
    if (referenceId !== pgOrderId || lookupData?.purchase_units?.length !== 1) {
      console.error('[training/paypal] reference_id mismatch — capture refused', {
        paypalOrderId,
        pgOrderId,
        referenceId,
      })
      return NextResponse.json({ success: false, error: '결제 정보가 일치하지 않습니다.' }, { status: 400 })
    }

    const { data: quoteOrder } = await supabase.from('training_orders').select('metadata').eq('id', paymentRow.order_id).maybeSingle()
    // Existing provider orders created before quote snapshots still undergo
    // an amount check. All new orders use the immutable checkout snapshot.
    const expected = storedPaypalQuote(quoteOrder?.metadata, paymentRow.sequence, paymentRow.amount as number)
      ?? (quoteOrder?.metadata?.paypal_quotes ? null : foreignQuote(paymentRow.amount as number))
    if (!expected || !matchesPaypalAmount(lookupData.purchase_units[0].amount, expected)) {
      return NextResponse.json({ success: false, code: 'PAYMENT_AMOUNT_MISMATCH', error: '결제 금액을 확인해야 합니다. 추가 결제를 진행하지 말고 문의해 주세요.' }, { status: 409 })
    }

    let captureOk = lookupData.status === 'COMPLETED'
    let captureStatus = 200
    let captureData = lookupData
    if (!captureOk) {
      try {
        const captureResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${paypalOrderId}/capture`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'PayPal-Request-Id': paymentRow.id },
          signal: AbortSignal.timeout(15000),
        })
        captureOk = captureResponse.ok
        captureStatus = captureResponse.status
        captureData = await captureResponse.json()
      } catch {
        captureOk = false
        captureStatus = 503
        captureData = { name: 'CAPTURE_RESULT_UNKNOWN' }
      }
      // A timeout or duplicate request can hide an already completed capture.
      // Read the PG result before reporting failure or offering another charge.
      if (!captureOk) {
        try {
          const retryLookup = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${paypalOrderId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal: AbortSignal.timeout(8000),
          })
          const latest = await retryLookup.json()
          if (retryLookup.ok && latest.status === 'COMPLETED') {
            captureData = latest
            captureOk = true
          }
        } catch { /* Keep the unknown outcome pending for a status recheck. */ }
      }
    }

    if (!captureOk && (captureStatus >= 500 || captureStatus === 429 || captureData?.details?.some((detail: { issue?: string }) => detail.issue === 'ORDER_ALREADY_CAPTURED'))) {
      return NextResponse.json({ success: false, state: 'waiting', code: 'PAYMENT_RESULT_PENDING' }, { status: 202 })
    }

    if (!captureOk || captureData.status !== 'COMPLETED') {
      console.error('[training/paypal] capture failed:', captureData)

      // PayPal 이 결제자의 카드·잔액을 거절한 경우(INSTRUMENT_DECLINED)는
      // 우리 잘못도, 되돌릴 수 없는 실패도 아니다. 결제자가 다른 결제수단을 고르면 된다.
      // 거절 사유 코드는 PayPal 이 가맹점에 주지 않으므로(발급사만 안다),
      // 화면에서는 "다른 수단으로 다시" 를 안내할 수 있게 코드만 넘긴다.
      const issue = (captureData?.details ?? []).find(
        (detail: { issue?: string }) => typeof detail?.issue === 'string',
      )?.issue as string | undefined
      const declined = issue === 'INSTRUMENT_DECLINED'

      await supabase
        .from('training_order_payments')
        .update({
          status: 'failed',
          failure_reason: issue ?? captureData?.message ?? `paypal status ${captureData?.status ?? 'unknown'}`,
          raw: captureData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRow.id)
        // 두 번째 실패도 기록해야 마지막 사유가 남는다. 승인된 건만 덮어쓰지 않는다.
        .in('status', ['pending', 'failed'])

      return NextResponse.json(
        {
          success: false,
          code: issue ?? null,
          // 결제자가 같은 화면에서 다른 결제수단으로 다시 시도할 수 있는 실패인지.
          recoverable: declined,
          error: declined
            ? '결제수단이 거절되었습니다. 다른 결제수단으로 다시 시도해 주세요.'
            : 'PayPal 결제 승인에 실패했습니다.',
        },
        { status: captureOk ? 400 : captureStatus },
      )
    }

    const captureDetails = captureData.purchase_units?.[0]?.payments?.captures?.[0]
    const paidAt = new Date().toISOString()

    // A provider anomaly after capture requires reconciliation, not another
    // charge or a false success at the expected amount.
    const amountMismatch = !matchesPaypalAmount(captureDetails?.amount, expected)

    if (captureDetails?.status !== 'COMPLETED' || amountMismatch) {
      console.error('[training/paypal] completed order requires reconciliation', pgOrderId)
      return NextResponse.json({ success: false, state: 'waiting', code: 'PAYMENT_REVIEW_REQUIRED' }, { status: 202 })
    }

    const { error: paidUpdateError } = await supabase
      .from('training_order_payments')
      .update({
        status: 'paid',
        pg_provider: 'paypal',
        payment_key: captureDetails?.id ?? captureData.id ?? null,
        paid_at: paidAt,
        failure_reason: null,
        raw: captureData,
        updated_at: paidAt,
      })
      .eq('id', paymentRow.id)
    logPostPaymentFailure('payment_row_paid', pgOrderId ?? null, paidUpdateError)

    const { data: order } = await supabase
      .from('training_orders')
      .select('id, product_id, order_no, total_amount, installment_months, visa_application_id, discount_code, customer_name, customer_email, customer_phone, customer_nationality, preferred_lang')
      .eq('id', paymentRow.order_id)
      .maybeSingle()

    const { data: paidRows } = await supabase
      .from('training_order_payments')
      .select('amount')
      .eq('order_id', paymentRow.order_id)
      .eq('status', 'paid')

    const paidAmount = (paidRows ?? []).reduce((sum, row) => sum + (row.amount as number), 0)
    const isComplete = order ? paidAmount >= order.total_amount : false

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

    const productSlug = order && isComplete
      ? await loadVisaDocumentProductSlug(supabase, order.product_id as string)
      : null
    let documentIntakeReady = false
    if (order?.visa_application_id && order.order_no && isComplete) {
      const callbackSynced = await notifyVisaCasePayment({
        applicationId: order.visa_application_id as string,
        event: 'paid',
        orderNo: order.order_no,
        provider: 'paypal',
        amountKrw: paidAmount,
        occurredAt: paidAt,
        meta: { paypalTransactionId: captureDetails?.id ?? null, sequence: paymentRow.sequence, customerEmail: order.customer_email ?? null },
      })
      documentIntakeReady = Boolean(productSlug && callbackSynced)
    } else if (productSlug && order) {
      documentIntakeReady = Boolean(await syncPaidProgramOrderToDeetz(supabase, {
        id: order.id as string,
        orderNo: order.order_no as string,
        productId: order.product_id as string,
        visaApplicationId: null,
        customerName: order.customer_name as string | null,
        customerEmail: order.customer_email as string | null,
        customerPhone: order.customer_phone as string | null,
        customerNationality: order.customer_nationality as string | null,
        preferredLang: order.preferred_lang as string | null,
        provider: 'paypal',
        amountKrw: paidAmount,
        occurredAt: paidAt,
        meta: { paypalTransactionId: captureDetails?.id ?? null, sequence: paymentRow.sequence },
      }))
    }

    // 결제 완료 메일은 케이스 동기화 뒤에 보낸다.
    // 구매자가 메일 링크를 바로 눌러도 deetz에서 케이스를 찾을 수 있게 하기 위함이다.
    await sendPaymentReceipt(supabase, {
      paymentId: paymentRow.id as string,
      orderId: paymentRow.order_id as string,
      provider: 'paypal',
      paidAmount: paidAmount,
      paidAt,
      receiptUrl: null,
    })

    return NextResponse.json({
      success: true,
      orderNo: order?.order_no ?? null,
      sequence: paymentRow.sequence,
      installmentMonths: order?.installment_months ?? 1,
      paidAmount,
      totalAmount: order?.total_amount ?? paymentRow.amount,
      documentIntakeReady,
      paypalTransactionId: captureDetails?.id ?? null,
    })
  } catch (error) {
    console.error('[training/paypal] capture error:', error)
    return NextResponse.json({ success: false, error: '결제 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
