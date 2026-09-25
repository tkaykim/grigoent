import { NextRequest, NextResponse } from 'next/server'
import {
  canAccessRow,
  getActor,
  latestInGroup,
  parseDocInput,
  publicDocUrl,
  rowFromInput,
  serviceClient,
  siteOrigin,
  type PaperworkDocRow,
} from '@/lib/paperwork-docs'
import { deliverDocument, groupToken } from '@/lib/paperwork-deliver'

async function load(id: string): Promise<PaperworkDocRow | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const { data } = await serviceClient().from('paperwork_documents').select('*').eq('id', id).maybeSingle()
  return (data as PaperworkDocRow | null) ?? null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor(req)
  if (!actor) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  const row = await load((await params).id)
  if (!row || !canAccessRow(actor, row)) return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 })
  const { data: versions } = await serviceClient()
    .from('paperwork_documents')
    .select('id, version, doc_no, status, total_amount, author_name, edited_by, edit_note, sent_at, sent_to, created_at')
    .eq('group_id', row.group_id)
    .order('version', { ascending: false })
  const token = await groupToken(row)
  return NextResponse.json({ document: row, versions, url: token ? publicDocUrl(siteOrigin(req), token) : null })
}

// 수정 = 새 버전 발행(이전 버전은 superseded). 금액이 바뀐 이력이 남는다.
// body.status === 'void' 이면 내용 변경 없이 폐기만 한다(관리자 전용).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor(req)
  if (!actor) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  const row = await load((await params).id)
  if (!row || !canAccessRow(actor, row)) return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 })
  const latest = await latestInGroup(row.group_id)
  if (!latest || latest.id !== row.id) return NextResponse.json({ error: '최신 버전에서만 수정할 수 있습니다.' }, { status: 409 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const editor = actor.kind === 'admin' ? `경영지원(${String(body.editorName || '관리자').slice(0, 30)})` : actor.author.name
  const db = serviceClient()

  if (body.status === 'void') {
    if (actor.kind !== 'admin') return NextResponse.json({ error: '폐기는 경영지원만 할 수 있습니다.' }, { status: 403 })
    const { data } = await db
      .from('paperwork_documents')
      .update({ status: 'void', edited_by: editor, edit_note: String(body.editNote || '폐기').slice(0, 300) })
      .eq('id', row.id)
      .select('*')
      .single()
    return NextResponse.json({ document: data })
  }

  let input
  try {
    input = parseDocInput(body)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
  if (input.docType !== row.doc_type) return NextResponse.json({ error: '문서 종류는 바꿀 수 없습니다. 새로 만들어 주세요.' }, { status: 400 })

  const baseNo = row.doc_no.replace(/-v\d+$/, '')
  const version = row.version + 1
  const { data: created, error } = await db
    .from('paperwork_documents')
    .insert({
      group_id: row.group_id,
      version,
      doc_no: `${baseNo}-v${version}`,
      source_app: row.source_app,
      source_ref: row.source_ref,
      author_name: row.author_name,
      author_email: row.author_email,
      author_ref: row.author_ref,
      edited_by: editor,
      edit_note: typeof body.editNote === 'string' ? body.editNote.slice(0, 300) : null,
      ...rowFromInput(input),
    })
    .select('*')
    .single()
  if (error || !created) return NextResponse.json({ error: error?.message || '저장 실패' }, { status: 500 })
  await db.from('paperwork_documents').update({ status: 'superseded' }).eq('id', row.id)

  let doc = created as PaperworkDocRow
  const token = await groupToken(doc)
  const url = token ? publicDocUrl(siteOrigin(req), token) : null
  if (body.send === true && url) {
    const sent = await deliverDocument(doc, url, input.clientEmail)
    if (!sent.ok) return NextResponse.json({ document: doc, url, sendError: sent.error }, { status: 207 })
    doc = sent.row
  }
  return NextResponse.json({ document: doc, url })
}
