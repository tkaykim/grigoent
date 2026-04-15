'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { Quote } from '@/lib/types'
import { PROJECT_TYPES } from '@/lib/types'
import { CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react'

function formatKRW(amount: number | null | undefined): string {
  return (amount ?? 0).toLocaleString('ko-KR') + '원'
}

function getDocNumber(id: string): string {
  const numericPart = id.replace(/\D/g, '').slice(-6)
  return `GE-${numericPart.padStart(6, '0')}`
}

export default function QuoteViewPage() {
  const params = useParams()
  const token = params.token as string

  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [responding, setResponding] = useState(false)
  const [responded, setResponded] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState<'revision_requested' | 'rejected' | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (token) loadQuote()
  }, [token])

  const loadQuote = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/quotes/view?token=${token}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuote(data.quote)

      if (data.quote?.client_response && data.quote.client_response !== 'pending') {
        setResponded(true)
      }
    } catch (e: any) {
      setError(e.message || '견적서를 찾을 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const respond = async (response: 'approved' | 'revision_requested' | 'rejected') => {
    if (response !== 'approved' && !showNoteForm) {
      setShowNoteForm(response)
      return
    }

    setResponding(true)
    try {
      const res = await fetch('/api/quotes/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, response, note: note || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResponded(true)
      setQuote(prev => prev ? { ...prev, client_response: response } : null)
    } catch (e: any) {
      alert('응답 처리 실패: ' + e.message)
    } finally {
      setResponding(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">견적서를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">견적서를 찾을 수 없습니다</h2>
          <p className="text-gray-500">{error || '유효하지 않은 링크이거나 만료된 견적서입니다.'}</p>
        </div>
      </div>
    )
  }

  const docNumber = getDocNumber(quote.id)
  const projectTypeLabel = PROJECT_TYPES.find(t => t.value === quote.project_type)?.label || quote.project_type

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-8 py-6 border-b-[3px] border-black flex justify-between items-end">
            <div>
              <h1 className="text-xl font-extrabold tracking-wide">그리고 엔터테인먼트</h1>
              <p className="text-xs text-gray-400 mt-0.5">GRIGO Entertainment</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-light tracking-[8px] text-gray-600">견 적 서</p>
              <p className="text-xs text-gray-400 mt-1">No. {docNumber}</p>
            </div>
          </div>

          <div className="p-8">
            {/* 발행자 정보 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
              <div className="grid grid-cols-[80px_1fr] gap-y-1 text-gray-600">
                <span className="text-gray-400">상호</span>
                <span>(주) 그리고 엔터테인먼트</span>
                <span className="text-gray-400">업태 / 종목</span>
                <span>서비스업 / 공연, 엔터테인먼트</span>
              </div>
            </div>

            {/* 프로젝트 */}
            {quote.project_title && (
              <div className="bg-gray-50 border-l-4 border-black rounded p-4 mb-6">
                <p className="text-xs text-gray-400 tracking-wider mb-1">PROJECT</p>
                <p className="font-bold text-lg">{quote.project_title}</p>
                {projectTypeLabel && (
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-gray-200 rounded">{projectTypeLabel}</span>
                )}
              </div>
            )}

            {/* 정보 카드 */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">수신</p>
                <p className="font-bold text-sm">
                  {quote.client_name}님
                  {quote.client_company ? ` (${quote.client_company})` : ''}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">발행일</p>
                <p className="font-bold text-sm">
                  {quote.sent_at ? new Date(quote.sent_at).toLocaleDateString('ko-KR') : '-'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">유효기간</p>
                <p className="font-bold text-sm">
                  {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('ko-KR') : '-'}
                </p>
              </div>
            </div>

            {/* 품목 테이블 */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="text-left py-3 px-4 font-semibold rounded-tl">카테고리</th>
                    <th className="text-left py-3 px-4 font-semibold">품목</th>
                    <th className="text-center py-3 px-4 font-semibold">수량</th>
                    <th className="text-right py-3 px-4 font-semibold">단가</th>
                    <th className="text-right py-3 px-4 font-semibold rounded-tr">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {(quote.items ?? []).map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                      <td className="py-3 px-4 text-gray-500">{item.category || '-'}</td>
                      <td className="py-3 px-4">{item.name}</td>
                      <td className="py-3 px-4 text-center">{item.qty}{item.unit || ''}</td>
                      <td className="py-3 px-4 text-right">{formatKRW(item.unit_price)}</td>
                      <td className="py-3 px-4 text-right font-semibold">{formatKRW(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 합계 */}
            <div className="flex justify-end mb-6">
              <div className="w-64">
                <div className="flex justify-between py-2 text-sm text-gray-500">
                  <span>공급가액</span>
                  <span>{formatKRW(quote.supply_amount)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm text-gray-500">
                  <span>부가세 (10%)</span>
                  <span>{formatKRW(quote.vat)}</span>
                </div>
                <div className="flex justify-between py-3 border-t-2 border-black font-bold text-lg">
                  <span>합계</span>
                  <span>{formatKRW(quote.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* 비고 */}
            {quote.notes && (
              <div className="bg-amber-50 border-l-4 border-amber-400 rounded p-4 mb-8">
                <p className="text-xs text-gray-400 mb-2">비고</p>
                <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}

            {/* 응답 섹션 */}
            {responded || (quote.client_response && quote.client_response !== 'pending') ? (
              <div className={`rounded-xl p-6 text-center ${
                (quote.client_response === 'approved') ? 'bg-green-50 border border-green-200' :
                (quote.client_response === 'revision_requested') ? 'bg-yellow-50 border border-yellow-200' :
                'bg-red-50 border border-red-200'
              }`}>
                {quote.client_response === 'approved' && (
                  <>
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-green-700">견적이 승인되었습니다</h3>
                    <p className="text-green-600 text-sm mt-1">감사합니다. 담당자가 곧 연락드리겠습니다.</p>
                  </>
                )}
                {quote.client_response === 'revision_requested' && (
                  <>
                    <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-yellow-700">수정 요청이 접수되었습니다</h3>
                    <p className="text-yellow-600 text-sm mt-1">담당자가 검토 후 수정된 견적서를 보내드리겠습니다.</p>
                  </>
                )}
                {quote.client_response === 'rejected' && (
                  <>
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-red-700">견적이 거절되었습니다</h3>
                    <p className="text-red-600 text-sm mt-1">의견을 반영하여 다시 연락드리겠습니다.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="border-t pt-8">
                <h3 className="text-center text-lg font-bold mb-6">견적에 대한 의견을 알려주세요</h3>

                {showNoteForm && (
                  <div className="mb-6">
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      className="w-full h-24 px-4 py-3 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black/20"
                      placeholder={
                        showNoteForm === 'revision_requested'
                          ? '수정이 필요한 부분을 알려주세요...'
                          : '거절 사유를 알려주세요 (선택사항)...'
                      }
                    />
                  </div>
                )}

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => respond('approved')}
                    disabled={responding}
                    className="px-8 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {responding ? '처리 중...' : '승인합니다'}
                  </button>
                  <button
                    onClick={() => respond('revision_requested')}
                    disabled={responding}
                    className="px-8 py-3 rounded-lg bg-yellow-500 text-white font-semibold hover:bg-yellow-600 transition disabled:opacity-50"
                  >
                    {showNoteForm === 'revision_requested' ? '수정 요청 전송' : '수정 요청'}
                  </button>
                  <button
                    onClick={() => respond('rejected')}
                    disabled={responding}
                    className="px-8 py-3 rounded-lg bg-gray-400 text-white font-semibold hover:bg-gray-500 transition disabled:opacity-50"
                  >
                    {showNoteForm === 'rejected' ? '거절 전송' : '거절'}
                  </button>
                </div>

                {showNoteForm && (
                  <div className="text-center mt-3">
                    <button
                      onClick={() => { setShowNoteForm(null); setNote('') }}
                      className="text-sm text-gray-400 hover:text-gray-600"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="px-8 py-4 bg-gray-50 border-t text-center">
            <p className="text-xs font-semibold text-gray-500">그리고 엔터테인먼트 | GRIGO Entertainment</p>
            <p className="text-xs text-gray-400 mt-0.5">(주) 그리고 엔터테인먼트 | {docNumber}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
