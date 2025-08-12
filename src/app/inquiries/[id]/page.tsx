'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function InquiryDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [meta, setMeta] = useState<{ id: string; type: string; title: string; created_at: string; content?: string; name?: string; contact?: string } | null>(null)
  const [password, setPassword] = useState('')
  const [detail, setDetail] = useState<{ content: string; name?: string; contact?: string } | null>(null)
  const [replies, setReplies] = useState<Array<{ id: string; content: string; created_at: string }>>([])
  const [error, setError] = useState('')
  const [reply, setReply] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        // 먼저 관리자용 엔드포인트 시도
        let res = await fetch(`/api/inquiries/${id}/admin`, { cache: 'no-store', credentials: 'include' })
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          // 일반 공개 메타로 fallback
          res = await fetch(`/api/inquiries/${id}`, { cache: 'no-store', credentials: 'include' })
        }
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'failed')
        setMeta(json.item)
        if (json.item && json.item.content) {
          setDetail({ content: json.item.content, name: json.item.name, contact: json.item.contact })
        }
      } catch (e: any) {
        setError('문의 정보를 불러오지 못했습니다')
      }
    }
    if (id) fetchMeta()
  }, [id])

  const unlock = async () => {
    try {
      const res = await fetch(`/api/inquiries/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'failed')
      setDetail({ content: json.item.content, name: json.item.name, contact: json.item.contact })
      // 비밀번호 검증 성공 시 답변 목록도 로드 (공개X, 본인 열람)
      const res2 = await fetch(`/api/inquiries/${id}/replies`)
      const j2 = await res2.json()
      if (res2.ok) setReplies(j2.items || [])
      setError('')
    } catch (e: any) {
      setError('비밀번호가 올바르지 않습니다')
    }
  }

  return (
    <div>
      <Header />
      <main className="pt-16 min-h-screen bg-black">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {meta ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 rounded bg-black text-white border border-white/20">{meta.type}</span>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{meta.title}</h1>
              </div>
              <div className="text-white/50 text-sm">{new Date(meta.created_at).toLocaleString('ko-KR')}</div>

              {!detail ? (
                <div className="space-y-3">
                  <p className="text-white/70">비공개 문의입니다. 열람 비밀번호를 입력해주세요.</p>
                  <div className="flex gap-2">
                    <input type="password" className="px-3 py-2 rounded bg-white/10 border border-white/20 text-white w-64" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" />
                    <button onClick={unlock} className="px-4 py-2 rounded bg-white text-black border border-white hover:bg-gray-100">열람</button>
                  </div>
                  {error && <div className="text-red-400 text-sm">{error}</div>}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-white whitespace-pre-wrap">{detail.content}</div>
                  {(detail.name || detail.contact) && (
                    <div className="text-white/70 text-sm">작성자: {detail.name || '익명'} · 연락처: {detail.contact || '-'}</div>
                  )}
                  {/* 답변 목록 */}
                  {replies.length > 0 && (
                    <div className="mt-6 p-4 rounded border border-white/10 bg-white/5">
                      <div className="text-white/80 font-medium mb-2">답변</div>
                      <div className="space-y-3">
                        {replies.map(r => (
                          <div key={r.id} className="text-white/90 whitespace-pre-wrap text-sm border border-white/10 rounded p-3 bg-white/5">
                            <div className="text-white/50 text-xs mb-1">{new Date(r.created_at).toLocaleString('ko-KR')}</div>
                            {r.content}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* 관리자 답변 작성 */}
                  <div className="mt-6 p-4 rounded border border-white/10 bg-white/5">
                    <div className="text-white/80 font-medium mb-2">관리자 답변</div>
                    <textarea value={reply} onChange={e => setReply(e.target.value)} className="w-full h-28 px-3 py-2 rounded bg-white/10 border border-white/20 text-white" placeholder="답변 내용을 입력하세요" />
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={async () => {
                        const res = await fetch(`/api/inquiries/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: reply, status: 'answered' }), credentials: 'include' })
                        if (res.ok) { setSaved('답변이 등록되었습니다'); setReply('') } else { setSaved('권한이 없거나 오류가 발생했습니다') }
                      }} className="px-4 py-2 rounded bg-white text-black border border-white hover:bg-gray-100">답변 등록</button>
                      {saved && <span className="text-white/60 text-sm">{saved}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-white/70">불러오는 중…</div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

