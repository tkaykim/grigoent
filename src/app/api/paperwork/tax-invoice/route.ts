import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { findByToken, getAuthorFromCookie, serviceClient } from '@/lib/paperwork-docs'
import { APP_LABELS } from '@/lib/paperwork-handoff'
import { createErpTask, mailFinance, parseTaxInvoiceForm, requestLines } from '@/lib/tax-invoice-request'

const MAX_FILE = 10 * 1024 * 1024
const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg']

// 세금계산서 발행 요청 접수. 거래처(문서 링크·공개 페이지)나 담당자가 보낸다.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  // 스팸 봇용 숨은 칸. 사람은 비워 둔다.
  if (String(form.get('website') ?? '')) return NextResponse.json({ ok: true })

  const db = serviceClient()
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const ipHash = crypto.createHash('sha256').update(`${ip}:${process.env.PAPERWORK_HANDOFF_SECRET ?? ''}`).digest('hex').slice(0, 32)
  const since = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await db.from('tax_invoice_requests').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since)
  if ((count ?? 0) >= 5) return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도하거나 finance@grigoent.co.kr로 메일 주세요.' }, { status: 429 })

  let input
  try {
    input = parseTaxInvoiceForm(form)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  const docToken = String(form.get('doc') ?? '')
  const doc = docToken ? await findByToken(docToken) : null
  const author = await getAuthorFromCookie()
  const origin = author ? `${APP_LABELS[author.app]} ${author.name}` : doc ? `거래처(${doc.doc_no} 링크)` : '거래처(공개 페이지)'
  const project = doc?.project_title ?? (String(form.get('project') ?? '').slice(0, 120) || null)

  let brnPath: string | null = null
  let attachment: { filename: string; content: Buffer; contentType: string } | undefined
  const file = form.get('brnFile')
  if (file && typeof file !== 'string' && file.size > 0) {
    if (file.size > MAX_FILE || !ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: '사업자등록증은 10MB 이하 PDF·JPG·PNG만 올릴 수 있습니다.' }, { status: 400 })
    }
    const content = Buffer.from(await file.arrayBuffer())
    const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg'
    brnPath = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`
    const { error } = await db.storage.from('tax-invoice-requests').upload(brnPath, content, { contentType: file.type })
    if (error) return NextResponse.json({ error: '파일을 올리지 못했습니다. 다시 시도해 주세요.' }, { status: 500 })
    attachment = { filename: `${input.company}_사업자등록증.${ext}`, content, contentType: file.type }
  }

  const { data: row, error } = await db
    .from('tax_invoice_requests')
    .insert({
      document_id: doc?.id ?? null,
      document_group_id: doc?.group_id ?? null,
      source: author ? 'author' : 'client',
      source_app: author?.app ?? doc?.source_app ?? null,
      requested_by: author?.name ?? input.contactName ?? null,
      biz_number: input.bizNumber,
      company: input.company,
      ceo: input.ceo,
      address: input.address ?? null,
      biz_type: input.bizType ?? null,
      biz_item: input.bizItem ?? null,
      invoice_email: input.invoiceEmail,
      contact_name: input.contactName ?? null,
      contact_phone: input.contactPhone ?? null,
      item_name: input.itemName,
      supply_amount: input.supplyAmount,
      vat_amount: input.vatAmount,
      total_amount: input.totalAmount,
      written_date: input.writtenDate ?? null,
      purpose: input.purpose,
      memo: input.memo ?? null,
      brn_file_path: brnPath,
      ip_hash: ipHash,
    })
    .select('id')
    .single()
  if (error || !row) return NextResponse.json({ error: '접수하지 못했습니다. finance@grigoent.co.kr로 메일 주세요.' }, { status: 500 })

  const lines = requestLines(input, { origin, docNo: doc?.doc_no, project })
  lines.push(`요청 ID: ${row.id}`)
  const [mail, taskId] = await Promise.all([
    mailFinance({ input, lines, subjectOrigin: origin, attachment }).then(() => true).catch((e) => {
      console.error('[tax-invoice] mail failed', e)
      return false
    }),
    createErpTask({ input, lines, subjectOrigin: origin }),
  ])
  await db
    .from('tax_invoice_requests')
    .update({ mail_sent_at: mail ? new Date().toISOString() : null, erp_task_id: taskId })
    .eq('id', row.id)

  if (!mail && !taskId) {
    return NextResponse.json({ error: '접수는 되었지만 담당자에게 전달하지 못했습니다. finance@grigoent.co.kr로 한 번 더 알려주세요.' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
