'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-zinc-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 회사 정보 */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">{t('footer.company.name')}</h3>
            <p className="text-zinc-300 mb-4 whitespace-pre-line">
              {t('footer.description')}
            </p>
          </div>

          {/* 빠른 링크 */}
          <div>
            <h4 className="text-sm font-semibold mb-4">{t('footer.quicklinks')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-zinc-300 hover:text-white transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link href="/artists" className="text-zinc-300 hover:text-white transition-colors">
                  {t('nav.artists')}
                </Link>
              </li>
              <li>
                <Link href="/#about" className="text-zinc-300 hover:text-white transition-colors">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="text-zinc-300 hover:text-white transition-colors">
                  {t('nav.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* 연락처 */}
          <div>
            <h4 className="text-sm font-semibold mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-2 text-zinc-300">
              <li>Email: {t('footer.contact.email')}</li>
              <li>Phone: {t('footer.contact.phone')}</li>
              <li>{t('footer.contact.address2')}</li>
            </ul>
          </div>
        </div>

        {/* 저작권 */}
        <div className="border-t border-zinc-800 mt-8 pt-8 text-center text-zinc-400">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  )
} 