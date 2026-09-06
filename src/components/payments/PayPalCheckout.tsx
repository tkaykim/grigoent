'use client'

import { useState } from 'react'
import { DISPATCH_ACTION, PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { Loader2 } from 'lucide-react'
import type { TrainingLang } from '@/lib/training-package'
import { paypalSdkLocale } from '@/lib/training-checkout-client'

const COPY: Record<TrainingLang, {
  loading: string
  loadFailed: string
  retry: string
  refresh: string
  checking: string
  checkAgain: string
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
    loadFailed: 'PayPal을 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.',
    retry: 'PayPal 다시 불러오기',
    refresh: '결제 정보를 새로 준비합니다. 표시된 금액을 확인한 뒤 다시 진행해 주세요.',
    checking: '결제 결과를 확인하고 있습니다. 다른 결제를 시작하지 말고 결과 확인을 눌러 주세요.',
    checkAgain: '결제 결과 확인',
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
    loadFailed: 'PayPal could not load. Check your connection and try again.',
    retry: 'Reload PayPal',
    refresh: 'Please prepare a new checkout and review the displayed amount before continuing.',
    checking: 'Your payment result is being checked. Do not start another payment. Check the result below.',
    checkAgain: 'Check payment result',
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
    loadFailed: 'PayPalを読み込めませんでした。接続を確認して再試行してください。',
    retry: 'PayPalを再読み込み',
    refresh: '決済情報を再作成し、表示金額を確認してから再度お進みください。',
    checking: '決済結果を確認中です。別の決済を開始せず、下のボタンで結果をご確認ください。',
    checkAgain: '決済結果を確認',
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
  amount: number
  lang?: TrainingLang
  onSuccess: (result: { orderNo: string | null; sequence?: number; paidAmount?: number; totalAmount?: number; documentIntakeReady?: boolean }) => void
  onError?: (message: string) => void
  onCancel?: () => void
  onRestart?: () => void
  onPaymentPending?: (pending: boolean) => void
}

function Inner({ pgOrderId, orderName, currency, amount, lang = 'ko', onSuccess, onError, onCancel, onRestart, onPaymentPending }: PayPalCheckoutProps) {
  const c = COPY[lang]
  const [{ isPending, isRejected, options }, dispatch] = usePayPalScriptReducer()
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // 결제수단 거절은 일반 오류와 다르게 보여준다.
  // "실패했습니다" 한 줄만 띄우면 결제자는 무엇을 바꿔야 할지 몰라 같은 카드로 계속 재시도한다.
  const [declined, setDeclined] = useState(false)
  const [pendingApproval, setPendingApproval] = useState<string | null>(null)

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
      if (data.code === 'CHECKOUT_REFRESH_REQUIRED') {
        onRestart?.()
        throw new Error(c.refresh)
      }
      if (!response.ok || !data.success) throw new Error(c.createFailed)
      if (data.currency !== currency || data.chargedAmount !== amount) {
        onRestart?.()
        throw new Error(c.refresh)
      }
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
    onPaymentPending?.(true)
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
      if (result.state === 'waiting') {
        setPendingApproval(data.orderID)
        setMessage(c.checking)
        return
      }

      // PayPal 이 결제자의 카드·잔액을 거절한 경우.
      // PayPal 권장 대응은 승인 단계로 되돌려 다른 결제수단을 고르게 하는 것이다.
      // restart 를 쓸 수 없는 환경이면 버튼을 다시 누르면 되도록 안내만 남긴다.
      if (!result?.success && result?.recoverable) {
        setPendingApproval(null)
        onPaymentPending?.(false)
        setDeclined(true)
        onError?.(c.declinedTitle)
        if (actions?.restart) {
          setProcessing(false)
          return actions.restart()
        }
        return
      }

      if (!response.ok || !result.success) throw new Error(c.captureFailed)
      onSuccess(result)
    } catch (error) {
      // A lost response is not evidence of a failed charge. Recheck the same
      // provider order with the same server idempotency key.
      setPendingApproval(data.orderID)
      const text = error instanceof TypeError ? c.checking : error instanceof Error ? error.message : c.checking
      setMessage(text)
      onError?.(text)
    } finally {
      setProcessing(false)
    }
  }

  if (isRejected) {
    return (
      <div role="alert" className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p>{c.loadFailed}</p>
        <button type="button" className="mt-3 min-h-11 underline" onClick={() => dispatch({ type: DISPATCH_ACTION.RESET_OPTIONS, value: { ...options } })}>
          {c.retry}
        </button>
      </div>
    )
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
      {pendingApproval ? (
        <button type="button" disabled={processing} onClick={() => void onApprove({ orderID: pendingApproval })} className="min-h-12 w-full bg-zinc-950 p-3 text-white disabled:opacity-50">
          {c.checkAgain}
        </button>
      ) : (
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
      )}
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
  if (props.currency !== 'USD' || !Number.isFinite(props.amount) || props.amount <= 0) {
    return <div role="alert" className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{COPY[props.lang ?? 'ko'].refresh}</div>
  }
  const currency = (props.currency || 'USD').toUpperCase()
  const locale = paypalSdkLocale(props.lang ?? 'ko')
  return (
    <PayPalScriptProvider options={{ clientId, currency, intent: 'capture', locale }}>
      <Inner {...props} />
    </PayPalScriptProvider>
  )
}
