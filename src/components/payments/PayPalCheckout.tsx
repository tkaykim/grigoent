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
}> = {
  ko: {
    loading: 'PayPal 불러오는 중…',
    processing: '결제를 처리하고 있습니다…',
    createFailed: 'PayPal 주문 생성에 실패했습니다.',
    captureFailed: 'PayPal 결제 승인에 실패했습니다.',
    failed: 'PayPal 결제에 실패했습니다. 다시 시도해 주세요.',
    cancelled: '결제가 취소되었습니다.',
    notice: '해외 카드와 PayPal 잔액으로 결제할 수 있습니다. 결제 통화는 원화(KRW)입니다.',
    notConfigured: 'PayPal 설정이 아직 완료되지 않았습니다. 운영 키 등록 후 이용할 수 있습니다.',
  },
  en: {
    loading: 'Loading PayPal…',
    processing: 'Processing your payment…',
    createFailed: 'Could not create the PayPal order.',
    captureFailed: 'Could not complete the PayPal payment.',
    failed: 'The PayPal payment failed. Please try again.',
    cancelled: 'The payment was cancelled.',
    notice: 'You can pay with an international card or your PayPal balance. Payments are charged in Korean won (KRW).',
    notConfigured: 'PayPal is not configured yet. It will be available once the live keys are added.',
  },
  ja: {
    loading: 'PayPalを読み込んでいます…',
    processing: '決済を処理しています…',
    createFailed: 'PayPal注文の作成に失敗しました。',
    captureFailed: 'PayPal決済の承認に失敗しました。',
    failed: 'PayPal決済に失敗しました。もう一度お試しください。',
    cancelled: '決済がキャンセルされました。',
    notice: '海外カードとPayPal残高でお支払いいただけます。決済通貨は韓国ウォン(KRW)です。',
    notConfigured: 'PayPalの設定がまだ完了していません。運用キー登録後にご利用いただけます。',
  },
}

const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

export type PayPalCheckoutProps = {
  /** 우리 시스템의 회차 결제 식별자 (training_order_payments.pg_order_id) */
  pgOrderId: string
  orderName: string
  lang?: TrainingLang
  onSuccess: (result: { orderNo: string | null; sequence?: number; paidAmount?: number; totalAmount?: number }) => void
  onError?: (message: string) => void
  onCancel?: () => void
}

function Inner({ pgOrderId, orderName, lang = 'ko', onSuccess, onError, onCancel }: PayPalCheckoutProps) {
  const c = COPY[lang]
  const [{ isPending }] = usePayPalScriptReducer()
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const createOrder = async (): Promise<string> => {
    setMessage(null)
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

  const onApprove = async (data: { orderID: string }): Promise<void> => {
    setMessage(null)
    setProcessing(true)
    try {
      const response = await fetch('/api/training/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paypalOrderId: data.orderID, pgOrderId }),
      })
      const result = await response.json()
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
  return (
    <PayPalScriptProvider options={{ clientId, currency: 'KRW', intent: 'capture' }}>
      <Inner {...props} />
    </PayPalScriptProvider>
  )
}
