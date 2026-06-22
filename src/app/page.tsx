import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { HeroSection } from '@/components/home/HeroSection'
import { AboutSection } from '@/components/home/AboutSection'
import { ArtistsSection } from '@/components/home/ArtistsSection'
import { WorksSection } from '@/components/home/WorksSection'
import { GeneralProposalSection } from '@/components/home/GeneralProposalSection'
import { ContactSection } from '@/components/home/ContactSection'
import { getHomeArtists, getFeaturedWorks } from '@/lib/home-data'

// 5분 ISR — 홈 데이터를 서버에서 미리 받아 HTML에 박아 내려보냄 (클라이언트 워터폴 제거)
export const revalidate = 300

export default async function Home() {
  // 서버에서 병렬로 미리 fetch (캐시됨). 실패해도 클라이언트가 폴백 fetch 함.
  const [initialItems, initialWorks] = await Promise.all([
    getHomeArtists(8).catch(() => []),
    getFeaturedWorks(6).catch(() => []),
  ])

  return (
    <main>
      <Header />
      <HeroSection />
      <AboutSection />
      <ArtistsSection initialItems={initialItems} />
      <WorksSection initialWorks={initialWorks} />
      <GeneralProposalSection />
      <ContactSection />
      <Footer />
    </main>
  )
}
