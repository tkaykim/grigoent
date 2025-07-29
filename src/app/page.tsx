import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { HeroSection } from '@/components/home/HeroSection'
import { AboutSection } from '@/components/home/AboutSection'
import { ArtistsSection } from '@/components/home/ArtistsSection'
import { WorksSection } from '@/components/home/WorksSection'
import { GeneralProposalSection } from '@/components/home/GeneralProposalSection'
import { ContactSection } from '@/components/home/ContactSection'

export default function Home() {
  return (
    <main>
      <Header />
      <HeroSection />
      <AboutSection />
      <ArtistsSection />
      <WorksSection />
      <GeneralProposalSection />
      <ContactSection />
      <Footer />
    </main>
  )
}
