import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '미수·정산 제보 | 그리고 엔터테인먼트',
  description:
    '안무·공연·댄서 출연·광고 등으로 받지 못한 대금이 있다면 사실관계를 제보해 주세요. 사례는 내부 참고 및 법적 절차 준비 자료로만 활용됩니다.',
  alternates: {
    canonical: '/report',
  },
  openGraph: {
    title: '미수·정산 제보 | 그리고 엔터테인먼트',
    description:
      '댄서 시장의 미수·정산 지연 사례를 모읍니다. 받지 못한 비용이 있으시면 제보를 부탁드립니다.',
    url: 'https://grigoent.co.kr/report',
    locale: 'ko_KR',
    type: 'website',
  },
}

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children
}
