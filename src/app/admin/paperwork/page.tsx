'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { CopyButton } from '@/components/paperwork/CopyButton'
import { DocumentForm, emptyForm, formFromRow, toPayload, type DocumentFormValues } from '@/components/paperwork/DocumentForm'

// 경영지원·대표용: 담당자들이 발행한 견적서·거래명세서를 확인·수정(새 버전)·폐기·재발송한다.

async function authFetch(input: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init.headers)
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
  if (init.body) headers.set('Content-Type', 'application/json')
  return fetch(input, { ...init, headers })
}

const won = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`
const APP: Record<string, string> = { oneshotcrew: '원샷크루', deetz: 'deetz', grigo: 'GRIGO', hq: '경영지원' }
const STATUS: Record<string, string> = { issued: '발행', superseded: '이전 버전', void: '폐기' }

type Row = any

export default function AdminPaperworkPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('')
  const [app, setApp] = useState('all')
  const [type, setType] = useState('all')
  const [selected, setSelected] = useState<{ document: Row; versions: Row[]; url: string | null } | null>(null)
  const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await authFetch('/api/paperwork/documents')
    const data = await res.json()
    if (!res.ok) return toast.error(data.error || '목록을 불러오지 못했습니다.')
    setRows(data.documents ?? [])
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) return router.push('/signin')
    if (profile?.type !== 'admin') return router.push('/')
    load()
  }, [loading, user, profile, router, load])

  const open = async (id: string) => {
    const res = await authFetch(`/api/paperwork/documents/${id}`)
    const data = await res.json()
    if (!res.ok) return toast.error(data.error)
    setSelected(data)
    setMode('view')
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (app !== 'all' && r.source_app !== app) return false
      if (type !== 'all' && r.doc_type !== type) return false
      if (!s) return true
      return [r.doc_no, r.client_company, r.project_title, r.author_name, r.client_email].some((v) => v && String(v).toLowerCase().includes(s))
    })
  }, [rows, q, app, type])

  const save = async (values: DocumentFormValues, send: boolean) => {
    setBusy(true)
    try {
      const editorName = profile?.name || user?.email || '관리자'
      const res =
        mode === 'new'
          ? await authFetch('/api/paperwork/documents', { method: 'POST', body: JSON.stringify({ ...toPayload(values), send, authorName: editorName }) })
          : await authFetch(`/api/paperwork/documents/${selected!.document.id}`, { method: 'PATCH', body: JSON.stringify({ ...toPayload(values), send, editorName }) })
      const data = await res.json()
      if (!res.ok && res.status !== 207) throw new Error(data.error)
      if (data.sendError) toast.error(data.sendError)
      else toast.success(send ? '저장하고 메일을 보냈습니다.' : '저장했습니다.')
      await load()
      await open(data.document.id)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const voidDoc = async () => {
    if (!selected) return
    const reason = window.prompt('폐기 사유를 입력하세요. 거래처 링크에서도 더 이상 보이지 않습니다.')
    if (!reason) return
    const res = await authFetch(`/api/paperwork/documents/${selected.document.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'void', editNote: reason, editorName: profile?.name }) })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error)
    toast.success('폐기했습니다.')
    await load()
    await open(selected.document.id)
  }

  const resend = async () => {
    if (!selected) return
    const to = window.prompt('받는 분 이메일', selected.document.client_email || '')
    if (!to) return
    const res = await authFetch(`/api/paperwork/documents/${selected.document.id}/send`, { method: 'POST', body: JSON.stringify({ to }) })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error)
    toast.success(`${to}로 보냈습니다.`)
    await load()
    await open(selected.document.id)
  }

  const viewPdf = async (id: string) => {
    const res = await authFetch(`/api/paperwork/documents/${id}/pdf`)
    if (!res.ok) return toast.error('PDF를 만들지 못했습니다.')
    const blob = await res.blob()
    window.open(URL.createObjectURL(blob), '_blank')
  }

  if (loading || profile?.type !== 'admin') return null
  const d = selected?.document
  const isLatest = d && d.status !== 'superseded'

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 [word-break:keep-all]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">거래 서류 (견적서·거래명세서)</h1>
            <p className="mt-1 text-sm text-zinc-600">원샷크루·deetz 담당자가 발행한 문서입니다. 수정하면 새 버전이 발행되고 거래처 링크에도 반영됩니다.</p>
          </div>
          <button type="button" onClick={() => { setSelected(null); setMode('new') }} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">새 문서</button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="문서번호·거래처·프로젝트·담당자 검색" className="w-72 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          <select value={app} onChange={(e) => setApp(e.target.value)} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm">
            <option value="all">전체 출처</option>
            {Object.entries(APP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm">
            <option value="all">전체 종류</option>
            <option value="quote">견적서</option>
            <option value="statement">거래명세서</option>
          </select>
          <span className="self-center text-sm text-zinc-500">{filtered.length}건</span>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-zinc-100 text-left text-xs text-zinc-600">
              <tr>
                <th className="px-3 py-2">발행일</th>
                <th className="px-3 py-2">문서번호</th>
                <th className="px-3 py-2">종류</th>
                <th className="px-3 py-2">출처·담당</th>
                <th className="px-3 py-2">거래처</th>
                <th className="px-3 py-2">프로젝트</th>
                <th className="px-3 py-2 text-right">합계</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">메일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((r) => (
                <tr key={r.id} onClick={() => open(r.id)} className={`cursor-pointer hover:bg-zinc-50 ${d?.group_id === r.group_id ? 'bg-zinc-50' : ''}`}>
                  <td className="px-3 py-2 whitespace-nowrap">{r.issued_date}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{r.doc_no}</td>
                  <td className="px-3 py-2">{r.doc_type === 'quote' ? '견적서' : '거래명세서'}</td>
                  <td className="px-3 py-2">{APP[r.source_app] ?? r.source_app} · {r.author_name}</td>
                  <td className="px-3 py-2">{r.client_company}</td>
                  <td className="px-3 py-2 text-zinc-600">{r.project_title}</td>
                  <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{won(r.total_amount)}</td>
                  <td className="px-3 py-2">{STATUS[r.status]}{r.version > 1 ? ` (${r.version}차)` : ''}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">{r.sent_to ?? '-'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-10 text-center text-zinc-500">문서가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {mode === 'new' && (
          <section className="mt-6 max-w-2xl">
            <h2 className="mb-3 text-lg font-bold">새 문서 (경영지원 발행)</h2>
            <DocumentForm initial={emptyForm()} busy={busy} onSubmit={save} />
          </section>
        )}

        {d && mode !== 'new' && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{d.doc_no}</h2>
                <span className="text-sm text-zinc-500">{STATUS[d.status]}</span>
                <div className="ml-auto flex flex-wrap gap-2">
                  <button type="button" onClick={() => viewPdf(d.id)} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm">PDF</button>
                  {selected?.url && <CopyButton text={selected.url} label="거래처 링크" className="px-3 py-1.5 text-sm" />}
                  {isLatest && d.status !== 'void' && (
                    <>
                      <button type="button" onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')} className="rounded-md border border-zinc-900 px-3 py-1.5 text-sm font-medium">{mode === 'edit' ? '수정 취소' : '수정'}</button>
                      <button type="button" onClick={resend} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm">메일 재발송</button>
                      <button type="button" onClick={voidDoc} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700">폐기</button>
                    </>
                  )}
                </div>
              </div>
              {mode === 'edit' ? (
                <div className="mt-4">
                  <DocumentForm key={d.id} initial={formFromRow(d)} lockDocType showEditNote busy={busy} onSubmit={save} />
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm">
                  <p className="font-semibold">{d.client_company} {d.client_contact ?? ''} {d.client_email ? `· ${d.client_email}` : ''}</p>
                  <p className="text-zinc-600">{d.project_title}</p>
                  <ul className="mt-3 divide-y divide-zinc-100">
                    {d.items.map((it: any, i: number) => (
                      <li key={i} className="flex justify-between gap-3 py-1.5">
                        <span>{it.name}{it.spec ? ` · ${it.spec}` : ''} ({it.qty} × {won(it.unitPrice)})</span>
                        <span className="font-medium">{won(it.qty * it.unitPrice)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-right">공급가액 {won(d.supply_amount)} · 부가세 {won(d.vat_amount)} · <b>합계 {won(d.total_amount)}</b></p>
                  {d.notes && <p className="mt-3 whitespace-pre-wrap text-zinc-600">{d.notes}</p>}
                </div>
              )}
            </div>
            <aside>
              <h3 className="text-sm font-semibold">버전 이력</h3>
              <ul className="mt-2 space-y-2">
                {selected!.versions.map((v) => (
                  <li key={v.id} className="rounded-lg border border-zinc-200 bg-white p-3 text-xs">
                    <p className="font-mono">{v.doc_no} <span className="text-zinc-500">({STATUS[v.status]})</span></p>
                    <p className="mt-1">{won(v.total_amount)} · {new Date(v.created_at).toLocaleString('ko-KR')}</p>
                    <p className="text-zinc-500">작성 {v.author_name}{v.edited_by ? ` · 수정 ${v.edited_by}` : ''}</p>
                    {v.edit_note && <p className="text-zinc-500">사유: {v.edit_note}</p>}
                    {v.sent_to && <p className="text-zinc-500">발송 {v.sent_to}</p>}
                    <button type="button" onClick={() => viewPdf(v.id)} className="mt-1 underline">PDF</button>
                  </li>
                ))}
              </ul>
            </aside>
          </section>
        )}
      </main>
    </div>
  )
}
