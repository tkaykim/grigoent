'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MerchantInfoFooter } from '@/components/payments/MerchantInfoFooter'
import { useLanguage } from '@/contexts/LanguageContext'
import { TRAINING_COPY, type TrainingLang } from '@/lib/training-package'
import { PAYMENT_RECOVERY_STORAGE_KEY } from '@/lib/training-payment-recovery-client'
import { trainingPaymentFailureCopy } from '@/lib/training-payment-failure'
import { trainingRetryPath } from '@/lib/training-checkout-client'

export function FailClient() {
  const params = useSearchParams()
  const { language } = useLanguage()
  const requestedLang = params.get('lang') ?? language
  const lang = (['ko', 'en', 'ja'] as const).includes(requestedLang as TrainingLang)
    ? (requestedLang as TrainingLang)
    : 'ko'
  const t = TRAINING_COPY[lang]

  const message = params.get('message')
  const code = params.get('code')
  const failureCopy = trainingPaymentFailureCopy(code, lang, message, false)

  useEffect(() => {
    window.localStorage.removeItem(PAYMENT_RECOVERY_STORAGE_KEY)
  }, [])

  return (
    <>
      <Header />
      <main className={lang === 'ko' ? 'bg-white pt-16 [word-break:keep-all]' : 'bg-white pt-16'}>
        <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="border border-zinc-300 p-8">
            <XCircle className="h-10 w-10 text-red-600" />
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-950">{failureCopy.title}</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{failureCopy.message ?? t.failBody}</p>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{t.failContact}</p>
            {code ? <p className="mt-2 font-mono text-xs text-zinc-400">{code}</p> : null}
            <Link
              href={trainingRetryPath(params.get('product'), params.get('ref'), lang)}
              className="mt-8 inline-flex min-h-11 items-center bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              {t.retry}
            </Link>
          </div>
        </div>
        <MerchantInfoFooter lang={lang} />
      </main>
      <Footer />
    </>
  )
}
