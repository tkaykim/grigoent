'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { formatKrw } from '@/lib/training-package'

type Result = {
  success: boolean
  orderNo?: string | null
  sequence?: number
  installmentMonths?: number
  paidAmount?: number
  totalAmount?: number
  receiptUrl?: string | null
  error?: string
}

export function SuccessClient() {
  const params = useSearchParams()
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
      setResult({ success: false, error: '결제 정보가 확인되지 않았습니다.' })
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
        setResult({ success: false, error: '결제 확인 중 오류가 발생했습니다.' })
      }
    })()
  }, [paymentKey, orderId, amount, provider, params])

  return (
    <>
      <Header />
      <main className="bg-white pt-16">
        <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6 lg:px-8">
          {!result ? (
            <div className="flex flex-col items-center text-center">
              <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
              <p className="mt-4 text-sm text-zinc-600">결제를 확인하고 있습니다.</p>
            </div>
          ) : result.success ? (
            <div className="border border-zinc-950 p-8">
              <CheckCircle2 className="h-10 w-10 text-zinc-950" />
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-950">결제가 완료되었습니다.</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-600 [word-break:keep-all]">
                담당자가 확인 후 진행 일정을 안내드립니다.
              </p>
              <dl className="mt-8 grid gap-3 border-t border-zinc-300 pt-6 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">주문번호</dt>
                  <dd className="font-semibold text-zinc-950">{result.orderNo ?? '-'}</dd>
                </div>
                {result.installmentMonths && result.installmentMonths > 1 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">결제 회차</dt>
                    <dd className="font-semibold text-zinc-950">
                      {result.sequence} / {result.installmentMonths}회
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">결제 누계</dt>
                  <dd className="font-semibold text-zinc-950">
                    {formatKrw(result.paidAmount ?? 0)} / {formatKrw(result.totalAmount ?? 0)}
                  </dd>
                </div>
              </dl>
              <div className="mt-8 flex flex-wrap gap-3">
                {result.receiptUrl ? (
                  <a
                    href={result.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center border border-zinc-300 px-5 text-sm font-semibold text-zinc-950 transition hover:border-zinc-950"
                  >
                    영수증 보기
                  </a>
                ) : null}
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  홈으로
                </Link>
              </div>
            </div>
          ) : (
            <div className="border border-zinc-300 p-8">
              <XCircle className="h-10 w-10 text-red-600" />
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-950">결제를 확인하지 못했습니다.</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-600 [word-break:keep-all]">
                {result.error ?? '잠시 후 다시 시도해 주세요.'}
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-600 [word-break:keep-all]">
                결제가 이루어졌는데 이 화면이 보이면 주문번호와 함께 문의해 주세요.
              </p>
              <Link
                href="/training"
                className="mt-8 inline-flex min-h-11 items-center bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                다시 시도하기
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
