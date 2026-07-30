'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import { ANONYMOUS, loadTossPayments, type TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk'
import { Loader2 } from 'lucide-react'

const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY

export type TossCheckoutProps = {
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
  onError?: (message: string) => void
}

// modoo_app 결제위젯과 동일한 방식(@tosspayments/tosspayments-sdk)의 최소 구성.
export function TossCheckout({
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
  onError,
}: TossCheckoutProps) {
  const instanceId = useId().replace(/:/g, '')
  const methodId = `toss-method-${instanceId}`
  const agreementId = `toss-agreement-${instanceId}`

  const [widgets, setWidgets] = useState<TossPaymentsWidgets>()
  const [ready, setReady] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    let mounted = true
    if (!clientKey) {
      onError?.('결제 설정이 완료되지 않았습니다.')
      return
    }
    ;(async () => {
      try {
        const toss = await loadTossPayments(clientKey)
        const instance = toss.widgets({ customerKey: customerKey ?? ANONYMOUS })
        if (mounted) setWidgets(instance)
      } catch (error) {
        console.error('[toss] load failed', error)
        onError?.('결제 모듈을 불러오지 못했습니다.')
      }
    })()
    return () => {
      mounted = false
    }
  }, [customerKey, onError])

  useEffect(() => {
    if (!widgets) return
    let mounted = true
    ;(async () => {
      try {
        await widgets.setAmount({ currency: 'KRW', value: amount })
        await Promise.all([
          widgets.renderPaymentMethods({ selector: `#${methodId}`, variantKey: 'DEFAULT' }),
          widgets.renderAgreement({ selector: `#${agreementId}`, variantKey: 'AGREEMENT' }),
        ])
        if (mounted) setReady(true)
      } catch (error) {
        console.error('[toss] render failed', error)
        onError?.('결제 수단을 표시하지 못했습니다.')
      }
    })()
    return () => {
      mounted = false
    }
  }, [widgets, amount, methodId, agreementId, onError])

  const requestPayment = useCallback(async () => {
    if (!widgets || !ready || requesting) return
    setRequesting(true)
    try {
      await widgets.requestPayment({
        orderId,
        orderName,
        customerName,
        customerEmail,
        customerMobilePhone: customerMobilePhone || undefined,
        successUrl,
        failUrl,
      })
    } catch (error) {
      console.error('[toss] requestPayment failed', error)
      const message = error instanceof Error ? error.message : '결제 요청에 실패했습니다.'
      onError?.(message)
      setRequesting(false)
    }
  }, [
    widgets,
    ready,
    requesting,
    orderId,
    orderName,
    customerName,
    customerEmail,
    customerMobilePhone,
    successUrl,
    failUrl,
    onError,
  ])

  return (
    <div className="grid gap-4">
      <div id={methodId} />
      <div id={agreementId} />
      <button
        type="button"
        onClick={requestPayment}
        disabled={!ready || requesting}
        className="inline-flex min-h-12 items-center justify-center gap-2 bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {(!ready || requesting) && <Loader2 className="h-4 w-4 animate-spin" />}
        {requesting ? '결제창을 여는 중…' : submitLabel}
      </button>
    </div>
  )
}
