'use client'

import { useState } from 'react'
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { Loader2 } from 'lucide-react'

const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

export type PayPalCheckoutProps = {
  /** 우리 시스템의 회차 결제 식별자 (training_order_payments.pg_order_id) */
  pgOrderId: string
  orderName: string
  onSuccess: (result: { orderNo: string | null; sequence?: number; paidAmount?: number; totalAmount?: number }) => void
  onError?: (message: string) => void
  onCancel?: () => void
}

function Inner({ pgOrderId, orderName, onSuccess, onError, onCancel }: PayPalCheckoutProps) {
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
      if (!response.ok || !data.success) throw new Error(data.error || 'PayPal 주문 생성에 실패했습니다.')
      return data.id as string
    } catch (error) {
      const text = error instanceof Error ? error.message : 'PayPal 주문 생성에 실패했습니다.'
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
      if (!response.ok || !result.success) throw new Error(result.error || 'PayPal 결제 승인에 실패했습니다.')
      onSuccess(result)
    } catch (error) {
      const text = error instanceof Error ? error.message : 'PayPal 결제 승인에 실패했습니다.'
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
        PayPal 불러오는 중…
      </div>
    )
  }

  return (
    <div>
      {message ? <p className="mb-3 text-sm text-red-600">{message}</p> : null}
      {processing ? <p className="mb-3 text-sm text-zinc-500">결제를 처리하고 있습니다…</p> : null}
      <PayPalButtons
        style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 48 }}
        disabled={processing}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={() => {
          const text = 'PayPal 결제에 실패했습니다. 다시 시도해 주세요.'
          setMessage(text)
          onError?.(text)
        }}
        onCancel={() => {
          setMessage('결제가 취소되었습니다.')
          onCancel?.()
        }}
      />
      <p className="mt-3 text-center text-xs text-zinc-500">
        해외 카드와 PayPal 잔액으로 결제할 수 있습니다. 원화 금액은 USD로 환산되어 청구됩니다.
      </p>
    </div>
  )
}

export function PayPalCheckout(props: PayPalCheckoutProps) {
  if (!clientId) {
    return (
      <div className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        PayPal 설정이 아직 완료되지 않았습니다. 운영 키 등록 후 이용할 수 있습니다.
      </div>
    )
  }
  return (
    <PayPalScriptProvider options={{ clientId, currency: 'USD', intent: 'capture' }}>
      <Inner {...props} />
    </PayPalScriptProvider>
  )
}
