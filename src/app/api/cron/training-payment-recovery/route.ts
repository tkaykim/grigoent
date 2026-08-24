import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recoverTrainingTossPayment } from '@/lib/training-toss-payment'

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

  const summary = { scanned: 0, paid: 0, failed: 0, waiting: 0, errors: 0 }
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
      } else {
        summary.waiting += 1
      }
    }
  }

  return NextResponse.json({ success: true, ...summary })
}
