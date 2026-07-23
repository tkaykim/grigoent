'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BriefcaseBusiness,
  Camera,
  CarFront,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Languages,
  Loader2,
  Mail,
  Phone,
  Save,
  Search,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { RECRUITING_TOOL_LEVELS, RECRUITING_TOOL_OPTIONS } from '@/lib/recruiting-content'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type ReviewStatus = 'submitted' | 'reviewing' | 'interview' | 'offer' | 'hired' | 'not_selected' | 'withdrawn'

type RecruitingApplication = {
  id: string
  created_at: string
  position_title: string
  position_slugs?: string[]
  position_titles?: string[]
  full_name: string
  email: string
  phone: string
  career_summary: string
  motivation: string
  tool_skills: Record<string, string>
  other_tools: string | null
  camera_capability: 'yes' | 'basic' | 'no'
  camera_details: string | null
  driving_capability: 'yes' | 'license_only' | 'no'
  foreign_languages: string
  portfolio_url: string | null
  resume_file_path: string
  alternative_position_consent: boolean
  review_status: ReviewStatus
  review_note: string | null
  reviewed_at: string | null
}

type ListResponse = {
  items: RecruitingApplication[]
  count: number
  totals: { all: number; submitted: number; interview: number }
}

const STATUS_LABELS: Record<ReviewStatus, string> = {
  submitted: '신규 접수',
  reviewing: '검토 중',
  interview: '인터뷰',
  offer: '오퍼',
  hired: '채용 완료',
  not_selected: '미선발',
  withdrawn: '지원 철회',
}

const TOOL_LEVEL_LABEL = Object.fromEntries(RECRUITING_TOOL_LEVELS.map((level) => [level.value, level.label]))
const PAGE_SIZE = 20

async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession()
  const headers = new Headers(init.headers)
  if (data.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`)
  return fetch(input, { ...init, headers })
}

function CapabilityLabel({ type, value }: { type: 'camera' | 'driving'; value: string }) {
  const labels = type === 'camera'
    ? { yes: '실무 사용 가능', basic: '기초 사용 가능', no: '사용 어려움' }
    : { yes: '실제 운전 가능', license_only: '면허만 보유', no: '운전 불가' }
  return <>{labels[value as keyof typeof labels] ?? value}</>
}

export default function AdminRecruitingPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<RecruitingApplication[]>([])
  const [totals, setTotals] = useState({ all: 0, submitted: 0, interview: 0 })
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<ReviewStatus | 'all'>('all')

  const load = useCallback(async (append = false) => {
    append ? setLoadingMore(true) : setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(append ? items.length : 0) })
      if (q) params.set('q', q)
      if (status !== 'all') params.set('status', status)
      const response = await authFetch(`/api/admin/recruiting-applications?${params.toString()}`, { cache: 'no-store' })
      const payload = (await response.json()) as ListResponse & { error?: string }
      if (!response.ok) throw new Error(payload.error || '목록을 불러오지 못했습니다.')
      setItems((previous) => append ? [...previous, ...payload.items] : payload.items)
      setCount(payload.count)
      setTotals(payload.totals)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [items.length, q, status])

  useEffect(() => {
    if (authLoading) return
    if (profile?.type !== 'admin') {
      router.replace('/signin')
      return
    }
    void load(false)
  }, [authLoading, profile?.type, router, q, status])

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    setQ(qInput.trim())
  }

  const updateReview = async (row: RecruitingApplication, nextStatus?: ReviewStatus, nextNote?: string) => {
    setSavingId(row.id)
    try {
      const response = await authFetch(`/api/admin/recruiting-applications/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_status: nextStatus ?? row.review_status,
          review_note: nextNote ?? row.review_note,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '저장하지 못했습니다.')
      setItems((previous) => previous.map((item) => item.id === row.id ? { ...item, ...payload.item } : item))
      toast.success('검토 상태를 저장했습니다.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장하지 못했습니다.')
    } finally {
      setSavingId(null)
    }
  }

  const openResume = async (row: RecruitingApplication) => {
    try {
      const response = await authFetch(`/api/admin/recruiting-applications/signed-url?path=${encodeURIComponent(row.resume_file_path)}`)
      const payload = await response.json()
      if (!response.ok || !payload.url) throw new Error('이력서를 열지 못했습니다.')
      window.open(payload.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '이력서를 열지 못했습니다.')
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-zinc-100 pt-16">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <Link href="/admin" prefetch={false} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950">
                <ArrowLeft className="h-4 w-4" />
                관리자 대시보드
              </Link>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Recruiting Admin</p>
              <h1 className="mt-3 text-3xl font-black tracking-normal text-zinc-950">채용 지원 관리</h1>
            </div>
            <Link href="/careers" target="_blank" className="inline-flex h-10 items-center justify-center gap-2 border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 hover:border-zinc-950">
              공개 채용 페이지
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {[
              ['전체 지원', totals.all],
              ['신규 접수', totals.submitted],
              ['인터뷰', totals.interview],
            ].map(([label, value]) => (
              <div key={label} className="border border-zinc-300 bg-white p-5">
                <div className="text-sm text-zinc-500">{label}</div>
                <div className="mt-2 text-3xl font-black text-zinc-950">{value}</div>
              </div>
            ))}
          </div>

          <div className="mb-5 flex flex-col gap-3 border border-zinc-300 bg-white p-4 sm:flex-row">
            <form onSubmit={submitSearch} className="flex flex-1 gap-2">
              <Input value={qInput} onChange={(event) => setQInput(event.target.value)} placeholder="이름, 이메일, 전화번호 검색" className="h-10" />
              <Button type="submit" variant="outline" size="icon" aria-label="검색">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            <Select value={status} onValueChange={(value) => setStatus(value as ReviewStatus | 'all')}>
              <SelectTrigger className="h-10 w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center border border-zinc-300 bg-white"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : items.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center border border-zinc-300 bg-white text-zinc-500">
              <BriefcaseBusiness className="mb-3 h-8 w-8" />
              <p>조건에 맞는 지원서가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((row) => {
                const isOpen = openId === row.id
                return (
                  <article key={row.id} className="border border-zinc-300 bg-white">
                    <button type="button" onClick={() => setOpenId(isOpen ? null : row.id)} className="grid w-full gap-4 p-5 text-left md:grid-cols-[1fr_180px_150px_24px] md:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-zinc-950">{row.full_name}</h2>
                          {row.alternative_position_consent ? <span className="border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600">타 포지션 제안 동의</span> : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(row.position_titles?.length ? row.position_titles : [row.position_title]).map((title) => (
                            <span key={title} className="bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">{title}</span>
                          ))}
                        </div>
                        <p className="mt-1 truncate text-sm text-zinc-500">{row.email} · {row.phone}</p>
                      </div>
                      <span className="text-sm font-medium text-zinc-700">{STATUS_LABELS[row.review_status]}</span>
                      <span className="text-sm text-zinc-500">{new Date(row.created_at).toLocaleDateString('ko-KR')}</span>
                      {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>

                    {isOpen ? (
                      <div className="border-t border-zinc-200 p-5 md:p-7">
                        <div className="mb-7 flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={() => void openResume(row)}><FileText className="h-4 w-4" />이력서</Button>
                          {row.portfolio_url ? <Button asChild variant="outline"><a href={row.portfolio_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />포트폴리오</a></Button> : null}
                          <Button asChild variant="outline"><a href={`mailto:${row.email}`}><Mail className="h-4 w-4" />이메일</a></Button>
                          <Button asChild variant="outline"><a href={`tel:${row.phone}`}><Phone className="h-4 w-4" />전화</a></Button>
                        </div>

                        <div className="grid gap-8 lg:grid-cols-2">
                          <div className="space-y-7">
                            <div><h3 className="text-sm font-bold text-zinc-950">주요 경력과 프로젝트 경험</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600">{row.career_summary}</p></div>
                            <div><h3 className="text-sm font-bold text-zinc-950">지원 동기</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600">{row.motivation}</p></div>
                            <div>
                              <h3 className="text-sm font-bold text-zinc-950">디자인·영상 툴</h3>
                              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {RECRUITING_TOOL_OPTIONS.map((tool) => (
                                  <div key={tool.key} className="border border-zinc-200 p-3 text-xs">
                                    <div className="text-zinc-500">{tool.label}</div>
                                    <div className="mt-1 font-bold text-zinc-950">{TOOL_LEVEL_LABEL[row.tool_skills?.[tool.key]] || '미입력'}</div>
                                  </div>
                                ))}
                              </div>
                              {row.other_tools ? <p className="mt-3 text-sm text-zinc-600">기타: {row.other_tools}</p> : null}
                            </div>
                          </div>

                          <div className="space-y-7">
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div className="border border-zinc-200 p-4"><Camera className="h-4 w-4" /><div className="mt-2 text-xs text-zinc-500">카메라</div><div className="mt-1 text-sm font-bold"><CapabilityLabel type="camera" value={row.camera_capability} /></div></div>
                              <div className="border border-zinc-200 p-4"><CarFront className="h-4 w-4" /><div className="mt-2 text-xs text-zinc-500">운전</div><div className="mt-1 text-sm font-bold"><CapabilityLabel type="driving" value={row.driving_capability} /></div></div>
                              <div className="border border-zinc-200 p-4"><Languages className="h-4 w-4" /><div className="mt-2 text-xs text-zinc-500">외국어</div><div className="mt-1 text-sm font-bold">입력 완료</div></div>
                            </div>
                            {row.camera_details ? <div><h3 className="text-sm font-bold">카메라·장비</h3><p className="mt-2 text-sm leading-6 text-zinc-600">{row.camera_details}</p></div> : null}
                            <div><h3 className="text-sm font-bold">외국어 활용 수준</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600">{row.foreign_languages}</p></div>

                            <div className="border-t border-zinc-200 pt-6">
                              <label className="text-sm font-bold">검토 상태</label>
                              <Select value={row.review_status} onValueChange={(value) => void updateReview(row, value as ReviewStatus)}>
                                <SelectTrigger className="mt-2 h-10 w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>{Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                              </Select>
                              <label className="mt-5 block text-sm font-bold">내부 검토 메모</label>
                              <Textarea
                                defaultValue={row.review_note || ''}
                                maxLength={3000}
                                className="mt-2 min-h-28"
                                onBlur={(event) => {
                                  const next = event.currentTarget.value.trim()
                                  if (next !== (row.review_note || '')) void updateReview(row, undefined, next)
                                }}
                              />
                              <div className={cn('mt-3 flex items-center gap-2 text-xs text-zinc-500', savingId === row.id ? 'visible' : 'invisible')}>
                                {savingId === row.id ? <><Save className="h-3 w-3" />저장 중</> : '저장됨'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          )}

          {items.length < count ? (
            <div className="mt-6 text-center"><Button variant="outline" disabled={loadingMore} onClick={() => void load(true)}>{loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}더 불러오기</Button></div>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  )
}
