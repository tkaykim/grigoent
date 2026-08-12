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

type Result = {
  success: boolean
  orderNo?: string | null
  sequence?: number
  installmentMonths?: number
  paidAmount?: number
  totalAmount?: number
  receiptUrl?: string | null
  remaining?: { sequence: number; amount: number; dueDate: string | null; payUrl: string }[]
  error?: string
}

// 남은 회차 안내 문구 (분납 전용).
const REMAINING_COPY: Record<TrainingLang, { title: string; intro: string; due: string; pay: string }> = {
  ko: {
    title: '남은 회차',
    intro: '아래 링크에서 회차별로 결제하실 수 있습니다. 예정일에 맞춰 안내도 드립니다.',
    due: '예정일',
    pay: '결제하기',
  },
  en: {
    title: 'Remaining instalments',
    intro: 'You can pay each instalment from the links below. We will also remind you near each due date.',
    due: 'Due',
    pay: 'Pay',
  },
  ja: {
    title: '残りの回次',
    intro: '下記のリンクから回次ごとにお支払いいただけます。予定日に合わせてご案内もいたします。',
    due: '予定日',
    pay: 'お支払い',
  },
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

  useEffect(() => {
    if (confirmed.current) return

    // PayPal은 승인(capture)이 이미 끝난 뒤 결과값을 들고 돌아온다.
    if (provider === 'paypal') {
      confirmed.current = true
      setResult({
        success: true,
        orderNo: params.get('orderNo'),
        sequence: Number(params.get('sequence') ?? '1'),
        installmentMonths: Number(params.get('installmentMonths') ?? '1'),
        paidAmount: Number(params.get('paidAmount') ?? '0'),
        totalAmount: Number(params.get('totalAmount') ?? '0'),
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
        setResult(data)
      } catch {
        setResult({ success: false })
      }
    })()
  }, [paymentKey, orderId, amount, provider, params])

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
              {result.remaining && result.remaining.length > 0 ? (
                <div className="mt-8 border-t border-zinc-300 pt-6">
                  <p className="text-sm font-bold text-zinc-950">{REMAINING_COPY[lang].title}</p>
                  <p className="mt-1 text-xs leading-6 text-zinc-500">{REMAINING_COPY[lang].intro}</p>
                  <ul className="mt-4 grid gap-2">
                    {result.remaining.map((row) => (
                      <li
                        key={row.sequence}
                        className="flex flex-wrap items-center justify-between gap-3 border border-zinc-200 px-4 py-3 text-sm"
                      >
                        <span className="font-semibold text-zinc-950">
                          {row.sequence} / {result.installmentMonths} · {formatKrw(row.amount, lang)}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {REMAINING_COPY[lang].due} {row.dueDate ?? '-'}
                        </span>
                        <a
                          href={row.payUrl}
                          className="inline-flex min-h-9 items-center border border-zinc-950 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-950 hover:text-white"
                        >
                          {REMAINING_COPY[lang].pay}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
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
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-950">{t.confirmFailTitle}</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-600">{result.error ?? t.failBody}</p>
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
