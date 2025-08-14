'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

type InquiryListItem = {
  id: string
  type: string
  title: string
  created_at: string
  status?: string
  reply_count?: number
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

export default function InquiriesPage() {
  return (
    <div>
      <Header />
      <main className="pt-16 min-h-screen bg-black">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">문의게시판</h1>
          <Suspense fallback={<div className="text-white/70">불러오는 중…</div>}>
            <InquiriesList />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function InquiriesList() {
  const [items, setItems] = useState<InquiryListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const search = useSearchParams()
  const router = useRouter()
  const selected = search.get('type') || '전체'

  useEffect(() => {
    const fetchList = async () => {
      try {
        const q = selected !== '전체' ? `?type=${encodeURIComponent(selected)}` : ''
        const res = await fetch(`/api/inquiries${q}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('failed')
        const json = await res.json()
        setItems(json.items || [])
      } catch (e) {
        setError('문의 목록을 불러오지 못했습니다')
      } finally {
        setLoading(false)
      }
    }
    fetchList()
  }, [selected])

  return (
    <>
      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => router.push(cat === '전체' ? '/inquiries' : `/inquiries?type=${encodeURIComponent(cat)}`)}
            className={`px-3 py-1.5 rounded border ${selected === cat ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/20 hover:bg-white/10'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-white/70">불러오는 중…</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-white/70">등록된 문의가 없습니다.</div>
      ) : (
        <div className="divide-y divide-white/10 border border-white/10 rounded-lg overflow-hidden">
          {items.map((it) => (
            <Link
              key={it.id}
              href={`/inquiries/${it.id}`}
              className="block bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded bg-black text-white border border-white/20">
                    {it.type}
                  </span>
                  <span className="text-white font-medium">{it.title}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-1 rounded border ${it.status === 'answered' ? 'bg-green-500/20 text-green-300 border-green-400/40' : 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40'}`}>
                    {it.status === 'answered' ? `답변 완료 (${it.reply_count || 0})` : `답변 대기중 (${it.reply_count || 0})`}
                  </span>
                  <span className="text-white/50 text-sm">{new Date(it.created_at).toLocaleString('ko-KR')}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

