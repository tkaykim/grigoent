'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, Check, CreditCard, Globe, Loader2, ShieldCheck } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { TossCheckout, type TossMethod } from '@/components/payments/TossCheckout'
import { PayPalCheckout } from '@/components/payments/PayPalCheckout'
import { MerchantInfoFooter } from '@/components/payments/MerchantInfoFooter'
import { formatForeign, type ForeignQuote } from '@/lib/paypal-fx'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  TRAINING_COPY,
  describePlan,
  formatKrw,
  planLabel,
  productDescription,
  productHighlights,
  productSubtitle,
  productTitle,
  type TrainingLang,
  type TrainingPlan,
  type TrainingProduct,
} from '@/lib/training-package'
import { cn } from '@/lib/utils'

type CheckoutSession = {
  orderNo: string
  pgOrderId: string
  amount: number
  totalAmount: number
  installmentMonths: number
  orderName: string
  customerKey: string
  paypalQuote: ForeignQuote | null
}

type AppliedDiscount = {
  code: string
  label: string
  summary: string
  originalAmount: number
  discountAmount: number
  finalAmount: number
}

type PaymentMethod = 'card' | 'transfer' | 'paypal'

function Field({
  label,
  required,
  children,
  help,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  help?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-zinc-950">
        {label}
        {required ? <span className="ml-1">*</span> : null}
      </span>
      {children}
      {help ? <span className="mt-1.5 block text-xs leading-5 text-zinc-500">{help}</span> : null}
    </label>
  )
}

const inputClass =
  'min-h-11 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950'

const LANG_LABEL: Record<TrainingLang, string> = { ko: '한국어', en: 'EN', ja: '日本語' }

export function TrainingClient({
  product,
  plans,
  productSlug,
  paymentRef,
  copyOverride,
}: {
  product: TrainingProduct | null
  plans: TrainingPlan[]
  // 생략하면 서버가 기존 트레이닝 패키지로 처리한다(기존 /training 동작 그대로).
  productSlug?: string
  // deetz 비자 케이스에서 발급한 결제 링크 토큰(?ref=). 주문을 그 케이스에 연결한다.
  paymentRef?: string
  // 상품별 카피 덮어쓰기. 생략하면 트레이닝 패키지 기준값을 쓴다.
  // 화면 언어는 클라이언트에서 결정되므로 언어별 맵으로 받는다.
  copyOverride?: Record<
    TrainingLang,
    {
      process: { title: string; body: string }[]
      servicePeriod: string
      terms?: { title: string; items: string[] }
    }
  >
}) {
  const router = useRouter()
  // 사이트 전역 언어 상태를 그대로 쓴다 (헤더 언어 선택과 연동).
  const { language, setLanguage } = useLanguage()
  const lang = (['ko', 'en', 'ja'] as const).includes(language as TrainingLang)
    ? (language as TrainingLang)
    : 'ko'
  const t = TRAINING_COPY[lang]

  const [planCode, setPlanCode] = useState(plans[0]?.code ?? '')
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState('')
  const [memo, setMemo] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [discountInput, setDiscountInput] = useState('')
  const [discount, setDiscount] = useState<AppliedDiscount | null>(null)
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [discountPending, setDiscountPending] = useState(false)
  // 할인코드가 있는 사람은 소수라 기본은 접어두고, 링크를 눌러야 입력칸이 열린다.
  const [discountOpen, setDiscountOpen] = useState(false)
  // 서버가 "이메일을 알아야 판단 가능"이라고 답한 상태. 이메일이 채워지면 자동 재확인한다.
  const [discountNeedsEmail, setDiscountNeedsEmail] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<CheckoutSession | null>(null)

  const selected = useMemo(() => plans.find((plan) => plan.code === planCode) ?? null, [plans, planCode])
  // 요금제가 바뀌면 기준 금액이 달라지므로 적용된 할인을 비운다(재확인하게 만든다).
  useEffect(() => {
    setDiscount(null)
    setDiscountError(null)
  }, [planCode])
  const origin = typeof window === 'undefined' ? 'https://grigoent.co.kr' : window.location.origin

  // 할인코드 확인. 금액은 서버가 계산한 값만 표시한다.
  const applyDiscount = async () => {
    const code = discountInput.trim()
    if (!code) return
    setDiscountPending(true)
    setDiscountError(null)
    try {
      const response = await fetch('/api/training/discount/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, productSlug, planCode, email }),
      })
      const data = await response.json()
      if (!data.success) {
        setDiscount(null)
        setDiscountNeedsEmail(Boolean(data.needsEmail))
        setDiscountError(data.error ?? '사용할 수 없는 할인코드입니다.')
        return
      }
      setDiscountNeedsEmail(false)
      setDiscount({
        code: data.code,
        label: data.label,
        summary: data.summary,
        originalAmount: data.originalAmount,
        discountAmount: data.discountAmount,
        finalAmount: data.finalAmount,
      })
      setSession(null)
    } catch {
      setDiscountError('확인 중 오류가 발생했습니다.')
    } finally {
      setDiscountPending(false)
    }
  }

  // 이메일을 입력해야 판단할 수 있는 코드였다면, 이메일이 채워지는 즉시 다시 확인해 준다.
  // 사용자가 "적용"을 한 번 더 눌러야 한다는 걸 알아채지 못하고 포기하는 걸 막는다.
  useEffect(() => {
    if (!discountNeedsEmail) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    void applyDiscount()
    // applyDiscount 는 매 렌더마다 새로 만들어지므로 의존성에서 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discountNeedsEmail, email])

  const removeDiscount = () => {
    setDiscount(null)
    setDiscountInput('')
    setDiscountError(null)
    setDiscountNeedsEmail(false)
    setDiscountOpen(false)
    setSession(null)
  }

  const startCheckout = async () => {
    if (!selected) {
      setError(t.planTitle)
      return
    }
    setError(null)
    setPending(true)
    try {
      const response = await fetch('/api/training/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planCode, productSlug, ref: paymentRef, discountCode: discount?.code, name, email, phone, nationality, memo, agreed, preferredLang: lang }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setError(data.error ?? 'Failed to start the payment.')
        return
      }
      setSession(data as CheckoutSession)
    } catch {
      setError('Network error. Please try again in a moment.')
    } finally {
      setPending(false)
    }
  }

  const langToggle = (
    <div className="flex gap-1">
      {(['ko', 'en', 'ja'] as TrainingLang[]).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLanguage(value)}
          className={cn(
            'border px-3 py-1.5 text-xs font-semibold transition',
            value === lang
              ? 'border-white bg-white text-zinc-950'
              : 'border-white/30 text-zinc-300 hover:border-white/70',
          )}
        >
          {LANG_LABEL[value]}
        </button>
      ))}
    </div>
  )

  if (!product) {
    return (
      <>
        <Header />
        <main className="bg-white pt-16">
          <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-zinc-950">{t.emptyTitle}</h1>
            <p className="mt-3 text-sm text-zinc-600">{t.emptyBody}</p>
          </div>
          <MerchantInfoFooter lang={lang} servicePeriod={copyOverride?.[lang]?.servicePeriod} />
        </main>
        <Footer />
      </>
    )
  }

  const subtitle = productSubtitle(product, lang)
  const description = productDescription(product, lang)

  return (
    <>
      <Header />
      <main className={cn('bg-white pt-16', lang === 'ko' && '[word-break:keep-all]')}>
        <section className="border-b border-zinc-800 bg-zinc-950 text-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">{t.eyebrow}</p>
              {langToggle}
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.1] tracking-normal [text-wrap:balance] sm:text-5xl lg:text-6xl">
              {productTitle(product, lang)}
            </h1>
            {subtitle ? <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-300">{subtitle}</p> : null}
            <div className="mt-10 flex flex-wrap gap-3">
              {productHighlights(product, lang).map((item) => (
                <span key={item} className="border border-white/25 px-3 py-2 text-sm text-zinc-200">
                  {item}
                </span>
              ))}
            </div>
            <a
              href="#apply"
              className="mt-10 inline-flex items-center gap-3 border border-white px-6 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-zinc-950"
            >
              {t.heroCta}
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-3 border-t border-zinc-300 pt-7 md:grid-cols-[80px_1fr]">
            <div className="font-mono text-sm font-semibold text-zinc-500">01</div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-950">{t.processTitle}</h2>
              {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">{description}</p> : null}
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(copyOverride?.[lang]?.process ?? t.process).map((step, index) => (
              <div key={step.title} className="border border-zinc-300 p-5">
                <div className="font-mono text-xs font-semibold text-zinc-500">{String(index + 1).padStart(2, '0')}</div>
                <h3 className="mt-3 text-lg font-bold text-zinc-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="apply" className="border-t border-zinc-300 bg-zinc-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-3 md:grid-cols-[80px_1fr]">
              <div className="font-mono text-sm font-semibold text-zinc-500">02</div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-950">{t.planTitle}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">{t.planIntro}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const active = plan.code === planCode
                return (
                  <button
                    key={plan.code}
                    type="button"
                    onClick={() => {
                      setPlanCode(plan.code)
                      setSession(null)
                    }}
                    className={cn(
                      'flex flex-col border p-5 text-left transition',
                      active ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-300 bg-white hover:border-zinc-500',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{planLabel(plan, lang)}</span>
                      {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </div>
                    <span className="mt-4 text-2xl font-black tracking-tight">
                      {formatKrw(plan.amount_per_charge, lang)}
                    </span>
                    <span className={cn('mt-1 text-xs', active ? 'text-zinc-300' : 'text-zinc-500')}>
                      {plan.installment_months > 1 ? t.planTimes(plan.installment_months) : t.planOnce}
                    </span>
                    <span className={cn('mt-4 text-xs', active ? 'text-zinc-300' : 'text-zinc-500')}>
                      {t.planTotal} {formatKrw(plan.total_amount, lang)}
                    </span>
                  </button>
                )
              })}
            </div>

            {selected ? (
              <div className="mt-6 border border-zinc-300 bg-white p-5">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  <span className="font-semibold text-zinc-950">{planLabel(selected, lang)}</span>
                  <span className="text-zinc-600">{describePlan(selected, lang)}</span>
                  <span className="text-zinc-600">
                    {t.planTotal}{' '}
                    {discount ? (
                      <span className="text-zinc-400 line-through">
                        {formatKrw(discount.originalAmount, lang)}
                      </span>
                    ) : (
                      formatKrw(selected.total_amount, lang)
                    )}
                  </span>
                  <span className="font-semibold text-zinc-950">
                    {t.planPayNow}{' '}
                    {formatKrw(discount ? discount.finalAmount : selected.amount_per_charge, lang)}
                  </span>
                </div>

                <div className="mt-5 border-t border-zinc-200 pt-4">
                  {discount || discountOpen ? (
                    <p className="mb-2 text-sm font-semibold text-zinc-950">{t.discountTitle}</p>
                  ) : null}
                  {discount ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 border border-emerald-300 bg-emerald-50 px-4 py-3">
                      <div className="text-sm text-emerald-900">
                        <p className="font-semibold">
                          {t.discountApplied(discount.label, formatKrw(discount.discountAmount, lang))}
                        </p>
                        <p className="mt-0.5 text-xs">
                          {t.discountFinal} {formatKrw(discount.finalAmount, lang)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeDiscount}
                        className="border border-emerald-400 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:border-emerald-600"
                      >
                        {t.discountRemove}
                      </button>
                    </div>
                  ) : !discountOpen ? (
                    <button
                      type="button"
                      onClick={() => setDiscountOpen(true)}
                      className="text-xs text-zinc-500 underline underline-offset-4 transition hover:text-zinc-900"
                    >
                      {t.discountToggle}
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={discountInput}
                        onChange={(event) => setDiscountInput(event.target.value.toUpperCase())}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            applyDiscount()
                          }
                        }}
                        placeholder={t.discountPlaceholder}
                        className="min-h-11 flex-1 border border-zinc-300 bg-white px-3 text-sm uppercase tracking-wide text-zinc-950 outline-none transition focus:border-zinc-950"
                      />
                      <button
                        type="button"
                        onClick={applyDiscount}
                        disabled={discountPending || !discountInput.trim()}
                        className="min-h-11 border border-zinc-950 bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-950 hover:text-white disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400 disabled:hover:bg-white"
                      >
                        {discountPending ? t.discountChecking : t.discountApply}
                      </button>
                    </div>
                  )}
                  {discountError ? (
                    <p className="mt-2 text-sm text-red-600">{discountError}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-12 grid gap-3 md:grid-cols-[80px_1fr]">
              <div className="font-mono text-sm font-semibold text-zinc-500">03</div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-950">{t.infoTitle}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">{t.infoIntro}</p>
              </div>
            </div>

            <div className="mt-8 grid max-w-3xl gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t.fieldName} required>
                  <input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setSession(null)
                    }}
                    className={inputClass}
                  />
                </Field>
                <Field label={t.fieldEmail} required>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setSession(null)
                    }}
                    className={inputClass}
                    placeholder="name@example.com"
                  />
                </Field>
                <Field label={t.fieldPhone}>
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} />
                </Field>
                <Field label={t.fieldNationality}>
                  <input
                    value={nationality}
                    onChange={(event) => setNationality(event.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label={t.fieldMemo} help={t.fieldMemoHelp}>
                <textarea
                  rows={3}
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  className="w-full resize-none border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
                />
              </Field>

              {copyOverride?.[lang]?.terms ? (
                <div className="border border-zinc-950 bg-zinc-50 p-5">
                  <p className="text-sm font-bold text-zinc-950">
                    {copyOverride[lang].terms!.title}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {copyOverride[lang].terms!.items.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-6 text-zinc-700">
                        <span aria-hidden className="mt-2 h-1 w-1 shrink-0 bg-zinc-950" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="/refund"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900"
                  >
                    취소·환불 규정 전문 보기
                  </a>
                </div>
              ) : null}

              <label className="flex items-start gap-3 border border-zinc-300 bg-white p-4">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => {
                    setAgreed(event.target.checked)
                    setSession(null)
                  }}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm leading-6 text-zinc-700">{t.agree}</span>
              </label>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              {!session ? (
                <button
                  type="button"
                  onClick={startCheckout}
                  disabled={pending}
                  className="inline-flex min-h-12 w-fit items-center gap-2 bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  {pending ? t.preparing : t.startCheckout}
                </button>
              ) : (
                <div className="border border-zinc-950 bg-white p-5">
                  <p className="text-sm font-semibold text-zinc-950">
                    {t.paymentNo} {session.orderNo}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {session.installmentMonths > 1
                      ? t.payInstallment(formatKrw(session.amount, lang), session.installmentMonths)
                      : t.payOnce(formatKrw(session.amount, lang))}
                  </p>

                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        { value: 'card' as const, label: t.methodCard, desc: t.methodCardDesc, Icon: CreditCard },
                        { value: 'transfer' as const, label: t.methodTransfer, desc: t.methodTransferDesc, Icon: Building2 },
                        { value: 'paypal' as const, label: t.methodOverseas, desc: t.methodOverseasDesc, Icon: Globe },
                      ]
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setMethod(option.value)
                          setError(null)
                        }}
                        className={cn(
                          'flex flex-col border p-4 text-left transition',
                          method === option.value
                            ? 'border-zinc-950 bg-zinc-950 text-white'
                            : 'border-zinc-300 bg-white hover:border-zinc-500',
                        )}
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <option.Icon className="h-4 w-4 shrink-0" />
                          {option.label}
                        </span>
                        <span className={cn('mt-1 text-xs', method === option.value ? 'text-zinc-300' : 'text-zinc-500')}>
                          {option.desc}
                        </span>
                      </button>
                    ))}
                  </div>

                  {method === 'paypal' && session.paypalQuote ? (
                    <p className="mt-4 border border-amber-300 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
                      {t.paypalCurrencyNotice(
                        formatForeign(session.paypalQuote),
                        formatKrw(session.amount, lang),
                      )}
                    </p>
                  ) : null}

                  <div className="mt-5">
                    {method !== 'paypal' ? (
                      <TossCheckout
                        method={(method === 'transfer' ? 'TRANSFER' : 'CARD') as TossMethod}
                        amount={session.amount}
                        orderId={session.pgOrderId}
                        orderName={session.orderName}
                        customerName={name}
                        customerEmail={email}
                        customerMobilePhone={phone}
                        customerKey={session.customerKey}
                        successUrl={`${origin}/training/success`}
                        failUrl={`${origin}/training/fail`}
                        submitLabel={t.paySubmit(formatKrw(session.amount, lang))}
                        lang={lang}
                        onError={(message) => setError(message)}
                      />
                    ) : (
                      <PayPalCheckout
                        pgOrderId={session.pgOrderId}
                        orderName={session.orderName}
                        currency={session.paypalQuote?.currency}
                        lang={lang}
                        onSuccess={(paid) => {
                          const query = new URLSearchParams({
                            provider: 'paypal',
                            orderNo: paid.orderNo ?? session.orderNo,
                            sequence: String(paid.sequence ?? 1),
                            installmentMonths: String(session.installmentMonths),
                            paidAmount: String(paid.paidAmount ?? session.amount),
                            totalAmount: String(paid.totalAmount ?? session.totalAmount),
                          })
                          router.push(`/training/success?${query.toString()}`)
                        }}
                        onError={(message) => setError(message)}
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSession(null)}
                    className="mt-4 text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-900"
                  >
                    {t.editInfo}
                  </button>
                </div>
              )}

              <div className="grid gap-2 text-xs leading-6 text-zinc-500">
                <p className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  {t.notice}
                </p>
                <p className="flex items-start gap-2">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0" />
                  {t.currencyNotice}
                </p>
              </div>
            </div>
          </div>
        </section>

        <MerchantInfoFooter lang={lang} servicePeriod={copyOverride?.[lang]?.servicePeriod} />
      </main>
      <Footer />
    </>
  )
}
