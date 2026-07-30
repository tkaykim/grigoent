'use client'

import { useCallback, useState } from 'react'
import { ANONYMOUS, loadTossPayments } from '@tosspayments/tosspayments-sdk'
import { Loader2 } from 'lucide-react'
import type { TrainingLang } from '@/lib/training-package'

const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY

export type TossMethod = 'CARD' | 'TRANSFER'

const COPY: Record<TrainingLang, { opening: string; failed: string; notConfigured: string }> = {
  ko: {
    opening: '결제창을 여는 중…',
    failed: '결제 요청에 실패했습니다.',
    notConfigured: '결제 설정이 아직 완료되지 않았습니다.',
  },
  en: {
    opening: 'Opening the payment window…',
    failed: 'Could not start the payment.',
    notConfigured: 'Payment is not configured yet.',
  },
  ja: {
    opening: '決済画面を開いています…',
    failed: '決済リクエストに失敗しました。',
    notConfigured: '決済の設定がまだ完了していません。',
  },
}

export type TossCheckoutProps = {
  method: TossMethod
  amount: number
  orderId: string
  orderName: string
  customerName: string
  customerEmail: string
  customerMobilePhone?: string
  customerKey?: string
  successUrl: string
  failUrl: string
  submitLabel: string
  lang?: TrainingLang
  onError?: (message: string) => void
}

// 결제수단을 화면에서 먼저 고르게 하고, 토스 결제창을 해당 수단으로 바로 연다.
// (결제위젯 대신 requestPayment를 쓰면 카드/계좌이체를 명시적으로 분리할 수 있다)
export function TossCheckout({
  method,
  amount,
  orderId,
  orderName,
  customerName,
  customerEmail,
  customerMobilePhone,
  customerKey,
  successUrl,
  failUrl,
  submitLabel,
  lang = 'ko',
  onError,
}: TossCheckoutProps) {
  const c = COPY[lang]
  const [requesting, setRequesting] = useState(false)

  const requestPayment = useCallback(async () => {
    if (!clientKey) {
      onError?.(c.notConfigured)
      return
    }
    if (requesting) return
    setRequesting(true)
    try {
      const toss = await loadTossPayments(clientKey)
      const payment = toss.payment({ customerKey: customerKey ?? ANONYMOUS })
      const common = {
        amount: { currency: 'KRW' as const, value: amount },
        orderId,
        orderName,
        successUrl,
        failUrl,
        customerName: customerName || undefined,
        customerEmail: customerEmail || undefined,
        customerMobilePhone: customerMobilePhone || undefined,
      }
      if (method === 'TRANSFER') {
        await payment.requestPayment({
          ...common,
          method: 'TRANSFER',
          transfer: { cashReceipt: { type: '소득공제' }, useEscrow: false },
        })
      } else {
        await payment.requestPayment({
          ...common,
          method: 'CARD',
          card: { useEscrow: false, flowMode: 'DEFAULT', useCardPoint: false, useAppCardOnly: false },
        })
      }
    } catch (error) {
      console.error('[toss] requestPayment failed', error)
      const message = error instanceof Error && error.message ? error.message : c.failed
      onError?.(message)
    } finally {
      setRequesting(false)
    }
  }, [
    c,
    requesting,
    method,
    amount,
    orderId,
    orderName,
    successUrl,
    failUrl,
    customerName,
    customerEmail,
    customerMobilePhone,
    customerKey,
    onError,
  ])

  return (
    <button
      type="button"
      onClick={requestPayment}
      disabled={requesting}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
    >
      {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {requesting ? c.opening : submitLabel}
    </button>
  )
}
