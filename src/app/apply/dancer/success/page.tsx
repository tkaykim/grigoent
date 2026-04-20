'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

function SuccessBody() {
  const { t } = useLanguage()
  const params = useSearchParams()
  const ticket = params.get('ticket') || ''

  return (
    <main className="pt-16">
      <div className="mx-auto max-w-xl px-5 py-16 sm:py-24">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">
            {t('applyDancer.successTitle')}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-[15px] sm:leading-[1.75]">
            {t('applyDancer.successBody')}
          </p>

          {ticket ? (
            <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700">
              <span className="text-zinc-400">{t('applyDancer.successTicket')}</span>
              <span className="font-semibold text-zinc-900">{ticket}</span>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center sm:gap-3">
            <Button variant="outline" asChild>
              <Link href="/apply/dancer">{t('applyDancer.viewAgain')}</Link>
            </Button>
            <Button asChild>
              <Link href="/">{t('applyDancer.backHome')}</Link>
            </Button>
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
