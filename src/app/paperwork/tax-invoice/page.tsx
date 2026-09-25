import { findByToken } from '@/lib/paperwork-docs'
import { TaxInvoiceForm } from '@/components/paperwork/TaxInvoiceForm'

export const dynamic = 'force-dynamic'

// 세금계산서 발행 요청. ?doc=<문서 링크 토큰> 이면 견적서·거래명세서 금액을 미리 채운다.
export default async function TaxInvoiceRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
  const token = one(sp.doc)
  const doc = token ? await findByToken(token) : null
  const usable = doc && doc.status !== 'void' ? doc : null

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">GRIGO Entertainment</p>
      <h1 className="mt-2 text-2xl font-bold">세금계산서 발행 요청</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        귀사 사업자 정보와 발행 금액을 알려주시면 (주)그리고엔터테인먼트 경영지원실이 확인 후 발행합니다.
        <br />
        발행된 계산서는 입력하신 이메일로 받으실 수 있습니다.
      </p>
      <TaxInvoiceForm
        docToken={usable ? token : ''}
        docLabel={usable ? `${usable.doc_no} · ${usable.client_company}` : ''}
        initial={{
          company: usable?.client_company ?? one(sp.to),
          contactName: usable?.client_contact ?? '',
          invoiceEmail: usable?.client_email ?? '',
          itemName: usable?.project_title ?? one(sp.project),
          supplyAmount: usable ? String(usable.supply_amount) : '',
          vatAmount: usable ? String(usable.vat_amount) : '',
          project: usable?.project_title ?? one(sp.project),
        }}
      />
    </main>
  )
}
