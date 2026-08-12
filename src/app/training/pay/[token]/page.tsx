import type { Metadata } from 'next'
import { PayClient } from './PayClient'

// 회차 정보를 서버에서 읽어 렌더하므로 정적 프리렌더를 막는다.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '분납 회차 결제 - 그리고 엔터테인먼트',
  robots: { index: false, follow: false },
}

export default async function TrainingInstallmentPayPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <PayClient token={token} />
}
