'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { TossCheckout, type TossMethod } from '@/components/payments/TossCheckout'
import { MerchantInfoFooter } from '@/components/payments/MerchantInfoFooter'
import { formatKrw, type TrainingLang } from '@/lib/training-package'

type Prepared = {
  pgOrderId: string
  orderNo: string
  sequence: number
  installmentMonths: number
  amount: number
  dueDate: string | null
  totalAmount: number
  paidAmount: number
  customerName: string
  customerEmail: string
  customerPhone: string | null
  customerKey: string | null
  preferredLang: string
}

const COPY: Record<TrainingLang, {
  eyebrow: string
  title: string
  intro: string
  labelOrderNo: string
  labelSequence: string
  labelDue: string
  labelAmount: string
  labelProgress: string
  methodCard: string
  methodCardDesc: string
  methodTransfer: string
  methodTransferDesc: string
  submit: (amount: string) => string
  loading: string
  paidTitle: string
  paidBody: string
  invalidTitle: string
  invalidBody: string
  home: string
  notice: string
}> = {
  ko: {
    eyebrow: '분납 결제',
    title: '남은 회차 결제',
    intro: '아래 회차의 결제를 진행합니다. 금액은 최초 결제 시 확정된 회차 금액입니다.',
    labelOrderNo: '결제번호',
    labelSequence: '회차',
    labelDue: '예정일',
    labelAmount: '이번 회차 금액',
    labelProgress: '누적 결제',
    methodCard: '카드결제',
    methodCardDesc: '국내외 신용·체크카드 (원화 결제)',
    methodTransfer: '계좌이체',
    methodTransferDesc: '국내 은행 실시간 계좌이체 (원화 결제)',
    submit: (amount) => `${amount} 결제하기`,
    loading: '결제 정보를 불러오는 중…',
    paidTitle: '이미 결제가 완료된 회차입니다.',
    paidBody: '중복 결제되지 않았습니다. 문의가 필요하면 고객센터로 연락해 주세요.',
    invalidTitle: '유효하지 않은 결제 링크입니다.',
    invalidBody: '링크가 만료되었거나 잘못되었습니다. 고객센터로 문의해 주세요.',
    home: '홈으로',
    notice: '카드결제와 계좌이체는 토스페이먼츠에서 처리됩니다.',
  },
  en: {
    eyebrow: 'Installment payment',
    title: 'Pay your next instalment',
    intro: 'This pays the instalment below. The amount was fixed when you first checked out.',
    labelOrderNo: 'Payment number',
    labelSequence: 'Instalment',
    labelDue: 'Due date',
    labelAmount: 'Amount due',
    labelProgress: 'Paid so far',
    methodCard: 'Card',
    methodCardDesc: 'Korean and overseas credit/debit cards (charged in KRW)',
    methodTransfer: 'Bank transfer',
    methodTransferDesc: 'Real-time transfer from a Korean bank (charged in KRW)',
    submit: (amount) => `Pay ${amount}`,
    loading: 'Loading your payment details…',
    paidTitle: 'This instalment is already paid.',
    paidBody: 'You have not been charged twice. Contact us if anything looks wrong.',
    invalidTitle: 'This payment link is not valid.',
    invalidBody: 'The link may have expired or been altered. Please contact us.',
    home: 'Home',
    notice: 'Card and bank transfer payments are processed by Toss Payments.',
  },
  ja: {
    eyebrow: '分割払い',
    title: '次回分のお支払い',
    intro: '下記の回次のお支払いを行います。金額は初回決済時に確定した金額です。',
    labelOrderNo: '決済番号',
    labelSequence: '回次',
    labelDue: '予定日',
    labelAmount: '今回のお支払い金額',
    labelProgress: 'お支払い累計',
    methodCard: 'カード決済',
    methodCardDesc: '国内外のクレジット・デビットカード（ウォン建て）',
    methodTransfer: '口座振替',
    methodTransferDesc: '韓国の銀行のリアルタイム口座振替（ウォン建て）',
    submit: (amount) => `${amount}を支払う`,
    loading: '決済情報を読み込んでいます…',
    paidTitle: 'この回次はすでにお支払い済みです。',
    paidBody: '二重に請求されてはいません。ご不明な点はカスタマーセンターまでご連絡ください。',
    invalidTitle: '有効な決済リンクではありません。',
    invalidBody: 'リンクの有効期限が切れているか、正しくありません。お問い合わせください。',
    home: 'ホームへ',
    notice: 'カード決済と口座振替はトスペイメンツが処理します。',
  },
}

function normalizeLang(value: string | undefined): TrainingLang {
  return value === 'en' || value === 'ja' ? value : 'ko'
}

export function PayClient({ token }: { token: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'paid' | 'invalid'>('loading')
  const [data, setData] = useState<Prepared | null>(null)
  const [method, setMethod] = useState<TossMethod>('CARD')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/training/installment/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => ({ ok: res.ok, status: res.status, body: await res.json() }))
      .then(({ ok, status, body }) => {
        if (!alive) return
        if (ok && body.success) {
          setData(body as Prepared)
          setState('ready')
        } else if (status === 409) {
          setState('paid')
        } else {
          setState('invalid')
        }
      })
      .catch(() => {
        if (alive) setState('invalid')
      })
    return () => {
      alive = false
    }
  }, [token])

  const lang = normalizeLang(data?.preferredLang)
  const t = COPY[lang]

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://grigoent.co.kr'
  const successUrl = data
    ? `${origin}/training/success?orderNo=${encodeURIComponent(data.orderNo)}&sequence=${data.sequence}&installmentMonths=${data.installmentMonths}&lang=${lang}`
    : ''
  const failUrl = `${origin}/training/fail?lang=${lang}`

  return (
    <>
      <Header />
      <main className="bg-white pt-16 [word-break:keep-all]">
        <section className="border-b border-zinc-800 bg-zinc-950 text-white">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">{t.eyebrow}</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{t.title}</h1>
          </div>
        </section>

        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          {state === 'loading' ? (
            <p className="flex items-center gap-2 text-sm text-zinc-600">
              <Loader2 className="size-4 animate-spin" />
              {t.loading}
            </p>
          ) : null}

          {state === 'invalid' || state === 'paid' ? (
            <div className="border border-zinc-300 p-6">
              <p className="text-lg font-bold text-zinc-950">
                {state === 'paid' ? t.paidTitle : t.invalidTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {state === 'paid' ? t.paidBody : t.invalidBody}
              </p>
              <Link href="/" className="mt-5 inline-block border border-zinc-950 px-4 py-2 text-sm font-semibold">
                {t.home}
              </Link>
            </div>
          ) : null}

          {state === 'ready' && data ? (
            <>
              <p className="text-sm leading-6 text-zinc-600">{t.intro}</p>

              <dl className="mt-6 grid gap-x-8 gap-y-3 border-y border-zinc-200 py-5 sm:grid-cols-2">
                <div className="flex justify-between gap-4 text-sm">
                  <dt className="text-zinc-500">{t.labelOrderNo}</dt>
                  <dd className="font-mono font-semibold text-zinc-950">{data.orderNo}</dd>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <dt className="text-zinc-500">{t.labelSequence}</dt>
                  <dd className="font-semibold text-zinc-950">
                    {data.sequence} / {data.installmentMonths}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <dt className="text-zinc-500">{t.labelDue}</dt>
                  <dd className="text-zinc-950">{data.dueDate ?? '-'}</dd>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <dt className="text-zinc-500">{t.labelProgress}</dt>
                  <dd className="text-zinc-950">
                    {formatKrw(data.paidAmount, lang)} / {formatKrw(data.totalAmount, lang)}
                  </dd>
                </div>
              </dl>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {t.labelAmount}
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight text-zinc-950">
                {formatKrw(data.amount, lang)}
              </p>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    { key: 'CARD' as const, label: t.methodCard, desc: t.methodCardDesc },
                    { key: 'TRANSFER' as const, label: t.methodTransfer, desc: t.methodTransferDesc },
                  ]
                ).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMethod(m.key)}
                    className={
                      method === m.key
                        ? 'border border-zinc-950 bg-zinc-950 p-4 text-left text-white'
                        : 'border border-zinc-300 p-4 text-left transition hover:border-zinc-950'
                    }
                  >
                    <span className="block text-sm font-semibold">{m.label}</span>
                    <span
                      className={
                        method === m.key ? 'mt-1 block text-xs text-zinc-300' : 'mt-1 block text-xs text-zinc-500'
                      }
                    >
                      {m.desc}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <TossCheckout
                  method={method}
                  amount={data.amount}
                  orderId={data.pgOrderId}
                  orderName={`${data.orderNo} ${data.sequence}/${data.installmentMonths}`}
                  customerName={data.customerName}
                  customerEmail={data.customerEmail}
                  customerMobilePhone={data.customerPhone ?? undefined}
                  customerKey={data.customerKey ?? undefined}
                  successUrl={successUrl}
                  failUrl={failUrl}
                  submitLabel={t.submit(formatKrw(data.amount, lang))}
                  lang={lang}
                  onError={setError}
                />
              </div>

              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
              <p className="mt-4 text-xs leading-6 text-zinc-500">{t.notice}</p>
            </>
          ) : null}
        </div>

        <MerchantInfoFooter lang={lang} />
      </main>
      <Footer />
    </>
  )
}
