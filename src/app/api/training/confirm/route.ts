import { NextRequest, NextResponse } from 'next/server'
import { confirmTrainingTossPayment } from '@/lib/training-toss-payment'

type Body = {
  paymentKey?: string
  orderId?: string
  amount?: number
}

// 브라우저 successUrl과 서버 복구 경로가 동일한 승인 코어를 사용한다.
// 결제창에서 돌아오지 못한 경우에도 복구 크론이 같은 멱등 로직으로 승인한다.
export async function POST(request: NextRequest) {
  try {
    const { paymentKey, orderId, amount } = (await request.json()) as Body
    if (!paymentKey || !orderId || typeof amount !== 'number') {
      return NextResponse.json(
        { success: false, state: 'failed', charged: false, error: '결제 정보가 누락되었습니다.' },
        { status: 400 },
      )
    }

    const result = await confirmTrainingTossPayment({ paymentKey, orderId, amount })
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('[training/confirm] unexpected error:', error)
    // PG 응답을 받기 전 네트워크 오류일 수 있으므로 실패로 단정하지 않는다.
    // 복구 API와 1분 크론이 PG 원장을 다시 조회해 최종 상태를 결정한다.
    return NextResponse.json(
      {
        success: false,
        state: 'waiting',
        error: '결제 결과를 다시 확인하고 있습니다. 중복 결제하지 마세요.',
      },
      { status: 503 },
    )
  }
}
