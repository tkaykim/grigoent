'use client'

import { useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

type InquiryListItem = {
  id: string
  type: string
  title: string
  created_at: string
  status?: string
  reply_count?: number
}

type InquiryDetail = {
  id: string
  type: string
  title: string
  content: string
  name?: string
  contact?: string
  created_at: string
  status?: string
}

type InquiryReply = {
  id: string
  content: string
  created_at: string
}

const categories = [
  '전체',
  '안무제작(앨범,광고,행사 등)',
  '행사섭외(공연,심사,게스트 등)',
  '광고(SNS, TVC 등)',
  '레슨(티칭,워크샵,디렉팅 등)',
  '댄서 섭외(안무시안,백업,모션캡쳐 등)',
  '기타(자율문의)'
]

export default function AdminInquiriesPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.type === 'admin'
  const [items, setItems] = useState<InquiryListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('전체')
  const [status, setStatus] = useState<'all'|'pending'|'answered'>('all')
  const [openId, setOpenId] = useState<string|undefined>()
  const [detail, setDetail] = useState<Record<string, InquiryDetail | undefined>>({})
  const [replies, setReplies] = useState<Record<string, InquiryReply[]>>({})
  const [reply, setReply] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [deletingInquiryId, setDeletingInquiryId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const qs = new URLSearchParams()
        if (cat !== '전체') qs.set('type', cat)
        const res = await fetch(`/api/inquiries?${qs.toString()}`, { cache: 'no-store', credentials: 'include' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'failed')
        setItems(json.items || [])
      } catch (e) {
        setError('문의 목록을 불러오지 못했습니다')
      } finally {
        setLoading(false)
      }
    }
    if (isAdmin) load()
  }, [isAdmin, cat])

  const filtered = useMemo(() => {
    return (items || [])
      .filter(it => status === 'all' ? true : (status === 'answered' ? it.status === 'answered' : (it.status !== 'answered')))
      .filter(it => {
        if (!q.trim()) return true
        const s = q.toLowerCase()
        return it.title.toLowerCase().includes(s) || it.type.toLowerCase().includes(s)
      })
  }, [items, q, status])

  const toggleOpen = async (id: string) => {
    if (openId === id) { setOpenId(undefined); return }
    setOpenId(id)
    if (!detail[id]) {
      // 클라이언트에서 직접 조회 (RLS 비활성 또는 공개 select 정책 가정)
      const { data } = await supabase
        .from('inquiries')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (data) setDetail(prev => ({ ...prev, [id]: data as any }))
    }
    if (!replies[id]) {
      const { data: reps } = await supabase
        .from('inquiry_replies')
        .select('id, content, created_at')
        .eq('inquiry_id', id)
        .order('created_at', { ascending: true })
      if (reps) setReplies(prev => ({ ...prev, [id]: reps as any }))
    }
  }

  const submitReply = async (id: string) => {
    if (!reply.trim()) return
    setSaving(true)
    try {
      // API 대신 클라이언트에서 직접 입력 (RLS 비활성 기준)
      await supabase.from('inquiry_replies').insert({ inquiry_id: id, content: reply })
      await supabase.from('inquiries').update({ status: 'answered' }).eq('id', id)
      setReply('')
      // 목록 상태/카운트 갱신
      setItems(prev => prev.map(x => x.id === id ? { ...x, status: 'answered', reply_count: (x.reply_count || 0) + 1 } : x))
      // 답변 목록 재조회
      const { data: reps } = await supabase
        .from('inquiry_replies')
        .select('id, content, created_at')
        .eq('inquiry_id', id)
        .order('created_at', { ascending: true })
      if (reps) setReplies(prev => ({ ...prev, [id]: reps as any }))
    } finally {
      setSaving(false)
    }
  }

  const startEditReply = (rid: string, content: string) => {
    setEditingReplyId(rid)
    setEditingText(content)
  }

  const cancelEditReply = () => {
    setEditingReplyId(null)
    setEditingText('')
  }

  const saveEditReply = async (inquiryId: string, replyId: string) => {
    if (!editingText.trim()) return
    await supabase.from('inquiry_replies').update({ content: editingText }).eq('id', replyId)
    // 로컬 갱신
    setReplies(prev => ({
      ...prev,
      [inquiryId]: (prev[inquiryId] || []).map(r => r.id === replyId ? { ...r, content: editingText } : r)
    }))
    cancelEditReply()
  }

  const deleteReply = async (inquiryId: string, replyId: string) => {
    if (!window.confirm('이 답변을 삭제하시겠습니까?')) return
    await supabase.from('inquiry_replies').delete().eq('id', replyId)
    setReplies(prev => ({
      ...prev,
      [inquiryId]: (prev[inquiryId] || []).filter(r => r.id !== replyId)
    }))
    // 카운트 감소 및 상태 조정
    setItems(prev => prev.map(x => x.id === inquiryId ? { ...x, reply_count: Math.max(0, (x.reply_count || 1) - 1), status: Math.max(0, (x.reply_count || 1) - 1) > 0 ? 'answered' : 'pending' } : x))
    if ((replies[inquiryId]?.length || 1) - 1 <= 0) {
      await supabase.from('inquiries').update({ status: 'pending' }).eq('id', inquiryId)
    }
  }

  const deleteInquiry = async (id: string) => {
    if (!window.confirm('이 문의를 삭제하시겠습니까? 관련 답변도 함께 삭제됩니다.')) return
    setDeletingInquiryId(id)
    try {
      await supabase.from('inquiry_replies').delete().eq('inquiry_id', id)
      await supabase.from('inquiries').delete().eq('id', id)
      setItems(prev => prev.filter(x => x.id !== id))
      setOpenId(undefined)
    } finally {
      setDeletingInquiryId(null)
    }
  }

  if (!isAdmin) {
    return (
      <div>
        <Header />
        <main className="pt-16 min-h-screen bg-black"><div className="max-w-5xl mx-auto px-4 py-12 text-white/70">관리자만 접근 가능합니다.</div></main>
        <Footer />
      </div>
    )
  }

  return (
    <div>
      <Header />
      <main className="pt-16 min-h-screen bg-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-wrap gap-2 items-center mb-6">
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="검색(제목/카테고리)" className="px-3 py-2 rounded bg-white/10 border border-white/20 text-white" />
            <select value={cat} onChange={e=>setCat(e.target.value)} className="px-3 py-2 rounded bg-white/10 border border-white/20 text-white">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={status} onChange={e=>setStatus(e.target.value as any)} className="px-3 py-2 rounded bg-white/10 border border-white/20 text-white">
              <option value="all">전체 상태</option>
              <option value="pending">답변 대기중</option>
              <option value="answered">답변 완료</option>
            </select>
          </div>

          {loading ? (
            <div className="text-white/70">불러오는 중…</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <div className="divide-y divide-white/10 border border-white/10 rounded-lg overflow-hidden">
              {filtered.map(it => (
                <div key={it.id} className="bg-white/5">
                  <button onClick={()=>toggleOpen(it.id)} className="w-full text-left">
                    <div className="px-4 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-1 rounded bg-black text-white border border-white/20">{it.type}</span>
                        <span className="text-white font-medium">{it.title}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-xs px-2 py-1 rounded border ${it.status === 'answered' ? 'bg-green-500/20 text-green-300 border-green-400/40' : 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40'}`}>
                          {it.status === 'answered' ? `답변 완료 (${it.reply_count || 0})` : `답변 대기중 (${it.reply_count || 0})`}
                        </span>
                        <span className="text-white/50 text-sm">{new Date(it.created_at).toLocaleString('ko-KR')}</span>
                      </div>
                    </div>
                  </button>
                  {openId === it.id && (
                    <div className="px-4 pb-5 space-y-3">
                      <div className="text-white whitespace-pre-wrap">
                        {detail[it.id]?.content ?? '내용을 불러오는 중…'}
                      </div>
                      <div className="flex items-center justify-between">
                        {(detail[it.id]?.name || detail[it.id]?.contact) && (
                          <div className="text-white/60 text-sm">
                            작성자: {detail[it.id]?.name || '익명'} · 연락처: {detail[it.id]?.contact || '-'}
                          </div>
                        )}
                        <button
                          className="text-red-300 text-sm border border-red-500/40 rounded px-3 py-1 hover:bg-red-500/20"
                          onClick={() => deleteInquiry(it.id)}
                          disabled={deletingInquiryId === it.id}
                        >
                          {deletingInquiryId === it.id ? '삭제 중…' : '문의 삭제'}
                        </button>
                      </div>

                      {replies[it.id] && replies[it.id]!.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-white/80 font-medium">답변</div>
                          {replies[it.id]!.map(r => (
                            <div key={r.id} className="text-white/90 whitespace-pre-wrap text-sm border border-white/10 rounded p-3 bg-white/5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="text-white/50 text-xs mb-1">{new Date(r.created_at).toLocaleString('ko-KR')}</div>
                                  {editingReplyId === r.id ? (
                                    <textarea value={editingText} onChange={e=>setEditingText(e.target.value)} className="w-full h-24 px-3 py-2 rounded bg-white/10 border border-white/20 text-white" />
                                  ) : (
                                    <div>{r.content}</div>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1 ml-2">
                                  {editingReplyId === r.id ? (
                                    <>
                                      <button className="px-3 py-1 rounded bg-white text-black border border-white hover:bg-gray-100 text-xs" onClick={()=>saveEditReply(it.id, r.id)}>저장</button>
                                      <button className="px-3 py-1 rounded bg-white/10 border border-white/20 text-white hover:bg-white/20 text-xs" onClick={cancelEditReply}>취소</button>
                                    </>
                                  ) : (
                                    <>
                                      <button className="px-3 py-1 rounded bg-white text-black border border-white hover:bg-gray-100 text-xs" onClick={()=>startEditReply(r.id, r.content)}>수정</button>
                                      <button className="px-3 py-1 rounded bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30 text-xs" onClick={()=>deleteReply(it.id, r.id)}>삭제</button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {(detail[it.id]?.name || detail[it.id]?.contact) && (
                        <></>
                      )}
                      <div className="mt-3">
                        <textarea value={reply} onChange={e=>setReply(e.target.value)} placeholder="답변 내용을 입력하세요" className="w-full h-24 px-3 py-2 rounded bg-white/10 border border-white/20 text-white" />
                        <div className="flex items-center gap-2 mt-2">
                          <button disabled={saving || !reply.trim()} onClick={()=>submitReply(it.id)} className="px-4 py-2 rounded bg-white text-black border border-white hover:bg-gray-100 disabled:opacity-50">답변 등록</button>
                          {saving && <span className="text-white/60 text-sm">등록 중…</span>}
                        </div>
                      </div>
                    </div>
                  )}
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

