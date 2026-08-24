import { NextRequest, NextResponse } from 'next/server'
import { recoverTrainingTossPayment } from '@/lib/training-toss-payment'

type Body = {
  orderId?: string
  customerKey?: string
}

// 카카오톡 인앱 브라우저가 successUrl 대신 원래 /training 화면으로 돌아오는 경우의 복구 경로.
// checkout 때 발급한 UUID customerKey까지 일치해야 하므로 다른 주문 상태를 대입 조회할 수 없다.
export async function POST(request: NextRequest) {
  try {
    const { orderId, customerKey } = (await request.json()) as Body
    if (!orderId || !customerKey) {
      return NextResponse.json(
        { success: false, state: 'failed', charged: false, error: '결제 확인 정보가 없습니다.' },
        { status: 400 },
      )
    }

    const result = await recoverTrainingTossPayment({ orderId, customerKey })
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('[training/recover] unexpected error:', error)
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
