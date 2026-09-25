import { NextRequest, NextResponse } from 'next/server'
import {
  getActor,
  newViewToken,
  nextDocNo,
  parseDocInput,
  publicDocUrl,
  rowFromInput,
  serviceClient,
  siteOrigin,
  type PaperworkDocRow,
} from '@/lib/paperwork-docs'
import { deliverDocument } from '@/lib/paperwork-deliver'

// 목록: 관리자=전체 최신 버전, 담당자=본인 문서.
export async function GET(req: NextRequest) {
  const actor = await getActor(req)
  if (!actor) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  let q = serviceClient()
    .from('paperwork_documents')
    .select('*')
    .neq('status', 'superseded')
    .order('created_at', { ascending: false })
    .limit(300)
  if (actor.kind === 'author') q = q.eq('source_app', actor.author.app).eq('author_ref', actor.author.uid)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []) as PaperworkDocRow[]
  // 새 버전 행에는 토큰이 없으므로 그룹 1차 문서의 토큰으로 거래처 링크를 만든다.
  const groupIds = [...new Set(rows.filter((r) => !r.view_token).map((r) => r.group_id))]
  const tokens = new Map(rows.filter((r) => r.view_token).map((r) => [r.group_id, r.view_token as string]))
  for (let i = 0; i < groupIds.length; i += 50) {
    // .in() 에 id 수백 개를 넣으면 URL 길이 초과 → 50개씩 나눈다
    const { data: firsts } = await serviceClient().from('paperwork_documents').select('id, view_token').in('id', groupIds.slice(i, i + 50))
    for (const f of firsts ?? []) if (f.view_token) tokens.set(f.id as string, f.view_token as string)
  }
  const origin = siteOrigin(req)
  return NextResponse.json({
    documents: rows.map((r) => {
      const t = tokens.get(r.group_id)
      return { ...r, url: t ? publicDocUrl(origin, t) : null }
    }),
  })
}

// 생성(+선택적으로 즉시 메일 발송). 담당자는 바로 발행하고 경영지원·대표는 사후 확인·수정한다.
export async function POST(req: NextRequest) {
  const actor = await getActor(req)
  if (!actor) return NextResponse.json({ error: '앱에서 「거래 서류 보내기」로 다시 들어와 주세요.' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  let input
  try {
    input = parseDocInput(body)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  const author =
    actor.kind === 'author'
      ? {
          source_app: actor.author.app,
          source_ref: actor.author.projectRef ?? null,
          author_name: actor.author.name,
          author_email: actor.author.email ?? null,
          author_ref: actor.author.uid,
        }
      : {
          source_app: 'hq',
          source_ref: null,
          author_name: String(body.authorName || '경영지원').slice(0, 40),
          author_email: 'finance@grigoent.co.kr',
          author_ref: actor.userId,
        }

  const db = serviceClient()
  let row: PaperworkDocRow | null = null
  for (let attempt = 0; attempt < 3 && !row; attempt++) {
    const id = crypto.randomUUID()
    const { data, error } = await db
      .from('paperwork_documents')
      .insert({
        id,
        group_id: id,
        version: 1,
        doc_no: await nextDocNo(input.docType, input.issuedDate),
        view_token: newViewToken(),
        ...author,
        ...rowFromInput(input),
      })
      .select('*')
      .single()
    if (!error) row = data as PaperworkDocRow
    else if (error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!row) return NextResponse.json({ error: '문서번호를 만들지 못했습니다. 다시 시도해 주세요.' }, { status: 500 })

  const url = publicDocUrl(siteOrigin(req), row.view_token!)
  if (body.send === true) {
    const sent = await deliverDocument(row, url, input.clientEmail)
    if (!sent.ok) return NextResponse.json({ document: row, url, sendError: sent.error }, { status: 207 })
    row = sent.row
  }
  return NextResponse.json({ document: row, url })
}
