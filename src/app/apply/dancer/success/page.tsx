'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { CheckCircle2, LogIn } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

function SuccessBody() {
  const { t } = useLanguage()
  const params = useSearchParams()
  const ticket = params.get('ticket') || ''

  return (
    <main className="pt-16">
      <div className="mx-auto max-w-xl px-6 py-20 sm:py-28">
        <div className="border-t border-black pt-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center border border-black">
            <CheckCircle2 className="h-5 w-5 text-black" strokeWidth={1.5} />
          </div>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
            {t('applyDancer.successTicket')}
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-black sm:text-3xl">
            {t('applyDancer.successTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-zinc-600 sm:text-[15px] sm:leading-[1.75]">
            {t('applyDancer.successBody')}
          </p>

          {ticket ? (
            <div className="mx-auto mt-8 inline-flex items-center gap-3 border border-black px-4 py-2 font-mono text-xs tracking-wider text-black">
              <span className="text-zinc-500">#</span>
              <span className="font-semibold">{ticket}</span>
            </div>
          ) : null}

          <div className="mt-10 space-y-3">
            <Button className="w-full rounded-none bg-black text-white hover:bg-zinc-800 sm:w-auto" asChild>
              <a href="https://www.deetz.kr/login?next=/me">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                {t('applyDancer.loginDeetz')}
              </a>
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center sm:gap-3">
              <Button
                variant="outline"
                className="rounded-none border-zinc-300 bg-white text-black hover:border-black hover:bg-white"
                asChild
              >
                <Link href="/apply/dancer">{t('applyDancer.viewAgain')}</Link>
              </Button>
              <Button
                variant="outline"
                className="rounded-none border-zinc-300 bg-white text-black hover:border-black hover:bg-white"
                asChild
              >
                <Link href="/">{t('applyDancer.backHome')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function DancerApplySuccessPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <Header />
      <Suspense fallback={null}>
        <SuccessBody />
      </Suspense>
      <Footer />
    </div>
  )
}
