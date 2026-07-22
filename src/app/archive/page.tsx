import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ArchiveClient } from './ArchiveClient'

export const metadata: Metadata = {
  title: 'Archive - 그리고 엔터테인먼트',
  description:
    '그리고 엔터테인먼트의 매니지먼트, 댄서 에이전시와 매거진, 공연·영상 제작 프로젝트 기록을 모아보는 아카이브입니다.',
  alternates: {
    canonical: '/archive',
  },
}

export default function ArchivePage() {
  return (
    <>
      <Header />
      <ArchiveClient />
      <Footer />
    </>
  )
}
