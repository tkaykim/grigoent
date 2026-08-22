import { NextRequest, NextResponse } from 'next/server'
import { assertAdminFromRequest } from '@/lib/admin-auth'
import { refundPayment } from '@/lib/payment-refund'

// 결제 취소·환불 (관리자).
// 실제 취소 절차는 src/lib/payment-refund.ts 에 있다 — 결제 점검 화면과 같은 코드를 쓴다.
// 이 라우트는 관리자 인증과 입력 검증만 맡는다.

type Body = {
  paymentId?: string
  reason?: string
  /** 부분환불 금액(원). 생략하면 전액. 토스만 지원. */
  amount?: number
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

    const result = await refundPayment({ paymentId, reason, amount: body.amount })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      refundedAmount: result.refundedAmount,
      remainingPaidAmount: result.remainingPaidAmount,
      partial: result.partial,
    })
  } catch (error) {
    console.error('[training/refund] unexpected error:', error)
    const message = error instanceof Error ? error.message : '환불 처리 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
