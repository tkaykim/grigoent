import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recoverTrainingTossPayment } from '@/lib/training-toss-payment'
import { syncPaidProgramOrderToDeetz } from '@/lib/visa-program-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`)
}

// 토스는 IN_PROGRESS 상태에 웹훅을 보내지 않는다.
// successUrl 복귀가 끊겨도 인증 유효시간 안에 서버가 PG 원장을 확인하고 승인을 마친다.
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const since = new Date(Date.now() - 40 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('training_order_payments')
    .select('pg_order_id')
    .eq('status', 'pending')
    .eq('pg_provider', 'toss')
    .not('pg_order_id', 'is', null)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    console.error('[training/payment-recovery-cron] pending query failed', error)
    return NextResponse.json({ success: false, error: 'query_failed' }, { status: 500 })
  }

  const summary = { scanned: 0, paid: 0, failed: 0, abandoned: 0, waiting: 0, errors: 0, visaLinked: 0 }
  const rows = data ?? []

  // PG 호출 폭주를 막고 한 요청 실패가 다른 결제 복구를 막지 않게 5건씩 처리한다.
  for (let index = 0; index < rows.length; index += 5) {
    const batch = rows.slice(index, index + 5)
    const results = await Promise.allSettled(
      batch.map((row) => recoverTrainingTossPayment({ orderId: String(row.pg_order_id) })),
    )

    for (const result of results) {
      summary.scanned += 1
      if (result.status === 'rejected') {
        summary.errors += 1
        console.error('[training/payment-recovery-cron] recovery failed', result.reason)
      } else if (result.value.body.state === 'paid') {
        summary.paid += 1
      } else if (result.value.body.state === 'failed') {
        summary.failed += 1
      } else if (result.value.body.state === 'abandoned') {
        summary.abandoned += 1
      } else {
        summary.waiting += 1
      }
    }
  }

  // 결제 당시 deetz 링크가 없었던 기존 프로그램 구매자도 비자 서류 케이스에 연결한다.
  // external_training_order_id 와 주문의 visa_application_id 가 양쪽에서 중복 실행을 막는다.
  const { data: qualifyingProducts } = await supabase
    .from('training_products')
    .select('id')
    .in('slug', ['training-and-placement', 'monthly-training', 'monthly-training-100'])
  const qualifyingProductIds = (qualifyingProducts ?? []).map((product) => String(product.id))
  const unlinkedQuery = supabase
    .from('training_orders')
    .select('id, product_id, order_no, customer_name, customer_email, customer_phone, customer_nationality, preferred_lang, pg_provider, paid_amount, visa_application_id, updated_at')
    .eq('status', 'completed')
    .is('visa_application_id', null)
    .order('updated_at', { ascending: true })
    .limit(20)
  const { data: unlinkedOrders, error: unlinkedError } = qualifyingProductIds.length > 0
    ? await unlinkedQuery.in('product_id', qualifyingProductIds)
    : { data: [], error: null }
  if (unlinkedError) {
    summary.errors += 1
    console.error('[training/payment-recovery-cron] unlinked visa query failed', unlinkedError)
  } else {
    for (const order of unlinkedOrders ?? []) {
      const linked = await syncPaidProgramOrderToDeetz(supabase, {
        id: String(order.id),
        orderNo: String(order.order_no),
        productId: String(order.product_id),
        visaApplicationId: null,
        customerName: order.customer_name as string | null,
        customerEmail: order.customer_email as string | null,
        customerPhone: order.customer_phone as string | null,
        customerNationality: order.customer_nationality as string | null,
        preferredLang: order.preferred_lang as string | null,
        provider: order.pg_provider === 'paypal' ? 'paypal' : 'toss',
        amountKrw: Number(order.paid_amount ?? 0),
        occurredAt: String(order.updated_at ?? new Date().toISOString()),
        meta: { reconciled: true },
      })
      if (linked) summary.visaLinked += 1
    }
  }

  return NextResponse.json({ success: true, ...summary })
}
