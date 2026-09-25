import { notFound } from 'next/navigation'
import { Download, ExternalLink, FileText, Landmark } from 'lucide-react'
import { CopyButton } from '@/components/paperwork/CopyButton'
import { BANK_ACCOUNTS, BUSINESS_REGISTRATION, COMPANY, companyInfoText, paperworkFileUrl } from '@/lib/company-paperwork'
import { DOC_TYPE_LABELS, findByToken, lineAmount, serviceClient } from '@/lib/paperwork-docs'

export const dynamic = 'force-dynamic'

const won = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`
const kdate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return `${y}년 ${m}월 ${day}일`
}

// 거래처가 받는 문서 화면: 견적서·거래명세서 요약 + PDF + 사업자등록증·통장사본.
export default async function PaperworkDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const row = await findByToken(token)
  if (!row || row.status === 'void') notFound()

  const label = DOC_TYPE_LABELS[row.doc_type]
  const bank = BANK_ACCOUNTS[row.account]
  const pdfUrl = `/api/paperwork/d/${token}/pdf`
  const { data: lastRequest } = await serviceClient()
    .from('tax_invoice_requests')
    .select('created_at, status')
    .eq('document_group_id', row.group_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">GRIGO Entertainment</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{label}</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        <span className="font-semibold text-zinc-900">{row.client_company}</span>
        {row.client_contact ? ` ${row.client_contact}님` : ' 담당자님'}, {row.project_title ? `「${row.project_title}」 ` : ''}{label}입니다.
      </p>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{row.doc_no}{row.version > 1 ? ` · 수정 ${row.version}차` : ''}</p>
            <p className="text-xs text-zinc-500">
              {row.doc_type === 'quote' ? '견적일' : '거래일'} {kdate(row.issued_date)}
              {row.doc_type === 'quote' && row.valid_until ? ` · 유효기간 ${kdate(row.valid_until)}까지` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <a href={`${pdfUrl}?download=1`} className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
              <Download className="h-4 w-4" /> PDF 다운로드
            </a>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
              <ExternalLink className="h-4 w-4" /> 보기
            </a>
          </div>
        </div>
        <ul className="divide-y divide-zinc-100">
          {row.items.map((it, i) => (
            <li key={i} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{it.name}</p>
                <p className="text-xs text-zinc-500">{it.spec ? `${it.spec} · ` : ''}{it.qty.toLocaleString('ko-KR')} × {won(it.unitPrice)}</p>
              </div>
              <p className="shrink-0 font-medium">{won(lineAmount(it))}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-zinc-200 px-4 py-3 text-sm">
          <div className="flex justify-between"><dt className="text-zinc-500">공급가액</dt><dd>{won(row.supply_amount)}</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-500">부가세</dt><dd>{won(row.vat_amount)}</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>합계</dt><dd>{won(row.total_amount)}</dd></div>
        </dl>
        {row.notes && <p className="whitespace-pre-wrap border-t border-zinc-200 px-4 py-3 text-[13px] leading-6 text-zinc-600">{row.notes}</p>}
      </section>

      <h2 className="mt-8 text-sm font-semibold text-zinc-700">사업자 서류</h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <a href={paperworkFileUrl(BUSINESS_REGISTRATION.file, BUSINESS_REGISTRATION.downloadName)} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm hover:bg-zinc-50">
          <FileText className="h-5 w-5 text-zinc-600" />
          <span className="flex-1 font-medium">사업자등록증</span>
          <Download className="h-4 w-4 text-zinc-400" />
        </a>
        <a href={paperworkFileUrl(bank.file, bank.downloadName)} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm hover:bg-zinc-50">
          <Landmark className="h-5 w-5 text-zinc-600" />
          <span className="flex-1 font-medium">통장사본</span>
          <Download className="h-4 w-4 text-zinc-400" />
        </a>
      </div>

      <section className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[13px] leading-6 text-zinc-600">
        <div className="flex items-start justify-between gap-3">
          <p>
            입금 계좌 <span className="font-semibold text-zinc-900">{bank.bank} {bank.number}</span>
            <br />
            예금주 {bank.holder}
          </p>
          <CopyButton text={`${bank.bank} ${bank.number} (예금주 ${bank.holder})`} label="계좌 복사" />
        </div>
        <div className="mt-2 flex items-start justify-between gap-3 border-t border-zinc-100 pt-2">
          <p>사업자등록번호 {COMPANY.businessNumber} · 대표자 {COMPANY.ceo}</p>
          <CopyButton text={companyInfoText(row.account)} label="사업자 정보 복사" />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-900 bg-white p-4">
        <p className="text-sm font-semibold">세금계산서가 필요하신가요?</p>
        {lastRequest ? (
          <p className="mt-1 text-[13px] leading-6 text-zinc-600">
            {new Date(lastRequest.created_at).toLocaleDateString('ko-KR')}에 발행 요청이 접수되었습니다.
            {lastRequest.status === 'issued' ? ' 발행이 완료되었습니다.' : ' 경영지원실이 확인 후 발행합니다.'}
          </p>
        ) : (
          <p className="mt-1 text-[13px] leading-6 text-zinc-600">사업자 정보를 입력하시면 이 금액으로 발행 요청이 접수됩니다.</p>
        )}
        <a href={`/paperwork/tax-invoice?doc=${token}`} className="mt-3 inline-flex rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
          세금계산서 발행 요청{lastRequest ? ' (다시)' : ''}
        </a>
      </section>

      <p className="mt-6 text-[13px] leading-6 text-zinc-600">
        담당 {row.author_name}{row.author_email ? ` · ${row.author_email}` : ''}
        <br />
        계산서 문의 {COMPANY.taxInvoiceEmail}
      </p>

      <footer className="mt-8 text-center text-xs leading-6 text-zinc-400">
        {COMPANY.name} · 대표자 {COMPANY.ceo} · 사업자등록번호 {COMPANY.businessNumber}
      </footer>
    </main>
  )
}
