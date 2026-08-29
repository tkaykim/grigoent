'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

// 결제 주문 조회 전용 화면.
//
// 취소·전액환불·부분환불은 deetz 통합 결제 장부의 2인 승인 흐름에서만 실행한다.

type Payment = {
  id: string
  sequence: number
  amount: number
  currency: string
  status: string
  pg_provider: string | null
  payment_key: string | null
  paid_at: string | null
  receipt_url: string | null
  failure_reason: string | null
}

type Order = {
  id: string
  order_no: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  customer_nationality: string | null
  total_amount: number
  paid_amount: number
  status: string
  pg_provider: string | null
  visa_application_id: string | null
  memo: string | null
  created_at: string
  payments: Payment[]
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '결제 대기',
  active: '결제 진행',
  completed: '결제 완료',
  failed: '결제 실패',
  refunded: '환불됨',
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

function effectiveOrderStatus(order: Order): string {
  if (order.paid_amount <= 0 && order.payments.some((payment) => payment.status === 'failed')) return 'failed'
  return order.status
}

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('no_session')
  return { Authorization: `Bearer ${session.access_token}` }
}

export default function AdminTrainingOrdersPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const isAdmin = profile?.type === 'admin'

  const [items, setItems] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/training-orders', {
        cache: 'no-store',
        headers: await authHeaders(),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'failed')
      setItems(json.items || [])
      setError('')
    } catch {
      setError('목록을 불러오지 못했습니다. 관리자 계정으로 로그인했는지 확인해 주세요.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) {
      setLoading(false)
      return
    }
    load()
  }, [authLoading, isAdmin, load])

  if (!authLoading && !isAdmin) {
    return (
      <div>
        <Header />
        <main className="flex min-h-screen items-center justify-center px-4 pt-16">
          <p className="text-zinc-600">관리자만 접근할 수 있습니다.</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div>
      <Header />
      <main className="min-h-screen bg-zinc-50 pt-16">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-zinc-900">결제 주문</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={load}>
                새로고침
              </Button>
              <Button variant="outline" onClick={() => router.push('/admin')}>
                관리자 홈
              </Button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            <p>취소·전액환불·부분환불은 deetz 통합 결제 장부에서 요청하고 다른 관리자가 승인합니다.</p>
            <a
              href="https://www.deetz.kr/admin/payments"
              className="shrink-0 bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800"
            >
              통합 결제 장부 열기
            </a>
          </div>
          {error ? (
            <p className="mb-4 border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>
          ) : null}

          {loading ? (
            <p className="text-sm text-zinc-500">불러오는 중…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500">주문이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {items.map((order) => (
                <div key={order.id} className="border border-zinc-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-zinc-900">
                        {order.order_no}
                      </p>
                      <p className="mt-1 text-sm text-zinc-700">
                        {order.customer_name} · {order.customer_email}
                        {order.customer_phone ? ` · ${order.customer_phone}` : ''}
                        {order.customer_nationality ? ` · ${order.customer_nationality}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{formatKst(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                        {ORDER_STATUS_LABEL[effectiveOrderStatus(order)] ?? effectiveOrderStatus(order)}
                      </span>
                      <p className="mt-2 text-sm text-zinc-900">
                        {krw(order.paid_amount)} / {krw(order.total_amount)}
                      </p>
                      {order.visa_application_id ? (
                        <p className="mt-1 text-xs text-sky-700">deetz 비자 케이스 연결됨</p>
                      ) : null}
                    </div>
                  </div>

                  {order.memo ? (
                    <p className="mt-3 whitespace-pre-line border-l-2 border-zinc-200 pl-3 text-xs text-zinc-600">
                      {order.memo}
                    </p>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    {order.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex flex-wrap items-center justify-between gap-3 border border-zinc-200 bg-zinc-50 px-3 py-2.5"
                      >
                        <div className="text-xs text-zinc-700">
                          <span className="font-semibold">{payment.sequence}회차</span>
                          <span className="mx-2 text-zinc-400">·</span>
                          {krw(payment.amount)}
                          <span className="mx-2 text-zinc-400">·</span>
                          {payment.status === 'paid'
                            ? '결제 완료'
                            : payment.status === 'refunded'
                              ? '환불됨'
                              : payment.status === 'failed'
                                ? '결제 실패'
                                : '대기'}
                          {payment.pg_provider ? (
                            <>
                              <span className="mx-2 text-zinc-400">·</span>
                              {PROVIDER_LABEL[payment.pg_provider] ?? payment.pg_provider}
                            </>
                          ) : null}
                          {payment.paid_at ? (
                            <>
                              <span className="mx-2 text-zinc-400">·</span>
                              {formatKst(payment.paid_at)}
                            </>
                          ) : null}
                          {payment.failure_reason ? (
                            <p className="mt-1 text-zinc-500">{payment.failure_reason}</p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {payment.receipt_url ? (
                            <a
                              href={payment.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-700 hover:border-zinc-500"
                            >
                              영수증
                            </a>
                          ) : null}
                          {payment.status === 'paid' ? (
                            <a
                              href="https://www.deetz.kr/admin/payments"
                              className="bg-sky-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-800"
                            >
                              deetz에서 처리
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
