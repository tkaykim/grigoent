import type { Metadata } from 'next'
import { CareersClient } from './CareersClient'

export const metadata: Metadata = {
  title: 'Careers - 그리고 엔터테인먼트',
  description:
    '매니지먼트·디자인·영상 제작·기획 및 행사 운영 4개 직무의 채용 정보와 온라인 지원서입니다.',
  alternates: {
    canonical: '/careers',
  },
  openGraph: {
    title: 'Careers - 그리고 엔터테인먼트',
    description: '매니지먼트, 디자인, 영상 제작, 기획 및 행사 운영 직무를 모집합니다.',
    url: 'https://grigoent.co.kr/careers',
    type: 'website',
  },
}

export default function CareersPage() {
  return <CareersClient />
}
