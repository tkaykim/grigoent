import type { Metadata } from 'next'
import { RefundClient } from './RefundClient'

// 결제 점검 건 취소 화면 (내부용).
// 관리자 계정이 없는 점검 담당자도 자기가 낸 소액 결제를 바로 되돌릴 수 있게 한다.
// 범위 제한은 서버(/api/payment-test/refund)에서 강제한다 — 점검 상품·1,000원 이하·전액만.
export const metadata: Metadata = {
  title: '결제 점검 건 취소 - 그리고 엔터테인먼트',
  description: '결제 점검용 소액 결제를 전액 취소하는 내부 점검용 화면입니다.',
  robots: { index: false, follow: false },
}

export default function PaymentTestRefundPage() {
  return <RefundClient />
}
