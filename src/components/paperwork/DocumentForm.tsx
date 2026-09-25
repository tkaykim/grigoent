'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { BANK_ACCOUNTS, type PaperworkAccount } from '@/lib/company-paperwork'
import type { AttachDoc, PaperworkDocType, PaperworkItem, VatMode } from '@/lib/paperwork-docs'

export interface DocumentFormValues {
  docType: PaperworkDocType
  account: PaperworkAccount
  clientCompany: string
  clientContact: string
  clientEmail: string
  projectTitle: string
  items: { name: string; spec: string; qty: string; unitPrice: string }[]
  vatMode: VatMode
  issuedDate: string
  validUntil: string
  notes: string
  attachDocs: AttachDoc[]
  editNote: string
}

export function emptyForm(init: Partial<DocumentFormValues> = {}): DocumentFormValues {
  const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
  const plus30 = new Date(Date.now() + 9 * 3600_000 + 30 * 86400_000).toISOString().slice(0, 10)
  return {
    docType: 'quote',
    account: 'enter',
    clientCompany: '',
    clientContact: '',
    clientEmail: '',
    projectTitle: '',
    items: [{ name: '', spec: '', qty: '1', unitPrice: '' }],
    vatMode: 'separate',
    issuedDate: today,
    validUntil: plus30,
    notes: '',
    attachDocs: ['brn', 'bank'],
    editNote: '',
    ...init,
  }
}

export function formFromRow(row: {
  doc_type: PaperworkDocType
  account: PaperworkAccount
  client_company: string
  client_contact: string | null
  client_email: string | null
  project_title: string | null
  items: PaperworkItem[]
  vat_mode: VatMode
  issued_date: string
  valid_until: string | null
  notes: string | null
  attach_docs: AttachDoc[]
}): DocumentFormValues {
  return emptyForm({
    docType: row.doc_type,
    account: row.account,
    clientCompany: row.client_company,
    clientContact: row.client_contact ?? '',
    clientEmail: row.client_email ?? '',
    projectTitle: row.project_title ?? '',
    items: row.items.map((i) => ({ name: i.name, spec: i.spec ?? '', qty: String(i.qty), unitPrice: String(i.unitPrice) })),
    vatMode: row.vat_mode,
    issuedDate: row.issued_date,
    validUntil: row.valid_until ?? '',
    notes: row.notes ?? '',
    attachDocs: row.attach_docs,
  })
}

const toNum = (v: string) => Number(v.replace(/,/g, '')) || 0
const won = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`

export function toPayload(v: DocumentFormValues) {
  return {
    ...v,
    items: v.items
      .filter((i) => i.name.trim())
      .map((i) => ({ name: i.name.trim(), spec: i.spec.trim() || undefined, qty: toNum(i.qty), unitPrice: toNum(i.unitPrice) })),
  }
}

export function DocumentForm({
  initial,
  lockDocType = false,
  showEditNote = false,
  busy,
  onSubmit,
}: {
  initial: DocumentFormValues
  lockDocType?: boolean
  showEditNote?: boolean
  busy: boolean
  onSubmit: (values: DocumentFormValues, send: boolean) => void
}) {
  const [v, setV] = useState<DocumentFormValues>(initial)
  const set = <K extends keyof DocumentFormValues>(k: K, val: DocumentFormValues[K]) => setV((cur) => ({ ...cur, [k]: val }))
  const setItem = (idx: number, k: 'name' | 'spec' | 'qty' | 'unitPrice', val: string) =>
    setV((cur) => ({ ...cur, items: cur.items.map((it, i) => (i === idx ? { ...it, [k]: val } : it)) }))

  const totals = useMemo(() => {
    const sum = v.items.reduce((s, i) => s + Math.round(toNum(i.qty) * toNum(i.unitPrice)), 0)
    if (v.vatMode === 'included') {
      const supply = Math.round(sum / 1.1)
      return { supply, vat: sum - supply, total: sum }
    }
    const vat = Math.round(sum * 0.1)
    return { supply: sum, vat, total: sum + vat }
  }, [v.items, v.vatMode])

  const input = 'mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900'
  const label = 'block text-sm font-semibold'

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
        onSubmit(v, submitter?.value === 'send')
      }}
    >
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
        <div>
          <span className={label}>문서 종류</span>
          <div className="mt-2 flex gap-2">
            {(['quote', 'statement'] as PaperworkDocType[]).map((t) => (
              <button
                key={t}
                type="button"
                disabled={lockDocType}
                onClick={() => set('docType', t)}
                className={`rounded-lg border px-3 py-2 text-sm ${v.docType === t ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-zinc-700'} disabled:opacity-60`}
              >
                {t === 'quote' ? '견적서' : '거래명세서'}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">견적서는 진행 전 금액 안내, 거래명세서는 진행 후 거래 내역 확인용입니다.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            받는 곳 (상호) *
            <input className={input} value={v.clientCompany} onChange={(e) => set('clientCompany', e.target.value)} placeholder="예: (주)OO기획" required />
          </label>
          <label className={label}>
            받는 분
            <input className={input} value={v.clientContact} onChange={(e) => set('clientContact', e.target.value)} placeholder="예: 김OO 팀장" />
          </label>
          <label className={label}>
            받는 분 이메일
            <input className={input} type="email" value={v.clientEmail} onChange={(e) => set('clientEmail', e.target.value)} placeholder="메일로 보낼 때 필요" />
          </label>
          <label className={label}>
            프로젝트명
            <input className={input} value={v.projectTitle} onChange={(e) => set('projectTitle', e.target.value)} />
          </label>
          <label className={label}>
            {v.docType === 'quote' ? '견적일' : '거래일'}
            <input className={input} type="date" value={v.issuedDate} onChange={(e) => set('issuedDate', e.target.value)} />
          </label>
          {v.docType === 'quote' && (
            <label className={label}>
              유효기간
              <input className={input} type="date" value={v.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
            </label>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className={label}>품목</span>
          <select className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" value={v.vatMode} onChange={(e) => set('vatMode', e.target.value as VatMode)}>
            <option value="separate">단가는 부가세 별도</option>
            <option value="included">단가에 부가세 포함</option>
          </select>
        </div>
        <div className="mt-3 space-y-3">
          {v.items.map((it, idx) => (
            <div key={idx} className="rounded-lg border border-zinc-200 p-3">
              <div className="grid gap-2 sm:grid-cols-[2fr_2fr_1fr_1.4fr_auto]">
                <input className={input.replace('mt-1.5 ', '')} value={it.name} onChange={(e) => setItem(idx, 'name', e.target.value)} placeholder="품목 (예: 댄서 출연료)" aria-label="품목" />
                <input className={input.replace('mt-1.5 ', '')} value={it.spec} onChange={(e) => setItem(idx, 'spec', e.target.value)} placeholder="내용 (예: 9/14 공연, 4인)" aria-label="내용" />
                <input className={input.replace('mt-1.5 ', '')} inputMode="decimal" value={it.qty} onChange={(e) => setItem(idx, 'qty', e.target.value)} placeholder="수량" aria-label="수량" />
                <input className={input.replace('mt-1.5 ', '')} inputMode="numeric" value={it.unitPrice} onChange={(e) => setItem(idx, 'unitPrice', e.target.value)} placeholder="단가(원)" aria-label="단가" />
                <button
                  type="button"
                  onClick={() => setV((cur) => ({ ...cur, items: cur.items.filter((_, i) => i !== idx) }))}
                  disabled={v.items.length === 1}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-2 text-zinc-500 disabled:opacity-40"
                  aria-label="품목 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-right text-xs text-zinc-500">금액 {won(toNum(it.qty) * toNum(it.unitPrice))}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setV((cur) => ({ ...cur, items: [...cur.items, { name: '', spec: '', qty: '1', unitPrice: '' }] }))}
          className="mt-3 inline-flex items-center gap-1 rounded-lg border border-dashed border-zinc-400 px-3 py-2 text-sm text-zinc-700"
        >
          <Plus className="h-4 w-4" /> 품목 추가
        </button>
        <dl className="mt-4 space-y-1 border-t border-zinc-200 pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-zinc-500">공급가액</dt><dd>{won(totals.supply)}</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-500">부가세</dt><dd>{won(totals.vat)}</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>합계</dt><dd>{won(totals.total)}</dd></div>
        </dl>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
        <div>
          <span className={label}>입금 계좌</span>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(Object.keys(BANK_ACCOUNTS) as PaperworkAccount[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => set('account', a)}
                className={`rounded-lg border p-3 text-left text-sm ${v.account === a ? 'border-zinc-900 ring-1 ring-zinc-900' : 'border-zinc-300'}`}
              >
                <span className="font-semibold">{BANK_ACCOUNTS[a].label}</span>
                <span className="mt-1 block text-xs text-zinc-500">{BANK_ACCOUNTS[a].bank} {BANK_ACCOUNTS[a].number}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={label}>메일에 함께 첨부</span>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {([['brn', '사업자등록증'], ['bank', '통장사본']] as [AttachDoc, string][]).map(([k, l]) => (
              <label key={k} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={v.attachDocs.includes(k)}
                  onChange={(e) => set('attachDocs', e.target.checked ? [...v.attachDocs, k] : v.attachDocs.filter((d) => d !== k))}
                />
                {l}
              </label>
            ))}
          </div>
        </div>
        <label className={label}>
          비고
          <textarea className={input} rows={3} value={v.notes} onChange={(e) => set('notes', e.target.value)} placeholder="예: 교통비 별도, 촬영 연장 시 시간당 OO원" />
        </label>
        {showEditNote && (
          <label className={label}>
            수정 사유
            <input className={input} value={v.editNote} onChange={(e) => set('editNote', e.target.value)} placeholder="예: 인원 4→5명 변경" />
          </label>
        )}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" value="save" disabled={busy} className="flex-1 rounded-lg border border-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-900 disabled:opacity-50">
          {busy ? '처리 중…' : '저장하고 링크 만들기'}
        </button>
        <button type="submit" value="send" disabled={busy || !v.clientEmail} className="flex-1 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? '처리 중…' : '저장하고 메일 보내기'}
        </button>
      </div>
      {!v.clientEmail && <p className="text-center text-xs text-zinc-500">메일로 보내려면 받는 분 이메일을 입력하세요. 링크는 카톡으로 보낼 수 있습니다.</p>}
    </form>
  )
}
