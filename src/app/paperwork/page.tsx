import { Download, ExternalLink, FileText, Landmark } from 'lucide-react'
import { CopyButton } from '@/components/paperwork/CopyButton'
import {
  BANK_ACCOUNTS,
  BUSINESS_REGISTRATION,
  COMPANY,
  companyInfoText,
  paperworkFileUrl,
  parsePaperworkParams,
} from '@/lib/company-paperwork'

export default async function PaperworkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { account, items, to, project, from } = parsePaperworkParams(await searchParams)
  const bank = BANK_ACCOUNTS[account]
  const show = (i: string) => items.includes(i as never)

  const infoRows: [string, string][] = [
    ['상호', COMPANY.name],
    ['대표자', COMPANY.ceo],
    ['사업자등록번호', COMPANY.businessNumber],
    ['사업장 주소', COMPANY.address],
    ['업태', COMPANY.businessType],
    ['종목', COMPANY.businessItem],
    ['입금 계좌', `${bank.bank} ${bank.number}`],
    ['예금주', bank.holder],
    ['세금계산서 담당', COMPANY.taxInvoiceEmail],
  ]

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">GRIGO Entertainment</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">거래 서류</h1>
        {(to || project) && (
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            {to && <span className="font-semibold text-zinc-900">{to}</span>}
            {to && ' 담당자님, '}
            {project ? <>「{project}」 진행에 필요한 서류입니다.</> : '요청하신 서류입니다.'}
          </p>
        )}
        {!to && !project && (
          <p className="mt-3 text-sm leading-6 text-zinc-600">(주)그리고엔터테인먼트의 사업자 서류와 정보입니다.</p>
        )}
      </header>

      <div className="space-y-3">
        {show('brn') && (
          <DocCard
            icon={<FileText className="h-5 w-5" />}
            title="사업자등록증"
            desc={`${COMPANY.name} · ${COMPANY.businessNumber}`}
            viewUrl={paperworkFileUrl(BUSINESS_REGISTRATION.file)}
            downloadUrl={paperworkFileUrl(BUSINESS_REGISTRATION.file, BUSINESS_REGISTRATION.downloadName)}
          />
        )}
        {show('bank') && (
          <DocCard
            icon={<Landmark className="h-5 w-5" />}
            title={`통장사본 (${bank.label})`}
            desc={`${bank.bank} ${bank.number} · 예금주 ${bank.holder}`}
            copyText={`${bank.bank} ${bank.number} (예금주 ${bank.holder})`}
            viewUrl={paperworkFileUrl(bank.file)}
            downloadUrl={paperworkFileUrl(bank.file, bank.downloadName)}
          />
        )}
      </div>

      {show('info') && (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-semibold">사업자 정보</h2>
            <CopyButton text={companyInfoText(account)} label="전체 복사" />
          </div>
          <dl className="divide-y divide-zinc-100">
            {infoRows.map(([label, value]) => (
              <div key={label} className="flex items-start gap-3 px-4 py-2.5 text-[13px] leading-6">
                <dt className="w-24 shrink-0 text-zinc-500 sm:w-28">{label}</dt>
                <dd className="min-w-0 flex-1 break-words text-zinc-900">{value}</dd>
                <CopyButton text={value} className="px-2 py-1" label="복사" compact />
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white px-4 py-4 text-[13px] leading-6 text-zinc-600">
        <p>세금계산서 발행이 필요하시면 아래에서 요청해 주세요.</p>
        <a
          href={`/paperwork/tax-invoice?${new URLSearchParams({ ...(project ? { project } : {}), ...(to ? { to } : {}) }).toString()}`}
          className="mt-2 inline-flex rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          세금계산서 발행 요청
        </a>
        <p className="mt-2">메일로 보내셔도 됩니다: {COMPANY.taxInvoiceEmail}</p>
        {from && <p className="mt-1">담당: {from}</p>}
        <p className="mt-1">문의: {COMPANY.phone}</p>
      </section>

      <footer className="mt-8 text-center text-xs leading-6 text-zinc-400">
        {COMPANY.name} · 대표자 {COMPANY.ceo} · 사업자등록번호 {COMPANY.businessNumber}
      </footer>
    </main>
  )
}

function DocCard({
  icon,
  title,
  desc,
  viewUrl,
  downloadUrl,
  copyText,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  viewUrl: string
  downloadUrl: string
  copyText?: string
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 break-words text-[13px] text-zinc-500">{desc}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={downloadUrl}
          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          <Download className="h-4 w-4" /> 다운로드
        </a>
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          <ExternalLink className="h-4 w-4" /> 보기
        </a>
        {copyText && <CopyButton text={copyText} label="계좌번호 복사" className="px-3 py-2 text-sm" />}
      </div>
    </div>
  )
}
