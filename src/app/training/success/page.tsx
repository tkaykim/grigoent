import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SuccessClient } from './SuccessClient'

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
