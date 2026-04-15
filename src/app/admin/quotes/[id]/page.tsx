'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { QuoteItem } from '@/lib/types'
import { QUOTE_ITEM_PRESETS, PROJECT_TYPES } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Plus,
  Trash2,
  Save,
  Send,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  X,
  ChevronDown,
} from 'lucide-react'

function formatKRW(amount: number | null | undefined): string {
  return (amount ?? 0).toLocaleString('ko-KR') + '원'
}

const emptyItem: QuoteItem = {
  name: '',
  category: '',
  qty: 1,
  unit: '건',
  unit_price: 0,
  amount: 0,
}

export default function AdminQuoteEditPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const quoteId = params.id as string
  const isNew = quoteId === 'new'
  const inquiryId = searchParams.get('inquiry_id')

  // 견적서 데이터
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [projectType, setProjectType] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([{ ...emptyItem }])
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [ccInput, setCcInput] = useState('')

  // 상태
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(isNew ? null : quoteId)
  const [status, setStatus] = useState<'draft' | 'sent'>('draft')
  const [clientResponse, setClientResponse] = useState<string | null>(null)
  const [clientResponseNote, setClientResponseNote] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [loadingQuote, setLoadingQuote] = useState(!isNew)
  const [presetsOpen, setPresetsOpen] = useState(false)

  // 금액 계산
  const calcAmounts = useCallback((currentItems: QuoteItem[]) => {
    const supply = currentItems.reduce((sum, i) => sum + (i.amount || 0), 0)
    const vat = Math.round(supply * 0.1)
    return { supply_amount: supply, vat, total_amount: supply + vat }
  }, [])

  const [amounts, setAmounts] = useState({ supply_amount: 0, vat: 0, total_amount: 0 })

  useEffect(() => {
    setAmounts(calcAmounts(items))
  }, [items, calcAmounts])

  // 기존 견적서 로드
  useEffect(() => {
    if (!isNew && !loading && user && profile?.type === 'admin') {
      loadQuote()
    }
  }, [isNew, loading, user, profile])

  // 문의 연동 시 고객정보 자동 로드
  useEffect(() => {
    if (isNew && inquiryId && !loading && user) {
      loadInquiry(inquiryId)
    }
  }, [isNew, inquiryId, loading, user])

  const loadQuote = async () => {
    try {
      setLoadingQuote(true)
      const res = await fetch('/api/quotes')
      const data = await res.json()
      const quote = (data.quotes || []).find((q: any) => q.id === quoteId)
      if (!quote) {
        toast.error('견적서를 찾을 수 없습니다.')
        router.push('/admin/quotes')
        return
      }

      setClientName(quote.client_name || '')
      setClientEmail(quote.client_email || '')
      setClientPhone(quote.client_phone || '')
      setClientCompany(quote.client_company || '')
      setProjectTitle(quote.project_title || '')
      setProjectType(quote.project_type || '')
      setItems(quote.items?.length ? quote.items : [{ ...emptyItem }])
      setValidUntil(quote.valid_until || '')
      setNotes(quote.notes || '')
      setStatus(quote.status)
      setClientResponse(quote.client_response)
      setClientResponseNote(quote.client_response_note)
      setSavedQuoteId(quote.id)
    } catch (e: any) {
      toast.error('견적서 로드 실패: ' + e.message)
    } finally {
      setLoadingQuote(false)
    }
  }

  const loadInquiry = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) return

      setClientName(data.name || '')
      setClientPhone(data.contact || '')
      setProjectTitle(data.title || '')
    } catch {
      // ignore
    }
  }

  // 품목 관리
  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    setItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'qty' || field === 'unit_price') {
        updated[index].amount = (updated[index].qty || 0) * (updated[index].unit_price || 0)
      }
      return updated
    })
  }

  const addItem = () => {
    setItems(prev => [...prev, { ...emptyItem }])
  }

  const addPresetItem = (category: string, itemName: string) => {
    const preset = QUOTE_ITEM_PRESETS.find(p => p.category === category)
    setItems(prev => [
      ...prev,
      {
        name: itemName,
        category: preset?.label || '',
        qty: 1,
        unit: category === 'dancer_casting' ? '명' : category === 'rehearsal' ? '일' : '건',
        unit_price: 0,
        amount: 0,
      },
    ])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      toast.error('최소 1개 품목이 필요합니다.')
      return
    }
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  // CC 이메일
  const addCcEmail = () => {
    const email = ccInput.trim()
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('올바른 이메일 형식이 아닙니다.')
      return
    }
    if (ccEmails.includes(email)) {
      toast.error('이미 추가된 이메일입니다.')
      return
    }
    setCcEmails(prev => [...prev, email])
    setCcInput('')
  }

  const removeCcEmail = (email: string) => {
    setCcEmails(prev => prev.filter(e => e !== email))
  }

  // 저장
  const saveQuote = async (): Promise<string | null> => {
    if (!clientName.trim() || !clientEmail.trim()) {
      toast.error('고객 이름과 이메일은 필수입니다.')
      return null
    }

    setSaving(true)
    try {
      const body = {
        ...(savedQuoteId ? { id: savedQuoteId } : {}),
        inquiry_id: inquiryId || null,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        client_company: clientCompany,
        project_title: projectTitle,
        project_type: projectType,
        items,
        ...amounts,
        valid_until: validUntil || null,
        notes,
      }

      const res = await fetch('/api/quotes', {
        method: savedQuoteId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const id = data.quote?.id || savedQuoteId
      setSavedQuoteId(id)
      toast.success('견적서가 저장되었습니다.')

      if (isNew && id) {
        router.replace(`/admin/quotes/${id}`)
      }

      return id
    } catch (e: any) {
      toast.error('저장 실패: ' + e.message)
      return null
    } finally {
      setSaving(false)
    }
  }

  // 발송
  const sendQuote = async () => {
    const id = await saveQuote()
    if (!id) return

    setSending(true)
    try {
      const res = await fetch('/api/quotes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: id, ccEmails }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setStatus('sent')
      setClientResponse('pending')
      toast.success('견적서가 발송되었습니다!')
    } catch (e: any) {
      toast.error('발송 실패: ' + e.message)
    } finally {
      setSending(false)
    }
  }

  // 로딩/권한
  useEffect(() => {
    if (!loading && !user) router.push('/signin')
    if (!loading && profile?.type !== 'admin') router.push('/')
  }, [loading, user, profile, router])

  if (loading || loadingQuote) {
    return (
      <div>
        <Header />
        <main className="pt-16 min-h-screen bg-black">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-white/10 rounded w-1/3" />
              <div className="h-64 bg-white/10 rounded" />
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* 상단 네비게이션 */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/admin/quotes')}
              className="flex items-center gap-2 text-white/60 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" /> 목록으로
            </button>
            <div className="flex gap-2">
              <Button
                onClick={saveQuote}
                disabled={saving || sending}
                variant="outline"
                className="gap-2 border-white/20 text-white hover:bg-white/10"
              >
                <Save className="w-4 h-4" /> {saving ? '저장 중...' : '저장'}
              </Button>
              {status !== 'sent' && (
                <Button
                  onClick={sendQuote}
                  disabled={saving || sending}
                  className="gap-2 bg-white text-black hover:bg-gray-200"
                >
                  <Send className="w-4 h-4" /> {sending ? '발송 중...' : '견적서 발송'}
                </Button>
              )}
            </div>
          </div>

          {/* 고객 응답 상태 */}
          {status === 'sent' && clientResponse && (
            <div
              className={`mb-6 p-4 rounded-lg border ${
                clientResponse === 'pending'
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : clientResponse === 'approved'
                  ? 'bg-green-500/10 border-green-500/30'
                  : clientResponse === 'revision_requested'
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {clientResponse === 'pending' && <Clock className="w-5 h-5 text-blue-400" />}
                {clientResponse === 'approved' && <CheckCircle className="w-5 h-5 text-green-400" />}
                {clientResponse === 'revision_requested' && <AlertCircle className="w-5 h-5 text-yellow-400" />}
                {clientResponse === 'rejected' && <XCircle className="w-5 h-5 text-red-400" />}
                <span className="text-white font-semibold">
                  {clientResponse === 'pending' && '발송 완료 — 고객 응답 대기 중'}
                  {clientResponse === 'approved' && '고객이 견적을 승인했습니다'}
                  {clientResponse === 'revision_requested' && '고객이 수정을 요청했습니다'}
                  {clientResponse === 'rejected' && '고객이 견적을 거절했습니다'}
                </span>
              </div>
              {clientResponseNote && (
                <p className="text-white/70 text-sm mt-2 pl-7">{clientResponseNote}</p>
              )}
            </div>
          )}

          <h1 className="text-2xl font-bold text-white mb-6">
            {isNew ? '새 견적서 작성' : '견적서 편집'}
          </h1>

          {/* 고객 정보 */}
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-lg">고객 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/60 text-sm mb-1">고객명 *</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
                    placeholder="홍길동"
                    disabled={status === 'sent'}
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-sm mb-1">이메일 *</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
                    placeholder="client@email.com"
                    disabled={status === 'sent'}
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-sm mb-1">연락처</label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
                    placeholder="010-1234-5678"
                    disabled={status === 'sent'}
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-sm mb-1">회사/소속</label>
                  <input
                    type="text"
                    value={clientCompany}
                    onChange={e => setClientCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
                    placeholder="회사명"
                    disabled={status === 'sent'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 프로젝트 정보 */}
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-lg">프로젝트 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/60 text-sm mb-1">프로젝트명</label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={e => setProjectTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
                    placeholder="예: OO 아이돌 컴백 안무"
                    disabled={status === 'sent'}
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-sm mb-1">프로젝트 유형</label>
                  <select
                    value={projectType}
                    onChange={e => setProjectType(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
                    disabled={status === 'sent'}
                  >
                    <option value="">선택</option>
                    {PROJECT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/60 text-sm mb-1">견적 유효기간</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={e => setValidUntil(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
                    disabled={status === 'sent'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 프리셋 품목 */}
          {status !== 'sent' && (
            <Card className="bg-white/5 border-white/10 mb-6">
              <CardHeader>
                <button
                  type="button"
                  onClick={() => setPresetsOpen(prev => !prev)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <CardTitle className="text-white text-lg">프리셋 품목 추가</CardTitle>
                  <ChevronDown className={`w-5 h-5 text-white/60 transition-transform ${presetsOpen ? 'rotate-180' : ''}`} />
                </button>
              </CardHeader>
              {presetsOpen && (
                <CardContent>
                  <div className="space-y-3">
                    {QUOTE_ITEM_PRESETS.map(preset => (
                      <div key={preset.category}>
                        <div className="text-white/60 text-xs mb-1.5 font-semibold">{preset.label}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {preset.items.map(item => (
                            <button
                              key={item}
                              onClick={() => addPresetItem(preset.category, item)}
                              className="px-2.5 py-1 text-xs rounded border border-white/20 text-white/70 hover:bg-white/10 hover:text-white transition"
                            >
                              + {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* 품목 테이블 */}
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-lg">견적 품목</CardTitle>
                {status !== 'sent' && (
                  <Button
                    onClick={addItem}
                    variant="outline"
                    size="sm"
                    className="gap-1 border-white/20 text-white hover:bg-white/10"
                  >
                    <Plus className="w-3 h-3" /> 품목 추가
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-white/50 py-2 px-2 w-24">카테고리</th>
                      <th className="text-left text-white/50 py-2 px-2">품목명</th>
                      <th className="text-center text-white/50 py-2 px-2 w-20">수량</th>
                      <th className="text-center text-white/50 py-2 px-2 w-16">단위</th>
                      <th className="text-right text-white/50 py-2 px-2 w-28">단가</th>
                      <th className="text-right text-white/50 py-2 px-2 w-28">금액</th>
                      {status !== 'sent' && <th className="w-10"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.category || ''}
                            onChange={e => updateItem(i, 'category', e.target.value)}
                            className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs"
                            placeholder="카테고리"
                            disabled={status === 'sent'}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={e => updateItem(i, 'name', e.target.value)}
                            className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs"
                            placeholder="품목명"
                            disabled={status === 'sent'}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={e => updateItem(i, 'qty', Number(e.target.value))}
                            className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs text-center"
                            min={1}
                            disabled={status === 'sent'}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={item.unit}
                            onChange={e => updateItem(i, 'unit', e.target.value)}
                            className="w-full px-1 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs"
                            disabled={status === 'sent'}
                          >
                            <option value="건">건</option>
                            <option value="명">명</option>
                            <option value="일">일</option>
                            <option value="회">회</option>
                            <option value="곡">곡</option>
                            <option value="식">식</option>
                            <option value="개">개</option>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={e => updateItem(i, 'unit_price', Number(e.target.value))}
                            className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs text-right"
                            min={0}
                            disabled={status === 'sent'}
                          />
                        </td>
                        <td className="py-2 px-2 text-right text-white font-semibold text-xs">
                          {formatKRW(item.amount)}
                        </td>
                        {status !== 'sent' && (
                          <td className="py-2 px-1">
                            <button
                              onClick={() => removeItem(i)}
                              className="p-1 text-white/30 hover:text-red-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 합계 */}
              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="flex justify-end gap-8 text-sm">
                  <div className="space-y-2 text-right">
                    <div className="text-white/50">공급가액</div>
                    <div className="text-white/50">부가세 (10%)</div>
                    <div className="text-white text-lg font-bold pt-2 border-t border-white/20">합계</div>
                  </div>
                  <div className="space-y-2 text-right min-w-[120px]">
                    <div className="text-white">{formatKRW(amounts.supply_amount)}</div>
                    <div className="text-white">{formatKRW(amounts.vat)}</div>
                    <div className="text-white text-lg font-bold pt-2 border-t border-white/20">
                      {formatKRW(amounts.total_amount)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 비고 */}
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-lg">비고</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full h-32 px-3 py-2 rounded bg-white/10 border border-white/20 text-white resize-none"
                placeholder="추가 안내사항이나 조건을 입력하세요"
                disabled={status === 'sent'}
              />
            </CardContent>
          </Card>

          {/* CC 이메일 */}
          {status !== 'sent' && (
            <Card className="bg-white/5 border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="text-white text-lg">CC (참조 이메일)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3">
                  <input
                    type="email"
                    value={ccInput}
                    onChange={e => setCcInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCcEmail())}
                    className="flex-1 px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
                    placeholder="cc@email.com"
                  />
                  <Button
                    onClick={addCcEmail}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    추가
                  </Button>
                </div>
                {ccEmails.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {ccEmails.map(email => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-sm"
                      >
                        {email}
                        <button onClick={() => removeCcEmail(email)} className="hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 하단 액션 */}
          <div className="flex justify-end gap-3">
            <Button
              onClick={saveQuote}
              disabled={saving || sending}
              variant="outline"
              className="gap-2 border-white/20 text-white hover:bg-white/10"
            >
              <Save className="w-4 h-4" /> {saving ? '저장 중...' : '저장'}
            </Button>
            {status !== 'sent' && (
              <Button
                onClick={sendQuote}
                disabled={saving || sending}
                className="gap-2 bg-white text-black hover:bg-gray-200"
              >
                <Send className="w-4 h-4" /> {sending ? '발송 중...' : '견적서 발송'}
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
