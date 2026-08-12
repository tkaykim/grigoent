import type { Metadata } from 'next'
import { OrdersClient } from './OrdersClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '결제 내역 조회 - 그리고 엔터테인먼트',
  description: '결제번호와 이메일로 결제 내역을 조회하고 남은 분납 회차를 결제할 수 있습니다.',
  alternates: { canonical: '/training/orders' },
}

export default function TrainingOrdersPage() {
  return <OrdersClient />
}
