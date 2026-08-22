import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { refundPayment } from '@/lib/payment-refund'
import { PAYMENT_TEST_MAX_AMOUNT, PAYMENT_TEST_PRODUCT_SLUG } from '@/lib/training-package'

// 결제 점검 건 전용 조회·취소.
//
// 왜 관리자 인증이 없는가:
//   점검을 맡는 사람(외부 자문·회계 담당)이 이 사이트의 관리자 계정을 갖고 있지 않다.
//   관리자 권한을 새로 내주면 전체 주문·고객정보까지 함께 열리므로 과하다.
//
// 대신 아래 세 겹으로 범위를 못 박는다. 하나라도 어긋나면 거부한다.
//   1) 상품이 payment-test 인 주문만
//   2) 결제 금액이 PAYMENT_TEST_MAX_AMOUNT(1,000원) 이하인 건만
//   3) 전액 취소만 (부분취소 없음)
// 따라서 최악의 경우도 "우리가 만든 1,000원짜리 점검 결제가 결제자에게 되돌아간다"에 그친다.
// 실제 판매 주문(400만원·140만원)은 1)에서 걸려 이 경로로는 손댈 수 없다.
//
// 결제 자체를 닫으면 이 경로도 함께 의미가 없어진다:
//   update training_products set is_active = false where slug = 'payment-test';

export const dynamic = 'force-dynamic'

function getServiceRole() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

type PaymentRow = {
  id: string
  sequence: number
  amount: number
  status: string
  pg_provider: string | null
  paid_at: string | null
  receipt_url: string | null
}

// 주문번호로 점검 주문을 찾는다. 점검 상품이 아니면 찾지 못한 것으로 처리한다
// (실제 판매 주문의 존재 여부조차 이 경로로 알 수 없게 한다).
async function findTestOrder(orderNo: string) {
  const svc = getServiceRole()

  const { data: product } = await svc
    .from('training_products')
    .select('id')
    .eq('slug', PAYMENT_TEST_PRODUCT_SLUG)
    .maybeSingle()

  if (!product) return null

  const { data: order } = await svc
    .from('training_orders')
    .select('id, order_no, product_id, status, total_amount, paid_amount, created_at')
    .eq('order_no', orderNo)
    .eq('product_id', product.id)
    .maybeSingle()

  if (!order) return null

  const { data: payments } = await svc
    .from('training_order_payments')
    .select('id, sequence, amount, status, pg_provider, paid_at, receipt_url')
    .eq('order_id', order.id)
    .order('sequence', { ascending: true })

  return { order, payments: (payments ?? []) as PaymentRow[] }
}

function normalizeOrderNo(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

// 조회: /api/payment-test/refund?orderNo=GRT-...
export async function GET(request: NextRequest) {
  const orderNo = normalizeOrderNo(request.nextUrl.searchParams.get('orderNo'))
  if (!orderNo) {
    return NextResponse.json({ error: '주문번호를 입력해 주세요.' }, { status: 400 })
  }

  const found = await findTestOrder(orderNo)
  if (!found) {
    return NextResponse.json(
      { error: '점검 결제 주문을 찾을 수 없습니다. 주문번호를 다시 확인해 주세요.' },
      { status: 404 },
    )
  }

  return NextResponse.json({
    orderNo: found.order.order_no,
    status: found.order.status,
    totalAmount: found.order.total_amount,
    paidAmount: found.order.paid_amount,
    createdAt: found.order.created_at,
    payments: found.payments,
  })
}

// 취소: { orderNo }
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { orderNo?: string }
    const orderNo = normalizeOrderNo(body.orderNo)
    if (!orderNo) {
      return NextResponse.json({ error: '주문번호를 입력해 주세요.' }, { status: 400 })
    }

    const found = await findTestOrder(orderNo)
    if (!found) {
      return NextResponse.json(
        { error: '점검 결제 주문을 찾을 수 없습니다. 주문번호를 다시 확인해 주세요.' },
        { status: 404 },
      )
    }

    const target = found.payments.find((row) => row.status === 'paid')
    if (!target) {
      const refunded = found.payments.some((row) => row.status === 'refunded')
      return NextResponse.json(
        {
          error: refunded
            ? '이미 취소된 결제입니다.'
            : '아직 결제가 완료되지 않은 주문이라 취소할 것이 없습니다.',
        },
        { status: 400 },
      )
    }

    // 금액 상한. 점검용 금액을 넘는 건은 이 경로로 취소하지 않는다.
    if (target.amount > PAYMENT_TEST_MAX_AMOUNT) {
      console.error('[payment-test/refund] amount over cap:', { orderNo, amount: target.amount })
      return NextResponse.json(
        { error: '이 경로에서는 점검용 소액 결제만 취소할 수 있습니다. 관리자에게 문의해 주세요.' },
        { status: 400 },
      )
    }

    const result = await refundPayment({
      paymentId: target.id,
      reason: '결제 점검 후 자동 취소',
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      orderNo: found.order.order_no,
      refundedAmount: result.refundedAmount,
      provider: target.pg_provider,
    })
  } catch (error) {
    console.error('[payment-test/refund] unexpected error:', error)
    const message = error instanceof Error ? error.message : '취소 처리 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
