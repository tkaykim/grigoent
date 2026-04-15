'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Quote } from '@/lib/types'
import { toast } from 'sonner'
import { FileText, Plus, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

function formatKRW(amount: number | null | undefined): string {
  return (amount ?? 0).toLocaleString('ko-KR') + '원'
}

function getDocNumber(id: string): string {
  const numericPart = id.replace(/\D/g, '').slice(-6)
  return `GRG-${numericPart.padStart(6, '0')}`
}

export default function AdminQuotesPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loadingQuotes, setLoadingQuotes] = useState(true)
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
      return
    }
    if (!loading && profile?.type !== 'admin') {
      router.push('/')
      return
    }
    if (!loading && user && profile?.type === 'admin') {
      fetchQuotes()
    }
  }, [user, loading, profile, router])

  const fetchQuotes = async () => {
    try {
      setLoadingQuotes(true)
      const res = await fetch('/api/quotes')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuotes(data.quotes || [])
    } catch (e: any) {
      toast.error('견적서 목록 로드 실패: ' + e.message)
    } finally {
      setLoadingQuotes(false)
    }
  }

  const getStatusBadge = (quote: Quote) => {
    if (quote.status === 'draft') {
      return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> 임시저장</Badge>
    }
    if (quote.client_response === 'approved') {
      return <Badge className="gap-1 bg-green-600"><CheckCircle className="w-3 h-3" /> 승인</Badge>
    }
    if (quote.client_response === 'revision_requested') {
      return <Badge className="gap-1 bg-yellow-500"><AlertCircle className="w-3 h-3" /> 수정요청</Badge>
    }
    if (quote.client_response === 'rejected') {
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> 거절</Badge>
    }
    return <Badge className="gap-1 bg-blue-600"><Send className="w-3 h-3" /> 발송완료</Badge>
  }

  const filtered = quotes
    .filter(q => filter === 'all' || q.status === filter)
    .filter(q => {
      if (!search.trim()) return true
      const s = search.toLowerCase()
      return (
        q.client_name?.toLowerCase().includes(s) ||
        q.client_company?.toLowerCase().includes(s) ||
        q.project_title?.toLowerCase().includes(s) ||
        q.client_email?.toLowerCase().includes(s)
      )
    })

  if (loading) {
    return (
      <div>
        <Header />
        <main className="pt-16 min-h-screen bg-black">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="animate-pulse">
              <div className="h-8 bg-white/10 rounded mb-4" />
              <div className="h-4 bg-white/10 rounded w-1/2" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!user || profile?.type !== 'admin') return null

  return (
    <div>
      <Header />
      <main className="pt-16 min-h-screen bg-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">견적서 관리</h1>
              <p className="text-white/60">견적서를 작성하고 고객에게 발송하세요</p>
            </div>
            <Button
              onClick={() => router.push('/admin/quotes/new')}
              className="gap-2 bg-white text-black hover:bg-gray-200"
            >
              <Plus className="w-4 h-4" /> 새 견적서 작성
            </Button>
          </div>

          {/* 필터 */}
          <div className="flex flex-wrap gap-3 items-center mb-6">
            <input
              type="text"
              placeholder="고객명, 회사명, 프로젝트명 검색"
              className="px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="flex gap-1">
              {(['all', 'draft', 'sent'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded text-sm border transition ${
                    filter === f
                      ? 'bg-white text-black border-white'
                      : 'bg-white/5 text-white/60 border-white/20 hover:bg-white/10'
                  }`}
                >
                  {f === 'all' ? '전체' : f === 'draft' ? '임시저장' : '발송완료'}
                </button>
              ))}
            </div>
            <span className="text-white/40 text-sm ml-auto">
              총 {filtered.length}건
            </span>
          </div>

          {/* 견적서 목록 */}
          {loadingQuotes ? (
            <div className="text-white/60 text-center py-12">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-16 text-center">
                <FileText className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white/60 mb-2">
                  {quotes.length === 0 ? '아직 작성된 견적서가 없습니다' : '검색 결과가 없습니다'}
                </h3>
                <p className="text-white/40 mb-6">
                  {quotes.length === 0 ? '새 견적서를 작성해보세요' : '검색어를 변경해보세요'}
                </p>
                {quotes.length === 0 && (
                  <Button
                    onClick={() => router.push('/admin/quotes/new')}
                    className="gap-2 bg-white text-black hover:bg-gray-200"
                  >
                    <Plus className="w-4 h-4" /> 새 견적서 작성
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(quote => (
                <div
                  key={quote.id}
                  onClick={() => router.push(`/admin/quotes/${quote.id}`)}
                  className="bg-white/5 border border-white/10 rounded-lg p-5 hover:bg-white/10 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-white/40 text-xs font-mono">
                          {getDocNumber(quote.id)}
                        </span>
                        {getStatusBadge(quote)}
                      </div>
                      <h3 className="text-white font-semibold truncate">
                        {quote.project_title || '(프로젝트명 없음)'}
                      </h3>
                      <p className="text-white/60 text-sm mt-1">
                        {quote.client_name}
                        {quote.client_company ? ` · ${quote.client_company}` : ''}
                        {quote.client_email ? ` · ${quote.client_email}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-white font-bold text-lg">
                        {formatKRW(quote.total_amount)}
                      </div>
                      <div className="text-white/40 text-xs mt-1">
                        {new Date(quote.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
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
