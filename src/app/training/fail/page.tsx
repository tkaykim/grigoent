import { Suspense } from 'react'
import type { Metadata } from 'next'
import { FailClient } from './FailClient'

export const metadata: Metadata = {
  title: '결제 실패 - 그리고 엔터테인먼트',
  robots: { index: false, follow: false },
}

export default function TrainingFailPage() {
  return (
    <Suspense fallback={null}>
      <FailClient />
    </Suspense>
  )
}
