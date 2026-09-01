'use client'

import { useState } from 'react'
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { Loader2 } from 'lucide-react'
import type { TrainingLang } from '@/lib/training-package'

const COPY: Record<TrainingLang, {
  loading: string
  processing: string
  createFailed: string
  captureFailed: string
  failed: string
  cancelled: string
  notice: string
  notConfigured: string
  declinedTitle: string
  declinedBody: string
  declinedSteps: string[]
}> = {
  ko: {
    loading: 'PayPal 불러오는 중…',
    processing: '결제를 처리하고 있습니다…',
    createFailed: 'PayPal 주문 생성에 실패했습니다.',
    captureFailed: 'PayPal 결제 승인에 실패했습니다.',
    failed: 'PayPal 결제에 실패했습니다. 다시 시도해 주세요.',
    cancelled: '결제가 취소되었습니다.',
    notice: '해외 카드와 PayPal 잔액으로 결제할 수 있습니다.',
    notConfigured: 'PayPal 설정이 아직 완료되지 않았습니다. 운영 키 등록 후 이용할 수 있습니다.',
    declinedTitle: '결제수단이 거절되었습니다',
    declinedBody:
      '카드사 또는 PayPal에서 이번 결제를 거절했습니다. 청구되지 않았습니다. 아래를 확인하신 뒤 다시 시도해 주세요.',
    declinedSteps: [
      '다른 카드나 PayPal 잔액으로 결제해 보세요. 아래 버튼을 다시 누르시면 결제수단을 새로 고르실 수 있습니다.',
      '카드사에 해외 결제가 가능한지, 한도가 충분한지 확인해 주세요. 금액이 큰 결제는 카드사가 자동으로 막는 경우가 있습니다.',
      '계속 거절되면 finance@grigoent.co.kr 로 알려 주세요. 다른 방법을 안내해 드리겠습니다.',
    ],
  },
  en: {
    loading: 'Loading PayPal…',
    processing: 'Processing your payment…',
    createFailed: 'Could not create the PayPal order.',
    captureFailed: 'Could not complete the PayPal payment.',
    failed: 'The PayPal payment failed. Please try again.',
    cancelled: 'The payment was cancelled.',
    notice: 'You can pay with an international card or your PayPal balance.',
    notConfigured: 'PayPal is not configured yet. It will be available once the live keys are added.',
    declinedTitle: 'Your payment method was declined',
    declinedBody:
      'Your bank or PayPal declined this payment. You have not been charged. Please check the following and try again.',
    declinedSteps: [
      'Try another card or your PayPal balance. Press the button below again to choose a different payment method.',
      'Ask your bank whether international payments are allowed and whether your limit covers this amount. Banks often block large cross-border charges automatically.',
      'If it keeps failing, email us at finance@grigoent.co.kr and we will suggest another way to pay.',
    ],
  },
  ja: {
    loading: 'PayPalを読み込んでいます…',
    processing: '決済を処理しています…',
    createFailed: 'PayPal注文の作成に失敗しました。',
    captureFailed: 'PayPal決済の承認に失敗しました。',
    failed: 'PayPal決済に失敗しました。もう一度お試しください。',
    cancelled: '決済がキャンセルされました。',
    notice: '海外カードとPayPal残高でお支払いいただけます。',
    notConfigured: 'PayPalの設定がまだ完了していません。運用キー登録後にご利用いただけます。',
    declinedTitle: 'お支払い方法が拒否されました',
    declinedBody:
      'カード会社またはPayPalが今回のお支払いを拒否しました。請求は発生していません。以下をご確認のうえ、もう一度お試しください。',
    declinedSteps: [
      '別のカードまたはPayPal残高でお試しください。下のボタンをもう一度押すと、お支払い方法を選び直せます。',
      'カード会社に海外決済が可能か、利用限度額が足りているかをご確認ください。高額の海外決済はカード会社が自動的に止めることがあります。',
      '何度も拒否される場合は finance@grigoent.co.kr までご連絡ください。別のお支払い方法をご案内します。',
    ],
  },
}

const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

export type PayPalCheckoutProps = {
  /** 우리 시스템의 회차 결제 식별자 (training_order_payments.pg_order_id) */
  pgOrderId: string
  orderName: string
  /**
   * SDK 로드 통화. 서버가 만드는 PayPal 주문 통화(foreignQuote)와 반드시 같아야 한다.
   * 다르면 버튼이 "Expected currency from order api call to be X, got Y" 로 거부한다.
   * PayPal 은 KRW 를 지원하지 않으므로 기본값은 USD.
   */
  currency?: string
  lang?: TrainingLang
  onSuccess: (result: { orderNo: string | null; sequence?: number; paidAmount?: number; totalAmount?: number; documentIntakeReady?: boolean }) => void
  onError?: (message: string) => void
  onCancel?: () => void
}

function Inner({ pgOrderId, orderName, lang = 'ko', onSuccess, onError, onCancel }: PayPalCheckoutProps) {
  const c = COPY[lang]
  const [{ isPending }] = usePayPalScriptReducer()
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // 결제수단 거절은 일반 오류와 다르게 보여준다.
  // "실패했습니다" 한 줄만 띄우면 결제자는 무엇을 바꿔야 할지 몰라 같은 카드로 계속 재시도한다.
  const [declined, setDeclined] = useState(false)

  const createOrder = async (): Promise<string> => {
    setMessage(null)
    setDeclined(false)
    setProcessing(true)
    try {
      const response = await fetch('/api/training/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgOrderId, description: orderName }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || c.createFailed)
      return data.id as string
    } catch (error) {
      const text = error instanceof Error ? error.message : c.createFailed
      setMessage(text)
      onError?.(text)
      throw error
    } finally {
      setProcessing(false)
    }
  }

  const onApprove = async (
    data: { orderID: string },
    actions?: { restart?: () => void },
  ): Promise<void> => {
    setMessage(null)
    setDeclined(false)
    setProcessing(true)
    try {
      const response = await fetch('/api/training/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paypalOrderId: data.orderID, pgOrderId }),
      })
      const result = await response.json()

      // PayPal 이 결제자의 카드·잔액을 거절한 경우.
      // PayPal 권장 대응은 승인 단계로 되돌려 다른 결제수단을 고르게 하는 것이다.
      // restart 를 쓸 수 없는 환경이면 버튼을 다시 누르면 되도록 안내만 남긴다.
      if (!result?.success && result?.recoverable) {
        setDeclined(true)
        onError?.(c.declinedTitle)
        if (actions?.restart) {
          setProcessing(false)
          return actions.restart()
        }
        return
      }

      if (!response.ok || !result.success) throw new Error(result.error || c.captureFailed)
      onSuccess(result)
    } catch (error) {
      const text = error instanceof Error ? error.message : c.captureFailed
      setMessage(text)
      onError?.(text)
    } finally {
      setProcessing(false)
    }
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        {c.loading}
      </div>
    )
  }

  return (
    <div>
      {declined ? (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">{c.declinedTitle}</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900">{c.declinedBody}</p>
          <ul className="mt-3 space-y-2">
            {c.declinedSteps.map((step) => (
              <li key={step} className="flex gap-2 text-sm leading-relaxed text-amber-900">
                <span aria-hidden="true">·</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {message ? <p className="mb-3 text-sm text-red-600">{message}</p> : null}
      {processing ? <p className="mb-3 text-sm text-zinc-500">{c.processing}</p> : null}
      <PayPalButtons
        style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 48 }}
        disabled={processing}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={() => {
          const text = c.failed
          setMessage(text)
          onError?.(text)
        }}
        onCancel={() => {
          setMessage(c.cancelled)
          onCancel?.()
        }}
      />
      <p className="mt-3 text-center text-xs text-zinc-500">
        {c.notice}
      </p>
    </div>
  )
}

export function PayPalCheckout(props: PayPalCheckoutProps) {
  if (!clientId) {
    return (
      <div className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        {COPY[props.lang ?? 'ko'].notConfigured}
      </div>
    )
  }
  const currency = (props.currency || 'USD').toUpperCase()
  const locale = props.lang === 'ja' ? 'ja-JP' : props.lang === 'ko' ? 'ko-KR' : 'en-US'
  return (
    <PayPalScriptProvider options={{ clientId, currency, intent: 'capture', locale }}>
      <Inner {...props} />
    </PayPalScriptProvider>
  )
}
