'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'

// 결제 점검 건 취소 화면.
// 관리자 계정 없이도 점검 담당자가 자기가 낸 결제를 바로 되돌릴 수 있게 한다.
// 범위 제한(점검 상품·1,000원 이하·전액만)은 서버(/api/payment-test/refund)에서 강제한다.

type Payment = {
  id: string
  sequence: number
  amount: number
  status: string
  pg_provider: string | null
  paid_at: string | null
  receipt_url: string | null
}

type Lookup = {
  orderNo: string
  status: string
  totalAmount: number
  paidAmount: number
  createdAt: string
  payments: Payment[]
}

const STATUS_LABEL: Record<string, string> = {
  pending: '결제 대기',
  active: '결제 진행',
  completed: '결제 완료',
  refunded: '취소됨',
  paid: '결제 완료',
  failed: '결제 실패',
}

const PROVIDER_LABEL: Record<string, string> = { toss: '토스페이먼츠', paypal: 'PayPal' }

function krw(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`
}

function formatKst(value: string | null): string {
  if (!value) return '-'
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function RefundClient() {
  const [orderNo, setOrderNo] = useState('')
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [refunding, setRefunding] = useState(false)

  const search = async () => {
    const no = orderNo.trim().toUpperCase()
    if (!no) {
      setError('주문번호를 입력해 주세요.')
      return
    }
    setLoading(true)
    setError('')
    setNotice('')
    setLookup(null)
    try {
      const res = await fetch(`/api/payment-test/refund?orderNo=${encodeURIComponent(no)}`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '조회에 실패했습니다.')
      setLookup(json as Lookup)
    } catch (err) {
      setError(err instanceof Error ? err.message : '조회에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const refund = async () => {
    if (!lookup) return
    const paid = lookup.payments.find((row) => row.status === 'paid')
    if (!paid) return
    if (!window.confirm(`${lookup.orderNo} 건을 ${krw(paid.amount)} 전액 취소합니다. 진행할까요?`)) {
      return
    }
    setRefunding(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/payment-test/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNo: lookup.orderNo }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '취소에 실패했습니다.')
      setNotice(
        `취소 완료 — ${json.orderNo} / ${krw(json.refundedAmount)}. ` +
          '카드사 반영에는 영업일 기준 며칠이 걸릴 수 있습니다.',
      )
      await search()
    } catch (err) {
      setError(err instanceof Error ? err.message : '취소에 실패했습니다.')
    } finally {
      setRefunding(false)
    }
  }

  const paidPayment = lookup?.payments.find((row) => row.status === 'paid')

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white pt-16">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            내부 점검용
          </p>
          <h1 className="mt-2 text-2xl font-bold text-zinc-950">결제 점검 건 취소</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            결제 점검(/payment-test)으로 결제하신 건을 전액 취소합니다.
            <br />
            결제 후 화면에 나온 주문번호를 입력해 주세요.
          </p>

          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-700">
            이 화면에서는 점검용 소액 결제만 취소할 수 있습니다.
            <br />
            실제 판매 주문은 조회되지 않으며, 관리자 화면에서만 취소할 수 있습니다.
          </div>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <input
              value={orderNo}
              onChange={(event) => setOrderNo(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') search()
              }}
              placeholder="GRT-260823-A1B2C3"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
              autoComplete="off"
              spellCheck={false}
            />
            <Button onClick={search} disabled={loading} className="shrink-0">
              {loading ? '조회 중…' : '조회'}
            </Button>
          </div>

          {error ? (
            <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          ) : null}
          {notice ? (
            <p className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {notice}
            </p>
          ) : null}

          {lookup ? (
            <div className="mt-8 rounded-lg border border-zinc-200">
              <div className="border-b border-zinc-200 px-5 py-4">
                <p className="font-mono text-sm font-semibold text-zinc-950">{lookup.orderNo}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatKst(lookup.createdAt)} · {STATUS_LABEL[lookup.status] ?? lookup.status}
                </p>
              </div>

              <div className="divide-y divide-zinc-100">
                {lookup.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div className="text-sm text-zinc-700">
                      <span className="font-semibold text-zinc-950">{krw(payment.amount)}</span>
                      <span className="ml-2 text-zinc-500">
                        {payment.pg_provider
                          ? (PROVIDER_LABEL[payment.pg_provider] ?? payment.pg_provider)
                          : '결제수단 미정'}
                      </span>
                      <span className="ml-2 text-zinc-500">
                        {STATUS_LABEL[payment.status] ?? payment.status}
                      </span>
                      {payment.paid_at ? (
                        <span className="ml-2 text-zinc-400">{formatKst(payment.paid_at)}</span>
                      ) : null}
                    </div>
                    {payment.receipt_url ? (
                      <a
                        href={payment.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-zinc-500 underline"
                      >
                        영수증
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-200 px-5 py-4">
                {paidPayment ? (
                  <Button
                    onClick={refund}
                    disabled={refunding}
                    variant="destructive"
                    className="w-full sm:w-auto"
                  >
                    {refunding ? '취소 중…' : `${krw(paidPayment.amount)} 전액 취소`}
                  </Button>
                ) : (
                  <p className="text-sm text-zinc-500">취소할 결제 완료 건이 없습니다.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  )
}
