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
                <Link href="/" prefetch={false} className="text-zinc-300 hover:text-white transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link href="/artists" prefetch={false} className="text-zinc-300 hover:text-white transition-colors">
                  {t('nav.artists')}
                </Link>
              </li>
              <li>
                <Link href="/#divisions" prefetch={false} className="text-zinc-300 hover:text-white transition-colors">
                  {t('nav.company')}
                </Link>
              </li>
              <li>
                <Link href="/history" prefetch={false} className="text-zinc-300 hover:text-white transition-colors">
                  {t('nav.history')}
                </Link>
              </li>
              <li>
                <Link href="/archive" prefetch={false} className="text-zinc-300 hover:text-white transition-colors">
                  {t('nav.archive')}
                </Link>
              </li>
              <li>
                <Link href="/careers" prefetch={false} className="text-zinc-300 hover:text-white transition-colors">
                  {t('nav.careers')}
                </Link>
              </li>
              <li>
                <Link href="/#contact" prefetch={false} className="text-zinc-300 hover:text-white transition-colors">
                  {t('nav.contact')}
                </Link>
              </li>
              <li>
                <Link href="/report" prefetch={false} className="text-zinc-300 hover:text-white transition-colors">
                  {t('footer.report')}
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
          <div className="mb-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            <Link href="/terms" prefetch={false} className="hover:text-white transition-colors">
              이용약관
            </Link>
            <Link href="/privacy" prefetch={false} className="font-semibold text-zinc-200 hover:text-white transition-colors">
              개인정보처리방침
            </Link>
            <Link href="/refund" prefetch={false} className="hover:text-white transition-colors">
              취소·환불 규정
            </Link>
          </div>
          {/* 사업자 정보 — 전자상거래법상 사이버몰 초기화면 표시 의무 + PG 심사 요건.
              상호·대표자·사업자등록번호·주소는 사업자등록증 표기와 글자 단위로 일치해야 하므로 번역하지 않는다. */}
          <div className="mx-auto mb-4 max-w-3xl text-xs leading-6 text-zinc-500 [word-break:keep-all]">
            <p className="text-zinc-300">(주) 그리고엔터테인먼트</p>
            <p>대표자 김현준 · 사업자등록번호 116-81-96848</p>
            <p>서울특별시 마포구 성지3길 55, 2층 202호 (합정동, 아진)</p>
            <p>고객센터 02-6229-9229 · contact@grigoent.co.kr · 평일 09:00 ~ 18:00 (KST)</p>
          </div>
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  )
}
