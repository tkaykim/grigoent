import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdminFromRequest } from '@/lib/admin-auth'

// 결제 주문 목록 (관리자). 환불 화면의 데이터 소스.
export async function GET(request: NextRequest) {
  const auth = await assertAdminFromRequest(request, 'training-orders')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status })
  }

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: orders, error } = await svc
    .from('training_orders')
    .select(
      'id, order_no, customer_name, customer_email, customer_phone, customer_nationality, currency, total_amount, paid_amount, status, pg_provider, visa_application_id, memo, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[admin/training-orders] list failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const orderIds = (orders ?? []).map((row) => row.id as string)
  const { data: payments } = orderIds.length
    ? await svc
        .from('training_order_payments')
        .select(
          'id, order_id, sequence, amount, currency, status, pg_provider, payment_key, paid_at, receipt_url, failure_reason',
        )
        .in('order_id', orderIds)
        .order('sequence', { ascending: true })
    : { data: [] }

  const byOrder = new Map<string, unknown[]>()
  for (const payment of payments ?? []) {
    const key = payment.order_id as string
    if (!byOrder.has(key)) byOrder.set(key, [])
    byOrder.get(key)!.push(payment)
  }

  return NextResponse.json({
    items: (orders ?? []).map((order) => ({
      ...order,
      payments: byOrder.get(order.id as string) ?? [],
    })),
  })
}
