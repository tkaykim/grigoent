import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import { COMPANY } from '@/lib/company-paperwork'

// 세금계산서 발행 요청 → ① finance@ 메일(발행요청 양식) ② ERP 할일(상시 프로젝트 886, 담당 김민정).
// 실제 발행은 경영지원이 홈택스/Clobe 에서 한다. 여기서는 요청을 빠짐없이 모으는 것까지만.

export const ERP_TAX_PROJECT_ID = 886
const ERP_ASSIGNEE = { id: '4f586f7d-559c-4786-9466-91a5fa59b70a', name: '김민정' }

export interface TaxInvoiceRequestInput {
  bizNumber: string
  company: string
  ceo: string
  address?: string
  bizType?: string
  bizItem?: string
  invoiceEmail: string
  contactName?: string
  contactPhone?: string
  itemName: string
  supplyAmount: number
  vatAmount: number
  totalAmount: number
  writtenDate?: string
  purpose: 'billing' | 'receipt'
  memo?: string
}

// 사업자등록번호 체크섬(국세청 규칙).
export function isValidBizNumber(raw: string): boolean {
  const d = raw.replace(/\D/g, '')
  if (d.length !== 10) return false
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5]
  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * w[i]
  sum += Math.floor((Number(d[8]) * 5) / 10)
  return (10 - (sum % 10)) % 10 === Number(d[9])
}

export function formatBizNumber(raw: string): string {
  const d = raw.replace(/\D/g, '')
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
}

const str = (v: FormDataEntryValue | null, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const amount = (v: FormDataEntryValue | null) => Math.round(Number(String(v ?? '').replace(/,/g, '')))

export function parseTaxInvoiceForm(form: FormData): TaxInvoiceRequestInput {
  const bizNumber = str(form.get('bizNumber'), 20)
  if (!isValidBizNumber(bizNumber)) throw new Error('사업자등록번호를 확인해 주세요.')
  const company = str(form.get('company'), 100)
  const ceo = str(form.get('ceo'), 50)
  const invoiceEmail = str(form.get('invoiceEmail'), 200)
  const itemName = str(form.get('itemName'), 100)
  if (!company) throw new Error('상호를 입력해 주세요.')
  if (!ceo) throw new Error('대표자명을 입력해 주세요.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoiceEmail)) throw new Error('계산서 받을 이메일을 확인해 주세요.')
  if (!itemName) throw new Error('품목을 입력해 주세요.')
  const supplyAmount = amount(form.get('supplyAmount'))
  if (!Number.isFinite(supplyAmount) || supplyAmount <= 0 || supplyAmount > 10_000_000_000) throw new Error('공급가액을 확인해 주세요.')
  const vatRaw = amount(form.get('vatAmount'))
  const vatAmount = Number.isFinite(vatRaw) && vatRaw >= 0 ? vatRaw : Math.round(supplyAmount * 0.1)
  const writtenDate = str(form.get('writtenDate'), 10)
  return {
    bizNumber: formatBizNumber(bizNumber),
    company,
    ceo,
    address: str(form.get('address'), 200) || undefined,
    bizType: str(form.get('bizType'), 100) || undefined,
    bizItem: str(form.get('bizItem'), 100) || undefined,
    invoiceEmail,
    contactName: str(form.get('contactName'), 50) || undefined,
    contactPhone: str(form.get('contactPhone'), 30) || undefined,
    itemName,
    supplyAmount,
    vatAmount,
    totalAmount: supplyAmount + vatAmount,
    writtenDate: /^\d{4}-\d{2}-\d{2}$/.test(writtenDate) ? writtenDate : undefined,
    purpose: form.get('purpose') === 'receipt' ? 'receipt' : 'billing',
    memo: str(form.get('memo'), 1000) || undefined,
  }
}

const won = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`

// 메일·ERP 설명에 같이 쓰는 발행요청 양식. 한 항목 = 한 줄.
export function requestLines(r: TaxInvoiceRequestInput, ctx: { origin: string; docNo?: string | null; project?: string | null }): string[] {
  return [
    `[공급받는자]`,
    `사업자등록번호: ${r.bizNumber}`,
    `상호: ${r.company}`,
    `대표자: ${r.ceo}`,
    `주소: ${r.address ?? '-'}`,
    `업태/종목: ${r.bizType ?? '-'} / ${r.bizItem ?? '-'}`,
    `계산서 받을 이메일: ${r.invoiceEmail}`,
    `담당자: ${r.contactName ?? '-'} ${r.contactPhone ?? ''}`.trim(),
    ``,
    `[발행 내용]`,
    `품목: ${r.itemName}`,
    `공급가액: ${won(r.supplyAmount)}`,
    `부가세: ${won(r.vatAmount)}`,
    `합계: ${won(r.totalAmount)}`,
    `작성일자(희망): ${r.writtenDate ?? '접수일'}`,
    `영수/청구: ${r.purpose === 'receipt' ? '영수(입금 완료)' : '청구'}`,
    `요청 메모: ${r.memo ?? '-'}`,
    ``,
    `[출처]`,
    `요청 경로: ${ctx.origin}`,
    `연결 문서: ${ctx.docNo ?? '-'}`,
    `프로젝트: ${ctx.project ?? '-'}`,
  ]
}

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function mailFinance(opts: {
  input: TaxInvoiceRequestInput
  lines: string[]
  subjectOrigin: string
  attachment?: { filename: string; content: Buffer; contentType: string }
}) {
  const { input, lines, subjectOrigin, attachment } = opts
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  })
  const intro = [
    `세금계산서 발행 요청이 접수되었습니다.`,
    `아래 내용으로 발행한 뒤 ERP 할일(매출 세금계산서 발행 요청)을 완료로 바꿔 주세요.`,
  ]
  const html = `<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:14px;line-height:1.7;color:#111">
<p style="margin:0 0 16px">${intro.map(esc).join('<br>')}</p>
<p style="margin:0">${lines.map(esc).join('<br>')}</p>
</div>`
  await t.sendMail({
    from: `"그리고엔터 거래서류" <${process.env.SMTP_USER}>`,
    to: COMPANY.taxInvoiceEmail,
    replyTo: input.invoiceEmail,
    subject: `[세금계산서 발행 요청] ${input.company} · ${won(input.totalAmount)} · ${subjectOrigin}`,
    text: [...intro, '', ...lines].join('\n'),
    html,
    attachments: attachment ? [attachment] : [],
  })
}

export async function createErpTask(opts: { input: TaxInvoiceRequestInput; lines: string[]; subjectOrigin: string }): Promise<number | null> {
  const url = process.env.ERP_SUPABASE_URL
  const key = process.env.ERP_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[tax-invoice] ERP env missing')
    return null
  }
  const erp = createClient(url, key, { auth: { persistSession: false } })
  const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
  const { input, lines, subjectOrigin } = opts
  const { data, error } = await erp
    .from('project_tasks')
    .insert({
      project_id: ERP_TAX_PROJECT_ID,
      bu_code: 'HEAD',
      title: `[계산서 발행] ${input.company} ${won(input.totalAmount)} (${subjectOrigin})`,
      assignee_id: ERP_ASSIGNEE.id,
      assignee: ERP_ASSIGNEE.name,
      due_date: input.writtenDate && input.writtenDate > today ? input.writtenDate : today,
      status: 'todo',
      priority: 'high',
      tag: '세금계산서',
      description: lines.join('\n'),
    })
    .select('id')
    .single()
  if (error) {
    console.error('[tax-invoice] ERP task insert failed', error.message)
    return null
  }
  return data.id as number
}
