import { NextRequest, NextResponse } from 'next/server'
import { assertAdminFromRequest } from '@/lib/admin-auth'

// 결제 취소·환불 (관리자).
// 실제 취소 절차는 src/lib/payment-refund.ts 에 있다 — 결제 점검 화면과 같은 코드를 쓴다.
// 이 라우트는 관리자 인증과 입력 검증만 맡는다.

export async function POST(request: NextRequest) {
  const auth = await assertAdminFromRequest(request, 'training-orders')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, detail: auth.detail }, { status: auth.status })
  }

  return NextResponse.json(
    { error: '환불은 deetz 통합 결제 장부에서 요청하고 다른 관리자가 승인해야 합니다.' },
    { status: 410 },
  )
}
