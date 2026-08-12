'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MerchantInfoFooter } from '@/components/payments/MerchantInfoFooter'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatKrw, type TrainingLang } from '@/lib/training-package'

type Payment = {
  sequence: number
  amount: number
  status: string
  dueDate: string | null
  paidAt: string | null
  receiptUrl: string | null
}

type Result = {
  orderNo: string
  customerName: string
  totalAmount: number
  paidAmount: number
  installmentMonths: number
  payments: Payment[]
}

const COPY: Record<TrainingLang, {
  eyebrow: string
  title: string
  intro: string
  orderNo: string
  orderNoHelp: string
  email: string
  emailHelp: string
  submit: string
  searching: string
  notFound: string
  resultTitle: string
  labelPaid: string
  labelSequence: string
  labelDue: string
  statusPaid: string
  statusPending: string
  statusFailed: string
  receipt: string
  contact: string
  back: string
}> = {
  ko: {
    eyebrow: '결제 내역',
    title: '결제 내역 조회',
    intro: '결제번호와 결제 시 입력하신 이메일로 조회합니다. 결제 상태와 영수증을 확인하실 수 있습니다.',
    orderNo: '결제번호',
    orderNoHelp: '결제 완료 화면과 안내 메일에 있는 GRT- 로 시작하는 번호입니다.',
    email: '이메일',
    emailHelp: '결제 시 입력하신 이메일 주소입니다.',
    submit: '조회하기',
    searching: '조회 중…',
    notFound: '일치하는 결제 내역이 없습니다. 결제번호와 이메일을 다시 확인해 주세요.',
    resultTitle: '결제 내역',
    labelPaid: '누적 결제',
    labelSequence: '회차',
    labelDue: '예정일',
    statusPaid: '결제 완료',
    statusPending: '결제 대기',
    statusFailed: '결제 실패',
    receipt: '영수증',
    contact: '조회가 되지 않으면 고객센터 02-6229-9229 또는 contact@grigoent.co.kr 로 문의해 주세요.',
    back: '상품 페이지로',
  },
  en: {
    eyebrow: 'Payment history',
    title: 'Look up your payment',
    intro: 'Enter your payment number and the email you used at checkout to see your payment status and receipt.',
    orderNo: 'Payment number',
    orderNoHelp: 'The number starting with GRT- shown on the completion screen and in your email.',
    email: 'Email',
    emailHelp: 'The email address you entered at checkout.',
    submit: 'Look up',
    searching: 'Searching…',
    notFound: 'No matching payment was found. Please check the payment number and email.',
    resultTitle: 'Payment history',
    labelPaid: 'Paid so far',
    labelSequence: 'Instalment',
    labelDue: 'Due',
    statusPaid: 'Paid',
    statusPending: 'Not paid',
    statusFailed: 'Failed',
    receipt: 'Receipt',
    contact: 'If you cannot find your payment, contact us at 02-6229-9229 or contact@grigoent.co.kr.',
    back: 'Back to the product page',
  },
  ja: {
    eyebrow: 'お支払い履歴',
    title: 'お支払い内容の照会',
    intro: '決済番号と決済時にご入力いただいたメールアドレスで照会します。お支払い状況と領収書をご確認いただけます。',
    orderNo: '決済番号',
    orderNoHelp: '決済完了画面とご案内メールに記載された GRT- で始まる番号です。',
    email: 'メールアドレス',
    emailHelp: '決済時にご入力いただいたメールアドレスです。',
    submit: '照会する',
    searching: '照会中…',
    notFound: '一致するお支払い内容が見つかりません。決済番号とメールアドレスをご確認ください。',
    resultTitle: 'お支払い履歴',
    labelPaid: 'お支払い累計',
    labelSequence: '回次',
    labelDue: '予定日',
    statusPaid: 'お支払い済み',
    statusPending: '未払い',
    statusFailed: '失敗',
    receipt: '領収書',
    contact: '照会できない場合は 02-6229-9229 または contact@grigoent.co.kr までお問い合わせください。',
    back: '商品ページへ',
  },
}

export function OrdersClient() {
  const { language } = useLanguage()
  const lang: TrainingLang = (['ko', 'en', 'ja'] as const).includes(language as TrainingLang)
    ? (language as TrainingLang)
    : 'ko'
  const t = COPY[lang]

  const [orderNo, setOrderNo] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setNotFound(false)
    setResult(null)
    try {
      const res = await fetch('/api/training/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNo, email }),
      })
      const body = await res.json()
      if (res.ok && body.success) setResult(body as Result)
      else setNotFound(true)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  function statusLabel(status: string): string {
    if (status === 'paid') return t.statusPaid
    if (status === 'failed') return t.statusFailed
    return t.statusPending
  }

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
          <p className="text-sm leading-6 text-zinc-600">{t.intro}</p>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-zinc-950">{t.orderNo}</span>
              <input
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder="GRT-260812-XXXXXX"
                required
                className="min-h-11 w-full border border-zinc-300 px-3 font-mono text-sm outline-none focus:border-zinc-950"
              />
              <span className="mt-1 block text-xs text-zinc-500">{t.orderNoHelp}</span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-zinc-950">{t.email}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="min-h-11 w-full border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-950"
              />
              <span className="mt-1 block text-xs text-zinc-500">{t.emailHelp}</span>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t.searching}
                </>
              ) : (
                t.submit
              )}
            </button>
          </form>

          {notFound ? (
            <p className="mt-6 border border-zinc-300 p-4 text-sm leading-6 text-zinc-700">{t.notFound}</p>
          ) : null}

          {result ? (
            <div className="mt-8 border border-zinc-950 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{t.resultTitle}</p>
              <p className="mt-2 font-mono text-lg font-bold text-zinc-950">{result.orderNo}</p>
              <p className="mt-1 text-sm text-zinc-600">
                {t.labelPaid} {formatKrw(result.paidAmount, lang)} / {formatKrw(result.totalAmount, lang)}
              </p>

              <ul className="mt-5 grid gap-2">
                {result.payments.map((p) => (
                  <li
                    key={p.sequence}
                    className="flex flex-wrap items-center justify-between gap-3 border border-zinc-200 px-4 py-3 text-sm"
                  >
                    <span className="font-semibold text-zinc-950">
                      {t.labelSequence} {p.sequence} / {result.installmentMonths} · {formatKrw(p.amount, lang)}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {statusLabel(p.status)}
                      {p.status !== 'paid' && p.dueDate ? ` · ${t.labelDue} ${p.dueDate}` : ''}
                    </span>
                    {p.receiptUrl ? (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center border border-zinc-300 px-3 text-xs font-semibold text-zinc-700"
                      >
                        {t.receipt}
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-8 text-xs leading-6 text-zinc-500">{t.contact}</p>
          <Link href="/training" className="mt-4 inline-block border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-950">
            {t.back}
          </Link>
        </div>

        <MerchantInfoFooter lang={lang} />
      </main>
      <Footer />
    </>
  )
}
