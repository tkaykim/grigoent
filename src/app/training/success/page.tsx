import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SuccessClient } from './SuccessClient'

// searchParams 를 쓰는 클라이언트 화면이라 정적 프리렌더 시 본문이 비어 나간다.
// 결제 심사에서 사업자 정보가 초기 HTML에 보이도록 요청 시 렌더로 고정한다.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '결제 완료 - 그리고 엔터테인먼트',
  robots: { index: false, follow: false },
}

export default function TrainingSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessClient />
    </Suspense>
  )
}
