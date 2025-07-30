'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Users, UserCheck, Theater } from 'lucide-react'

export function AboutSection() {
  const { t } = useLanguage()

  return (
    <section id="about" className="py-20 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t('about.title')}
          </h2>
          <p className="text-2xl text-zinc-300 mb-8">
            {t('about.subtitle')}
          </p>
          <p className="text-lg text-zinc-400 max-w-4xl mx-auto whitespace-pre-line">
            {t('about.mission')}
          </p>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-white mb-2">500+</div>
            <div className="text-zinc-400">{t('about.stats.projects')}</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-white mb-2">100+</div>
            <div className="text-zinc-400">{t('about.stats.artists')}</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-white mb-2">30+</div>
            <div className="text-zinc-400">{t('about.stats.countries')}</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-white mb-2">15+</div>
            <div className="text-zinc-400">{t('about.stats.years')}</div>
          </div>
        </div>
      </div>
    </section>
  )
} 