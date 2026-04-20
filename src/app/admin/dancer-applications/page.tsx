'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PauseCircle,
  Search,
  Download,
  ArrowLeft,
  Loader2,
  FileText,
  Link as LinkIcon,
  User as UserIcon,
  Mail,
  Phone,
  Instagram,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DANCE_SPECIALTIES, specialtyLabel } from '@/lib/dancer-specialties'

type ReviewStatus = 'pending' | 'in_review' | 'accepted' | 'rejected' | 'hold'

type DancerApplicationRow = {
  id: string
  created_at: string
  full_name: string
  stage_name: string
  email: string | null
  birth_date: string
  instagram_handle: string
  careers: string[]
  phone: string
  gender: string
  height_cm: number
  residence_region: string | null
  specialties: string[] | null
  profile_photo_path: string | null
  portfolio_url: string | null
  portfolio_file_path: string | null
  agency_name: string | null
  nationality: string
  is_korean_national: boolean
  has_visa: boolean | null
  visa_details: string | null
  privacy_consent: boolean
  review_status: ReviewStatus
  review_note: string | null
  reviewed_at: string | null
}

type ListResponse = {
  items: DancerApplicationRow[]
  count: number
  totals: { all: number; pending: number; today: number }
}

const GENDER_LABEL: Record<string, string> = {
  male: '남성',
  female: '여성',
  other: '기타',
  prefer_not: '비공개',
}

const STATUS_META: Record<ReviewStatus, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: '검토 대기', className: 'border-zinc-300 bg-white text-zinc-600', icon: Clock },
  in_review: { label: '검토 중', className: 'border-zinc-400 bg-zinc-50 text-zinc-900', icon: AlertTriangle },
  accepted: { label: '채택', className: 'border-black bg-black text-white', icon: CheckCircle2 },
  rejected: { label: '반려', className: 'border-black bg-white text-black line-through decoration-1', icon: XCircle },
  hold: { label: '보류', className: 'border-dashed border-zinc-500 bg-white text-zinc-600', icon: PauseCircle },
}

const PAGE_SIZE = 20

function StatusBadge({ status }: { status: ReviewStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-medium',
        meta.className,
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={1.75} />
      {meta.label}
    </span>
  )
}

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function buildCsv(rows: DancerApplicationRow[]): string {
  const headers = [
    'id', '접수일', '예명', '본명', '이메일', '연락처', '인스타', '국적', '비자', '성별', '키',
    '거주지', '장르', '소속', '상태', '검토메모', '포트폴리오URL', '첨부파일경로', '프로필사진경로', '경력',
  ]
  const lines = [headers.map(csvEscape).join(',')]
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.created_at,
        r.stage_name,
        r.full_name,
        r.email ?? '',
        r.phone,
        r.instagram_handle,
        r.nationality,
        r.is_korean_national ? '국내' : r.has_visa ? '비자있음' : '비자없음',
        GENDER_LABEL[r.gender] ?? r.gender,
        r.height_cm,
        r.residence_region ?? '',
        (r.specialties ?? []).join(' · '),
        r.agency_name ?? '',
        STATUS_META[r.review_status]?.label ?? r.review_status,
        r.review_note ?? '',
        r.portfolio_url ?? '',
        r.portfolio_file_path ?? '',
        r.profile_photo_path ?? '',
        (r.careers ?? []).join(' / '),
      ].map(csvEscape).join(','),
    )
  }
  return lines.join('\n')
}

export default function AdminDancerApplicationsPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const isAdmin = profile?.type === 'admin'

  const [items, setItems] = useState<DancerApplicationRow[]>([])
  const [totals, setTotals] = useState<{ all: number; pending: number; today: number }>({ all: 0, pending: 0, today: 0 })
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [openingFileId, setOpeningFileId] = useState<string | null>(null)
  const [photoUrlCache, setPhotoUrlCache] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [qInput, setQInput] = useState('')
  const [status, setStatus] = useState<ReviewStatus | 'all'>('all')
  const [nationality, setNationality] = useState<'all' | 'korean' | 'foreign'>('all')
  const [specialty, setSpecialty] = useState<string>('all')
  const [offset, setOffset] = useState(0)

  const fetchList = useCallback(
    async (opts: { append?: boolean; nextOffset?: number } = {}) => {
      const nextOffset = opts.nextOffset ?? 0
      if (opts.append) setLoadingMore(true)
      else setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams()
        if (q.trim()) params.set('q', q.trim())
        if (status !== 'all') params.set('status', status)
        if (nationality !== 'all') params.set('nationality', nationality)
        if (specialty !== 'all') params.set('specialty', specialty)
        params.set('limit', String(PAGE_SIZE))
        params.set('offset', String(nextOffset))
        const res = await fetch(`/api/admin/dancer-applications?${params.toString()}`, {
          cache: 'no-store',
          credentials: 'include',
        })
        const rawText = await res.text()
        let json: ListResponse | { error?: string; message?: string } | null = null
        try {
          json = rawText ? JSON.parse(rawText) : null
        } catch {
          /* JSON 파싱 실패: rawText 그대로 사용 */
        }
        if (!res.ok) {
          const detail =
            (json && (json as { error?: string; message?: string }).error) ||
            (json && (json as { message?: string }).message) ||
            rawText?.slice(0, 200) ||
            '응답 본문 비어있음'
          console.error('[admin/dancer-applications] load failed', res.status, detail)
          setError(`HTTP ${res.status} · ${detail}`)
          return
        }
        if (!json || !('items' in json)) {
          setError('응답 형식이 올바르지 않습니다.')
          return
        }
        const listJson = json as ListResponse
        setTotals(listJson.totals)
        setCount(listJson.count)
        setItems((prev) => (opts.append ? [...prev, ...listJson.items] : listJson.items))
        setOffset(nextOffset + listJson.items.length)
      } catch (err) {
        console.error('[admin/dancer-applications] fetch error', err)
        setError(err instanceof Error ? `요청 실패 · ${err.message}` : '요청 실패')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [q, status, nationality, specialty],
  )

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) {
      setLoading(false)
      return
    }
    fetchList({ nextOffset: 0 })
  }, [authLoading, isAdmin, fetchList])

  const getSignedUrl = useCallback(async (path: string): Promise<string | null> => {
    if (photoUrlCache[path]) return photoUrlCache[path]
    try {
      const res = await fetch(`/api/admin/dancer-applications/signed-url?path=${encodeURIComponent(path)}`, {
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok || !json.url) return null
      setPhotoUrlCache((prev) => ({ ...prev, [path]: json.url }))
      return json.url
    } catch {
      return null
    }
  }, [photoUrlCache])

  // 프로필 사진 로드 (보이는 카드만)
  useEffect(() => {
    const pending = items.filter((r) => r.profile_photo_path && !photoUrlCache[r.profile_photo_path])
    if (pending.length === 0) return
    pending.slice(0, 20).forEach((r) => {
      if (r.profile_photo_path) void getSignedUrl(r.profile_photo_path)
    })
  }, [items, getSignedUrl, photoUrlCache])

  const openPortfolioFile = useCallback(
    async (row: DancerApplicationRow) => {
      if (!row.portfolio_file_path) return
      setOpeningFileId(row.id)
      const url = await getSignedUrl(row.portfolio_file_path)
      setOpeningFileId(null)
      if (!url) {
        toast.error('파일 링크를 만들지 못했습니다.')
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    },
    [getSignedUrl],
  )

  const updateReview = useCallback(
    async (id: string, update: { review_status?: ReviewStatus; review_note?: string | null }) => {
      setSavingId(id)
      try {
        const res = await fetch(`/api/admin/dancer-applications/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'failed')
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  review_status: json.item.review_status ?? it.review_status,
                  review_note: json.item.review_note ?? it.review_note,
                  reviewed_at: json.item.reviewed_at ?? it.reviewed_at,
                }
              : it,
          ),
        )
        toast.success('저장되었습니다.')
      } catch {
        toast.error('저장에 실패했습니다.')
      } finally {
        setSavingId(null)
      }
    },
    [],
  )

  const handleExportCsv = () => {
    if (items.length === 0) {
      toast.error('내보낼 데이터가 없습니다.')
      return
    }
    const csv = '\uFEFF' + buildCsv(items)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dancer-applications-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

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

  const hasMore = items.length < count

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main className="pt-16">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/admin')}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> 관리자 홈
                </button>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">에이전시 풀 지원</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">전체 {totals.all.toLocaleString()}</Badge>
                <Badge className="bg-zinc-900">미검토 {totals.pending.toLocaleString()}</Badge>
                <Badge variant="secondary">오늘 +{totals.today.toLocaleString()}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={items.length === 0}>
                <Download className="mr-2 h-4 w-4" /> CSV 내보내기
              </Button>
            </div>
          </div>

          {/* Filter bar */}
          <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-3 sm:p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="예명·본명·이메일·전화·인스타·소속 검색"
                    value={qInput}
                    onChange={(e) => setQInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setQ(qInput)
                      }
                    }}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={status} onValueChange={(v) => setStatus(v as ReviewStatus | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">상태: 전체</SelectItem>
                  {(Object.keys(STATUS_META) as ReviewStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {STATUS_META[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={nationality} onValueChange={(v) => setNationality(v as typeof nationality)}>
                <SelectTrigger>
                  <SelectValue placeholder="국적" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">국적: 전체</SelectItem>
                  <SelectItem value="korean">국내</SelectItem>
                  <SelectItem value="foreign">해외</SelectItem>
                </SelectContent>
              </Select>
              <Select value={specialty} onValueChange={(v) => setSpecialty(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="장르" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">장르: 전체</SelectItem>
                  {DANCE_SPECIALTIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label_ko}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setQ(qInput)}>
                검색
              </Button>
              {(q || status !== 'all' || nationality !== 'all' || specialty !== 'all') ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setQInput('')
                    setQ('')
                    setStatus('all')
                    setNationality('all')
                    setSpecialty('all')
                  }}
                >
                  초기화
                </Button>
              ) : null}
              <span className="ml-auto text-xs text-zinc-500">검색 결과 {count.toLocaleString()}건</span>
            </div>
          </div>

          {/* List */}
          <div className="mt-6">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
              </div>
            ) : error ? (
              <p className="text-sm font-semibold text-black">{error}</p>
            ) : items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
                접수된 지원이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((row) => {
                  const isOpen = openId === row.id
                  const photoUrl = row.profile_photo_path ? photoUrlCache[row.profile_photo_path] : null
                  return (
                    <Card key={row.id} className="overflow-hidden border-zinc-200">
                      <CardHeader className="px-4 py-3 sm:px-5">
                        <div className="grid grid-cols-12 items-center gap-3">
                          <div className="col-span-12 flex items-center gap-3 sm:col-span-4">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                              {photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <UserIcon className="h-5 w-5 text-zinc-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-zinc-900">
                                {row.stage_name}
                                <span className="ml-1 text-xs font-normal text-zinc-500">
                                  · {row.full_name}
                                </span>
                              </p>
                              <p className="truncate text-[11px] text-zinc-500">
                                {new Date(row.created_at).toLocaleString('ko-KR')}
                              </p>
                            </div>
                          </div>
                          <div className="col-span-7 hidden min-w-0 text-xs text-zinc-600 sm:col-span-3 sm:block">
                            <p className="flex items-center gap-1.5 truncate">
                              <Mail className="h-3 w-3 text-zinc-400" /> {row.email ?? '-'}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 truncate">
                              <Phone className="h-3 w-3 text-zinc-400" /> {row.phone}
                            </p>
                          </div>
                          <div className="col-span-7 hidden min-w-0 sm:col-span-3 sm:block">
                            <div className="flex flex-wrap gap-1">
                              {(row.specialties ?? []).slice(0, 3).map((s) => (
                                <span
                                  key={s}
                                  className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] text-zinc-600"
                                >
                                  {specialtyLabel(s, 'ko')}
                                </span>
                              ))}
                              {(row.specialties ?? []).length > 3 ? (
                                <span className="text-[10px] text-zinc-400">
                                  +{(row.specialties?.length ?? 0) - 3}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-[11px] text-zinc-500">
                              {row.residence_region ?? '-'} ·{' '}
                              {row.is_korean_national ? '국내' : `${row.nationality}${row.has_visa === true ? ' · 비자' : row.has_visa === false ? ' · 비자X' : ''}`}
                            </p>
                          </div>
                          <div className="col-span-12 flex items-center justify-between gap-2 sm:col-span-2 sm:justify-end">
                            <StatusBadge status={row.review_status} />
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={isOpen ? '접기' : '펼치기'}
                              onClick={() => setOpenId(isOpen ? null : row.id)}
                            >
                              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {isOpen ? (
                        <CardContent className="border-t border-zinc-100 bg-zinc-50/40 px-4 py-4 text-sm sm:px-5">
                          <div className="grid gap-6 lg:grid-cols-3">
                            <div className="space-y-3 lg:col-span-2">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                                  기본 정보
                                </p>
                                <div className="mt-2 grid gap-1 text-zinc-700 sm:grid-cols-2">
                                  <p>생년월일: {row.birth_date}</p>
                                  <p>
                                    성별: {GENDER_LABEL[row.gender] || row.gender} · 키: {row.height_cm}cm
                                  </p>
                                  <p className="flex items-center gap-1.5">
                                    <Instagram className="h-3.5 w-3.5 text-zinc-400" /> @{row.instagram_handle}
                                  </p>
                                  <p>거주: {row.residence_region ?? '-'}</p>
                                  <p className="sm:col-span-2">
                                    국적: {row.nationality}
                                    {row.is_korean_national ? ' (대한민국)' : ''}
                                    {!row.is_korean_national && row.has_visa === true && ' · 비자 있음'}
                                    {!row.is_korean_national && row.has_visa === false && ' · 비자 없음'}
                                  </p>
                                  {row.agency_name ? <p className="sm:col-span-2">소속: {row.agency_name}</p> : null}
                                </div>
                              </div>

                              {row.visa_details ? (
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                                    비자 상세
                                  </p>
                                  <p className="mt-2 whitespace-pre-wrap text-zinc-700">{row.visa_details}</p>
                                </div>
                              ) : null}

                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                                  장르
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {(row.specialties ?? []).map((s) => (
                                    <Badge key={s} variant="outline" className="font-normal">
                                      {specialtyLabel(s, 'ko')}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                                  경력 · 활동
                                </p>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700">
                                  {(row.careers || []).map((c, i) => (
                                    <li key={i} className="whitespace-pre-wrap">
                                      {c}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                {row.portfolio_url ? (
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={row.portfolio_url} target="_blank" rel="noopener noreferrer">
                                      <LinkIcon className="mr-1.5 h-3.5 w-3.5" /> 포트폴리오 URL
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
                                    {openingFileId === row.id ? (
                                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <FileText className="mr-1.5 h-3.5 w-3.5" />
                                    )}
                                    첨부 파일 열기
                                  </Button>
                                ) : null}
                              </div>
                            </div>

                            {/* Review panel */}
                            <ReviewPanel
                              row={row}
                              saving={savingId === row.id}
                              onSave={(u) => updateReview(row.id, u)}
                            />
                          </div>
                        </CardContent>
                      ) : null}
                    </Card>
                  )
                })}
              </div>
            )}

            {hasMore && !loading ? (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchList({ append: true, nextOffset: offset })}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중…
                    </>
                  ) : (
                    '더 보기'
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function ReviewPanel({
  row,
  saving,
  onSave,
}: {
  row: DancerApplicationRow
  saving: boolean
  onSave: (u: { review_status?: ReviewStatus; review_note?: string | null }) => void
}) {
  const [status, setStatus] = useState<ReviewStatus>(row.review_status)
  const [note, setNote] = useState<string>(row.review_note ?? '')

  useEffect(() => {
    setStatus(row.review_status)
    setNote(row.review_note ?? '')
  }, [row.id, row.review_status, row.review_note])

  const dirty = status !== row.review_status || note !== (row.review_note ?? '')

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">검토</p>
      <div className="mt-3 space-y-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-600">상태</label>
          <Select value={status} onValueChange={(v) => setStatus(v as ReviewStatus)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_META) as ReviewStatus[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {STATUS_META[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-600">메모</label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="담당자 메모, 후속 조치 등"
          />
        </div>
        <Button
          size="sm"
          disabled={!dirty || saving}
          onClick={() => onSave({ review_status: status, review_note: note.trim() ? note.trim() : null })}
        >
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
          저장
        </Button>
        {row.reviewed_at ? (
          <p className="text-[11px] text-zinc-400">
            최근 변경: {new Date(row.reviewed_at).toLocaleString('ko-KR')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
