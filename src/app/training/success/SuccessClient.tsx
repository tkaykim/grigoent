'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MerchantInfoFooter } from '@/components/payments/MerchantInfoFooter'
import { useLanguage } from '@/contexts/LanguageContext'
import { TRAINING_COPY, formatKrw, type TrainingLang } from '@/lib/training-package'
import {
  PAYMENT_RECOVERY_STORAGE_KEY,
  parsePendingTossRecovery,
} from '@/lib/training-payment-recovery-client'
import { trainingPaymentFailureCopy } from '@/lib/training-payment-failure'

type Result = {
  success: boolean
  state?: 'paid' | 'waiting' | 'failed'
  charged?: boolean
  orderNo?: string | null
  sequence?: number
  installmentMonths?: number
  paidAmount?: number
  totalAmount?: number
  receiptUrl?: string | null
  error?: string
  code?: string
}

export function SuccessClient() {
  const params = useSearchParams()
  const { language } = useLanguage()
  const lang = (['ko', 'en', 'ja'] as const).includes(language as TrainingLang)
    ? (language as TrainingLang)
    : 'ko'
  const t = TRAINING_COPY[lang]

  const [result, setResult] = useState<Result | null>(null)
  const confirmed = useRef(false)

  const paymentKey = params.get('paymentKey')
  const orderId = params.get('orderId')
  const amount = params.get('amount')
  const provider = params.get('provider')
  const failureCopy = result && !result.success && result.state !== 'waiting'
    ? trainingPaymentFailureCopy(result.code, lang, result.error, result.charged)
    : null

  const clearRecovery = () => window.localStorage.removeItem(PAYMENT_RECOVERY_STORAGE_KEY)

  useEffect(() => {
    if (confirmed.current) return

    // PayPal은 승인(capture)이 이미 끝난 뒤 결과값을 들고 돌아온다.
    if (provider === 'paypal' || provider === 'recovered') {
      confirmed.current = true
      clearRecovery()
      setResult({
        success: true,
        state: 'paid',
        orderNo: params.get('orderNo'),
        sequence: Number(params.get('sequence') ?? '1'),
        installmentMonths: Number(params.get('installmentMonths') ?? '1'),
        paidAmount: Number(params.get('paidAmount') ?? '0'),
        totalAmount: Number(params.get('totalAmount') ?? '0'),
        receiptUrl: params.get('receiptUrl'),
      })
      return
    }

    if (!paymentKey || !orderId || !amount) {
      setResult({ success: false })
      return
    }
    confirmed.current = true
    ;(async () => {
      try {
        const response = await fetch('/api/training/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
        })
        const data = (await response.json()) as Result
        if (data.success || data.state === 'failed') clearRecovery()
        setResult(data)
      } catch {
        setResult({
          success: false,
          state: 'waiting',
          error: '결제 결과를 다시 확인하고 있습니다. 중복 결제하지 마세요.',
        })
      }
    })()
  }, [paymentKey, orderId, amount, provider, params])

  // 승인 응답이 유실돼도 브라우저에 저장한 UUID로 서버 PG 대사를 계속한다.
  useEffect(() => {
    if (result?.state !== 'waiting') return
    const pending = parsePendingTossRecovery(window.localStorage.getItem(PAYMENT_RECOVERY_STORAGE_KEY))
    if (!pending) return
    let stopped = false

    const recover = async () => {
      try {
        const response = await fetch('/api/training/recover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: pending.orderId, customerKey: pending.customerKey }),
          cache: 'no-store',
        })
        const data = (await response.json()) as Result
        if (stopped) return
        if (data.success || data.state === 'failed') clearRecovery()
        setResult(data)
      } catch {
        // 화면은 확인 중 상태를 유지하고 서버 크론도 같은 주문을 계속 대사한다.
      }
    }

    void recover()
    const interval = window.setInterval(recover, 3000)
    return () => {
      stopped = true
      window.clearInterval(interval)
    }
  }, [result?.state])

  return (
    <>
      <Header />
      <main className={lang === 'ko' ? 'bg-white pt-16 [word-break:keep-all]' : 'bg-white pt-16'}>
        <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6 lg:px-8">
          {!result ? (
            <div className="flex flex-col items-center text-center">
              <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
              <p className="mt-4 text-sm text-zinc-600">{t.successChecking}</p>
            </div>
          ) : result.state === 'waiting' ? (
            <div className="border border-amber-300 bg-amber-50 p-8">
              <Loader2 className="h-10 w-10 animate-spin text-amber-700" />
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-amber-950">{t.successChecking}</h1>
              <p className="mt-3 text-sm leading-6 text-amber-900">
                {result.error ?? '결제 결과가 확정될 때까지 중복 결제하지 마세요.'}
              </p>
            </div>
          ) : result.success ? (
            <div className="border border-zinc-950 p-8">
              <CheckCircle2 className="h-10 w-10 text-zinc-950" />
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-950">{t.successTitle}</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-600">{t.successBody}</p>
              <dl className="mt-8 grid gap-3 border-t border-zinc-300 pt-6 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">{t.paymentNo}</dt>
                  <dd className="font-semibold text-zinc-950">{result.orderNo ?? '-'}</dd>
                </div>
                {result.installmentMonths && result.installmentMonths > 1 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">{t.labelSequence}</dt>
                    <dd className="font-semibold text-zinc-950">
                      {result.sequence} / {result.installmentMonths}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">{t.labelPaidTotal}</dt>
                  <dd className="font-semibold text-zinc-950">
                    {formatKrw(result.paidAmount ?? 0, lang)} / {formatKrw(result.totalAmount ?? 0, lang)}
                  </dd>
                </div>
              </dl>
              <div className="mt-8 flex flex-wrap gap-3">
                {result.receiptUrl ? (
                  <a
                    href={result.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center border border-zinc-300 px-5 text-sm font-semibold text-zinc-950 transition hover:border-zinc-950"
                  >
                    {t.receipt}
                  </a>
                ) : null}
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  {t.home}
                </Link>
              </div>
            </div>
          ) : (
            <div className="border border-zinc-300 p-8">
              <XCircle className="h-10 w-10 text-red-600" />
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-950">
                {failureCopy?.title ?? t.confirmFailTitle}
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                {failureCopy?.message ?? result.error ?? t.failBody}
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-600">{t.failContact}</p>
              <Link
                href="/training"
                className="mt-8 inline-flex min-h-11 items-center bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                {t.retry}
              </Link>
            </div>
          )}
        </div>
        <MerchantInfoFooter lang={lang} />
      </main>
      <Footer />
    </>
  )
}
