'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type FeeReportRow = {
  id: string
  created_at: string
  work_categories: string[]
  client_type: string
  counterparty_note: string
  amount_note: string
  pay_type_note: string
  facts: string
  reporter_name: string | null
  reporter_contact: string | null
  reporter_instagram: string | null
  consent_accepted: boolean
}

const WORK_LABEL: Record<string, string> = {
  choreography: '안무 제작',
  performance: '공연',
  dancer_casting: '댄서 출연·섭외',
  advertisement: '광고',
  other: '기타',
}

const CLIENT_LABEL: Record<string, string> = {
  company: '회사·사업자',
  individual: '개인',
  unknown: '불명',
}

export default function AdminFeeReportsPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const isAdmin = profile?.type === 'admin'
  const [items, setItems] = useState<FeeReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) {
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const res = await fetch('/api/admin/fee-reports', { cache: 'no-store', credentials: 'include' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'failed')
        setItems(json.items || [])
      } catch {
        setError('목록을 불러오지 못했습니다. Supabase 테이블·RLS(sql/fee-payment-reports.sql) 적용 여부를 확인해 주세요.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authLoading, isAdmin])

  if (!authLoading && !isAdmin) {
    return (
      <div>
        <Header />
        <main className="pt-16 min-h-screen flex items-center justify-center px-4">
          <p className="text-zinc-600">관리자만 접근할 수 있습니다.</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div>
      <Header />
      <main className="pt-16 min-h-screen bg-zinc-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between gap-4 mb-8">
            <h1 className="text-2xl font-bold text-zinc-900">미수·정산 제보</h1>
            <Button variant="outline" onClick={() => router.push('/admin')}>
              관리자 홈
            </Button>
          </div>

          {loading ? (
            <p className="text-zinc-600">불러오는 중…</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-zinc-600">접수된 제보가 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {items.map((row) => (
                <Card key={row.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base font-medium">
                        {new Date(row.created_at).toLocaleString('ko-KR')}
                      </CardTitle>
                      <Button size="sm" variant="ghost" onClick={() => setOpenId(openId === row.id ? null : row.id)}>
                        {openId === row.id ? '접기' : '펼치기'}
                      </Button>
                    </div>
                    <p className="text-xs text-zinc-500">ID: {row.id}</p>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="text-zinc-500">업무: </span>
                      {(row.work_categories || [])
                        .map((c) => WORK_LABEL[c] || c)
                        .join(', ') || '—'}
                    </div>
                    <div>
                      <span className="text-zinc-500">의뢰인: </span>
                      {CLIENT_LABEL[row.client_type] || row.client_type}
                    </div>
                    <div>
                      <span className="text-zinc-500">금액: </span>
                      {row.amount_note}
                    </div>
                    <div>
                      <span className="text-zinc-500">대금 성격: </span>
                      {row.pay_type_note}
                    </div>
                    {openId === row.id && (
                      <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 text-zinc-800">
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 uppercase">상대·채권 정보</p>
                          <p className="whitespace-pre-wrap">{row.counterparty_note}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 uppercase">정황·사실</p>
                          <p className="whitespace-pre-wrap">{row.facts}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 uppercase">제보자 (비공개 수집)</p>
                          <p>
                            {row.reporter_name || '—'} / {row.reporter_contact || '—'}
                          </p>
                          <p className="mt-1">
                            <span className="text-zinc-500">인스타그램: </span>
                            {row.reporter_instagram ? `@${row.reporter_instagram}` : '—'}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
