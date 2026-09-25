'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

type Initial = {
  company: string
  contactName: string
  invoiceEmail: string
  itemName: string
  supplyAmount: string
  vatAmount: string
  project: string
}

const toNum = (v: string) => Number(v.replace(/,/g, '')) || 0
const won = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`

export function TaxInvoiceForm({ docToken, docLabel, initial }: { docToken: string; docLabel: string; initial: Initial }) {
  const [supply, setSupply] = useState(initial.supplyAmount)
  const [vat, setVat] = useState(initial.vatAmount)
  const [vatTouched, setVatTouched] = useState(!!initial.vatAmount)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const vatValue = vatTouched ? toNum(vat) : Math.round(toNum(supply) * 0.1)
  const total = useMemo(() => toNum(supply) + vatValue, [supply, vatValue])

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('supplyAmount', String(toNum(supply)))
    fd.set('vatAmount', String(vatValue))
    try {
      const res = await fetch('/api/paperwork/tax-invoice', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '접수하지 못했습니다.')
      setDone(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
        <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" /> 발행 요청이 접수되었습니다.</p>
        <p className="mt-1">경영지원실이 확인 후 입력하신 이메일로 세금계산서를 보내드립니다.</p>
        <p>문의는 finance@grigoent.co.kr 또는 02-6229-9229로 주세요.</p>
      </section>
    )
  }

  const input = 'mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900'
  const label = 'block text-sm font-semibold'

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <input type="hidden" name="doc" value={docToken} />
      <input type="hidden" name="project" value={initial.project} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {docLabel && <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700">연결 문서: {docLabel}</p>}

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-bold">받으실 곳 (공급받는자)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>사업자등록번호 *<input name="bizNumber" className={input} inputMode="numeric" placeholder="000-00-00000" required /></label>
          <label className={label}>상호 *<input name="company" className={input} defaultValue={initial.company} required /></label>
          <label className={label}>대표자 *<input name="ceo" className={input} required /></label>
          <label className={label}>계산서 받을 이메일 *<input name="invoiceEmail" type="email" className={input} defaultValue={initial.invoiceEmail} required /></label>
          <label className={`${label} sm:col-span-2`}>사업장 주소<input name="address" className={input} /></label>
          <label className={label}>업태<input name="bizType" className={input} /></label>
          <label className={label}>종목<input name="bizItem" className={input} /></label>
          <label className={label}>담당자<input name="contactName" className={input} defaultValue={initial.contactName} /></label>
          <label className={label}>연락처<input name="contactPhone" className={input} inputMode="tel" /></label>
        </div>
        <label className={label}>
          사업자등록증 (선택)
          <input name="brnFile" type="file" accept="application/pdf,image/png,image/jpeg" className="mt-1.5 block w-full text-sm" />
          <span className="mt-1 block text-xs font-normal text-zinc-500">올려주시면 주소·업태 입력을 생략하셔도 됩니다. PDF·JPG·PNG, 10MB 이하.</span>
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-bold">발행 내용</h2>
        <label className={label}>품목 *<input name="itemName" className={input} defaultValue={initial.itemName} placeholder="예: 공연 출연료" required /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>공급가액 *<input className={input} inputMode="numeric" value={supply} onChange={(e) => setSupply(e.target.value)} required /></label>
          <label className={label}>
            부가세
            <input className={input} inputMode="numeric" value={vatTouched ? vat : String(vatValue)} onChange={(e) => { setVatTouched(true); setVat(e.target.value) }} />
          </label>
          <label className={label}>희망 작성일자<input name="writtenDate" type="date" className={input} /></label>
          <label className={label}>
            구분
            <select name="purpose" className={input} defaultValue="billing">
              <option value="billing">청구 (입금 전)</option>
              <option value="receipt">영수 (입금 완료)</option>
            </select>
          </label>
        </div>
        <p className="text-right text-base font-bold">합계 {won(total)}</p>
        <label className={label}>요청 메모<textarea name="memo" rows={3} className={input} placeholder="예: 9월분으로 발행 부탁드립니다." /></label>
      </section>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? '접수 중…' : '발행 요청 보내기'}
      </button>
    </form>
  )
}
