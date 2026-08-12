import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// 구매자 본인 결제 내역 조회.
// 결제번호 + 결제 시 입력한 이메일이 모두 일치해야 조회된다(로그인 없이 본인 확인).
// 실패 사유는 구분하지 않는다 — 어느 쪽이 틀렸는지 알려주면 결제번호를 대입해볼 수 있다.
export async function POST(request: NextRequest) {
  try {
    const { orderNo, email } = (await request.json()) as { orderNo?: string; email?: string }
    const no = (orderNo ?? '').trim().toUpperCase()
    const mail = (email ?? '').trim().toLowerCase()
    if (!no || !mail) {
      return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 })
    }

    const supabase = getSupabase()
    const { data: order } = await supabase
      .from('training_orders')
      .select('id, order_no, customer_email, customer_name, total_amount, paid_amount, installment_months, status, created_at')
      .eq('order_no', no)
      .maybeSingle()

    if (!order || (order.customer_email ?? '').toLowerCase() !== mail) {
      return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 })
    }

    const { data: rows } = await supabase
      .from('training_order_payments')
      .select('id, sequence, amount, status, due_date, paid_at, receipt_url')
      .eq('order_id', order.id)
      .order('sequence', { ascending: true })

    const payments = (rows ?? []).map((row) => ({
      sequence: row.sequence as number,
      amount: row.amount as number,
      status: row.status as string,
      dueDate: row.due_date as string | null,
      paidAt: row.paid_at as string | null,
      receiptUrl: row.receipt_url as string | null,
    }))

    return NextResponse.json({
      success: true,
      orderNo: order.order_no,
      customerName: order.customer_name,
      totalAmount: order.total_amount,
      paidAmount: order.paid_amount ?? 0,
      installmentMonths: order.installment_months,
      status: order.status,
      createdAt: order.created_at,
      payments,
    })
  } catch (err) {
    console.error('[training/orders/lookup] unexpected error:', err)
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
  }
}
