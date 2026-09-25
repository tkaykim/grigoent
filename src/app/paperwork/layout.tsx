import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '거래 서류 | 그리고엔터테인먼트',
  description: '사업자등록증·통장사본·사업자 정보를 확인하고 내려받을 수 있습니다.',
  robots: { index: false, follow: false },
  openGraph: {
    title: '그리고엔터테인먼트 거래 서류',
    description: '사업자등록증·통장사본·사업자 정보를 확인하고 내려받으세요.',
    siteName: '그리고 엔터테인먼트',
    locale: 'ko_KR',
    type: 'website',
  },
}

export default function PaperworkLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-zinc-50 text-zinc-900 [word-break:keep-all]">{children}</div>
}
