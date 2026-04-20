'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type DancerApplicationRow = {
  id: string
  created_at: string
  full_name: string
  stage_name: string
  birth_date: string
  instagram_handle: string
  careers: string[]
  phone: string
  gender: string
  height_cm: number
  portfolio_url: string | null
  portfolio_file_path: string | null
  agency_name: string | null
  nationality: string
  is_korean_national: boolean
  has_visa: boolean | null
  visa_details: string | null
  privacy_consent: boolean
}

const GENDER_LABEL: Record<string, string> = {
  male: '남성',
  female: '여성',
  other: '기타',
  prefer_not: '응답 없음',
}

export default function AdminDancerApplicationsPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const isAdmin = profile?.type === 'admin'
  const [items, setItems] = useState<DancerApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [openingFileId, setOpeningFileId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) {
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const res = await fetch('/api/admin/dancer-applications', { cache: 'no-store', credentials: 'include' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'failed')
        setItems(json.items || [])
      } catch {
        setError('목록을 불러오지 못했습니다. 관리자 권한·환경 변수(SUPABASE_SERVICE_ROLE_KEY)를 확인해 주세요.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authLoading, isAdmin])

  const openPortfolioFile = useCallback(async (row: DancerApplicationRow) => {
    if (!row.portfolio_file_path) return
    setOpeningFileId(row.id)
    try {
      const q = encodeURIComponent(row.portfolio_file_path)
      const res = await fetch(`/api/admin/dancer-applications/signed-url?path=${q}`, {
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok || !json.url) throw new Error(json.error || 'sign_failed')
      window.open(json.url, '_blank', 'noopener,noreferrer')
    } catch {
      alert('파일 링크를 만들지 못했습니다.')
    } finally {
      setOpeningFileId(null)
    }
  }, [])

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
            <h1 className="text-2xl font-bold text-zinc-900">에이전시 풀 지원</h1>
            <Button variant="outline" onClick={() => router.push('/admin')}>
              관리자 홈
            </Button>
          </div>

          {loading ? (
            <p className="text-zinc-600">불러오는 중…</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-zinc-600">접수된 지원이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {items.map((row) => (
                <Card key={row.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base font-medium">
                        {row.stage_name}
                        <span className="text-zinc-500 font-normal"> · {row.full_name}</span>
                      </CardTitle>
                      <Button size="sm" variant="ghost" onClick={() => setOpenId(openId === row.id ? null : row.id)}>
                        {openId === row.id ? '접기' : '펼치기'}
                      </Button>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {new Date(row.created_at).toLocaleString('ko-KR')} · ID: {row.id}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="text-zinc-500">연락처: </span>
                      {row.phone}
                    </div>
                    <div>
                      <span className="text-zinc-500">인스타그램: </span>@{row.instagram_handle}
                    </div>
                    <div>
                      <span className="text-zinc-500">국적·체류: </span>
                      {row.nationality}
                      {row.is_korean_national ? ' (대한민국 국적)' : ''}
                      {!row.is_korean_national && row.has_visa === true && ' · 비자 있음'}
                      {!row.is_korean_national && row.has_visa === false && ' · 비자 없음'}
                    </div>
                    {row.agency_name ? (
                      <div>
                        <span className="text-zinc-500">소속 에이전시: </span>
                        {row.agency_name}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2 items-center">
                      {row.portfolio_url ? (
                        <Button size="sm" variant="outline" asChild>
                          <a href={row.portfolio_url} target="_blank" rel="noopener noreferrer">
                            포트폴리오 URL
                          </a>
                        </Button>
                      ) : null}
                      {row.portfolio_file_path ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={openingFileId === row.id}
                          onClick={() => openPortfolioFile(row)}
                        >
                          {openingFileId === row.id ? '열기 준비…' : '첨부 파일 열기'}
                        </Button>
                      ) : null}
                    </div>
                    {openId === row.id && (
                      <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 text-zinc-800">
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 uppercase">기본 정보</p>
                          <p>생년월일: {row.birth_date}</p>
                          <p>
                            성별: {GENDER_LABEL[row.gender] || row.gender} · 키: {row.height_cm}cm
                          </p>
                          <p>개인정보 동의: {row.privacy_consent ? '동의' : '—'}</p>
                        </div>
                        {row.visa_details ? (
                          <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase">비자 상세</p>
                            <p className="whitespace-pre-wrap">{row.visa_details}</p>
                          </div>
                        ) : null}
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 uppercase">경력·활동</p>
                          <ul className="list-disc pl-5 space-y-1">
                            {(row.careers || []).map((c, i) => (
                              <li key={i} className="whitespace-pre-wrap">
                                {c}
                              </li>
                            ))}
                          </ul>
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
