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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
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

        {/* 서비스 */}
        <div>
          <h3 className="text-3xl font-bold text-center mb-12">
            {t('about.services.title')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-zinc-900 p-8 rounded-lg text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Theater className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold mb-4">
                {t('about.services.choreography')}
              </h4>
              <p className="text-zinc-400">
                {t('about.services.choreography.desc')}
              </p>
            </div>
            <div className="bg-zinc-900 p-8 rounded-lg text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold mb-4">
                {t('about.services.casting')}
              </h4>
              <p className="text-zinc-400">
                {t('about.services.casting.desc')}
              </p>
            </div>
            <div className="bg-zinc-900 p-8 rounded-lg text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserCheck className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold mb-4">
                {t('about.services.production')}
              </h4>
              <p className="text-zinc-400">
                {t('about.services.production.desc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 