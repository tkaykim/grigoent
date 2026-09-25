import { serviceClient, type PaperworkDocRow } from '@/lib/paperwork-docs'
import { generatePaperworkPdf } from '@/lib/paperwork-pdf'
import { sendPaperworkEmail } from '@/lib/paperwork-email'

// 새 버전에는 view_token 이 없다. 거래처가 받은 링크는 항상 1차 문서의 토큰이며 최신 버전을 보여준다.
export async function groupToken(row: PaperworkDocRow): Promise<string | null> {
  if (row.view_token) return row.view_token
  const { data } = await serviceClient().from('paperwork_documents').select('view_token').eq('id', row.group_id).maybeSingle()
  return (data?.view_token as string | undefined) ?? null
}

export async function deliverDocument(
  row: PaperworkDocRow,
  viewUrl: string,
  to?: string | null,
): Promise<{ ok: true; row: PaperworkDocRow } | { ok: false; error: string }> {
  const recipient = (to || row.client_email || '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return { ok: false, error: '받는 분 이메일이 없습니다.' }
  try {
    const pdf = await generatePaperworkPdf(row)
    await sendPaperworkEmail({ row, pdf, to: recipient, viewUrl })
  } catch (e) {
    console.error('[paperwork] send failed', row.doc_no, e)
    return { ok: false, error: `메일 발송 실패: ${(e as Error).message}` }
  }
  const { data } = await serviceClient()
    .from('paperwork_documents')
    .update({ sent_at: new Date().toISOString(), sent_to: recipient })
    .eq('id', row.id)
    .select('*')
    .single()
  return { ok: true, row: (data as PaperworkDocRow) ?? row }
}
